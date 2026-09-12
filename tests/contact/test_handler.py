"""Exercise loose source and the checked contact ZIP with isolated SNS clients."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[2]
RELEASE = Path(os.environ.get('RELEASE_ARTIFACT_DIR', ROOT / 'release-artifacts'))
ORIGINS = ('https://andrewmalvani.com', 'https://www.andrewmalvani.com')
DRAFT = {'name': 'Synthetic Visitor', 'email': 'visitor@example.com', 'message': 'Synthetic contact test'}
ENV = {'AWS_ACCESS_KEY_ID': 'testing', 'AWS_SECRET_ACCESS_KEY': 'testing',
       'AWS_DEFAULT_REGION': 'us-west-1', 'AWS_EC2_METADATA_DISABLED': 'true',
       'AWS_CONFIG_FILE': '/dev/null', 'AWS_SHARED_CREDENTIALS_FILE': '/dev/null',
       'SNS_TOPIC_ARN': 'arn:aws:sns:us-west-1:870140981796:synthetic',
       'ALLOWED_ORIGINS': json.dumps(ORIGINS)}


class FakeSNS:
    def __init__(self):
        self.messages = []
        self.fail = False

    def publish(self, **message):
        if self.fail:
            raise RuntimeError('Synthetic private backend detail')
        self.messages.append(message)
        return {'MessageId': 'synthetic'}


class ContactContract:
    def setUp(self):
        self.sns = FakeSNS()
        self.env = patch.dict(os.environ, ENV, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        self.clients = patch.dict('sys.modules', {'boto3': types.SimpleNamespace(client=lambda service: self.sns)})
        self.clients.start()
        self.addCleanup(self.clients.stop)
        spec = importlib.util.spec_from_file_location('isolated_contact_handler', self.source())
        self.handler = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.handler)

    def invoke(self, origin=ORIGINS[0], body=DRAFT, method='POST', header='Origin'):
        event = {'httpMethod': method, 'headers': {} if origin is None else {header: origin},
                 'body': json.dumps(body)}
        output = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            response = self.handler.lambda_handler(event, None)
        self.assertEqual(output.getvalue(), '', 'Contact data/errors must never be logged')
        self.assertEqual(response['headers']['Vary'], 'Origin')
        return response

    def test_both_exact_origins_can_read_success_and_clean_errors(self):
        for origin in ORIGINS:
            with self.subTest(origin=origin):
                self.sns.fail = False
                response = self.invoke(origin)
                self.assertEqual(response['statusCode'], 200)
                self.assertEqual(response['headers']['Access-Control-Allow-Origin'], origin)
                prior = len(self.sns.messages)
                response = self.invoke(origin, {'name': '', 'email': 'bad', 'message': ''})
                self.assertEqual(response['statusCode'], 400)
                self.assertEqual(response['headers']['Access-Control-Allow-Origin'], origin)
                self.assertEqual(len(self.sns.messages), prior)
                self.sns.fail = True
                response = self.invoke(origin)
                self.assertEqual(response['statusCode'], 502)
                self.assertEqual(response['headers']['Access-Control-Allow-Origin'], origin)
                self.assertNotIn('private backend', response['body'])

    def test_preflight_never_parses_body_or_publishes(self):
        for origin in ORIGINS:
            response = self.invoke(origin, None, 'OPTIONS', 'origin')
            self.assertEqual(response['statusCode'], 200)
            self.assertEqual(response['headers']['Access-Control-Allow-Origin'], origin)
            self.assertEqual(response['headers']['Access-Control-Allow-Methods'], 'OPTIONS,POST')
            self.assertEqual(response['headers']['Access-Control-Allow-Headers'], 'Content-Type')
        self.assertEqual(self.sns.messages, [])

    def test_unknown_and_lookalike_origins_have_no_browser_permission(self):
        for origin in ('https://andrewmalvani.com.evil.example', 'https://x.andrewmalvani.com',
                       'http://andrewmalvani.com', 'https://www.andrewmalvani.com/',
                       'http://localhost:3000', 'null', '*', ''):
            for method in ('OPTIONS', 'POST'):
                response = self.invoke(origin, method=method)
                self.assertEqual(response['statusCode'], 403)
                self.assertNotIn('Access-Control-Allow-Origin', response['headers'])
        self.assertEqual(self.sns.messages, [])

    def test_missing_origin_retains_non_browser_success_without_cors_grant(self):
        response = self.invoke(None)
        self.assertEqual(response['statusCode'], 200)
        self.assertNotIn('Access-Control-Allow-Origin', response['headers'])
        self.assertEqual(len(self.sns.messages), 1)

    def test_header_case_does_not_change_origin_selection(self):
        response = self.invoke(ORIGINS[1], header='oRiGiN')
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], ORIGINS[1])

    def test_invalid_json_types_and_empty_fields_never_publish(self):
        for body in (None, [], {}, {'name': 2, 'email': 'a@b.com', 'message': 'x'},
                     {**DRAFT, 'email': 'invalid'}, {**DRAFT, 'message': '   '}):
            self.assertEqual(self.invoke(body=body)['statusCode'], 400)
        response = self.handler.lambda_handler({'headers': {'Origin': ORIGINS[1]}, 'body': '{'}, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'], ORIGINS[1])
        self.assertEqual(response['headers']['Vary'], 'Origin')
        self.assertEqual(self.sns.messages, [])

    def test_limits_sanitization_and_sns_destination_are_preserved(self):
        email = 'a' * 248 + '@b.com'
        response = self.invoke(body={'name': 'n' * 100, 'email': email, 'message': 'm' * 2000})
        self.assertEqual(response['statusCode'], 200)
        message = self.sns.messages[-1]
        self.assertEqual(message['TopicArn'], ENV['SNS_TOPIC_ARN'])
        self.assertIn('Name: ' + 'n' * 100 + '\n', message['Message'])
        self.assertIn('Email: ' + email + '\n', message['Message'])
        self.assertIn('Message: ' + 'm' * 2000 + '\n', message['Message'])
        self.invoke(body={**DRAFT, 'name': ' n\x00\r\nFrom: forged ', 'message': 'm' * 2001})
        self.assertIn('Name: n From: forged\n', self.sns.messages[-1]['Message'])
        self.assertNotIn('m' * 2001, self.sns.messages[-1]['Message'])
        self.invoke(body={'name': 'n' * 101, 'email': 'a' * 249 + '@b.com', 'message': 'm' * 2001})
        truncated = self.sns.messages[-1]['Message']
        self.assertIn('Name: ' + 'n' * 100 + '\n', truncated)
        self.assertIn('Email: ' + 'a' * 249 + '@b.co\n', truncated)
        self.assertIn('Message: ' + 'm' * 2000 + '\n', truncated)


class SourceContactTests(ContactContract, unittest.TestCase):
    def source(self):
        return ROOT / 'sns_publish_lambda/lambda_function.py'


class CheckedArchiveContactTests(ContactContract, unittest.TestCase):
    def source(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        with zipfile.ZipFile(RELEASE / 'contact-lambda.zip') as package:
            self.assertEqual(package.namelist(), ['lambda_function.py'])
            package.extractall(directory.name)
        return Path(directory.name) / 'lambda_function.py'
