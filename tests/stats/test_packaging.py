"""Verify deterministic release archives and their extracted runtime behavior."""
from hashlib import sha256
import json
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile

from fakes import DUMMY_ENV

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_SCRIPT = ROOT / "scripts/package_release_artifacts.py"
RELEASE_DIR = Path(os.environ.get("RELEASE_ARTIFACT_DIR", ROOT / "release-artifacts"))
EXPECTED = {
    "contact-lambda.zip": ["lambda_function.py"],
    "stats-aggregator.zip": ["lambda_function.py", "ledger.py", "payload.py"],
}


class PackagingTests(unittest.TestCase):
    def archive(self, name):
        archive = RELEASE_DIR / name
        self.assertTrue(archive.is_file(), f"Run the checked packager first: missing {archive}")
        return archive

    def check_members(self, archive, expected):
        with zipfile.ZipFile(archive) as package:
            self.assertEqual(sorted(package.namelist()), expected)
            for info in package.infolist():
                self.assertEqual(info.date_time, (1980, 1, 1, 0, 0, 0))
                self.assertEqual(info.external_attr >> 16, 0o100444)

    def check_stats_import(self, archive):
        with tempfile.TemporaryDirectory() as extracted, zipfile.ZipFile(archive) as package:
            package.extractall(extracted)
            script = ('import sys; from unittest.mock import patch; sys.path.insert(0, sys.argv[1]); '
                      '\nwith patch("boto3.client", return_value=object()):\n import lambda_function\n'
                      ' assert callable(lambda_function.lambda_handler)\n')
            subprocess.run([sys.executable, '-I', '-c', script, extracted], check=True,
                           env={**DUMMY_ENV, 'PATH': os.environ.get('PATH', '')}, capture_output=True)

    def test_packager_produces_deterministic_bounded_archives_and_manifest(self):
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            for output in (first, second):
                subprocess.run([sys.executable, str(PACKAGE_SCRIPT), 'build', '--output-dir', output],
                               cwd=ROOT, check=True, capture_output=True, text=True)
                subprocess.run([sys.executable, str(PACKAGE_SCRIPT), 'verify', '--output-dir', output],
                               cwd=ROOT, check=True, capture_output=True, text=True)
            for name, members in EXPECTED.items():
                first_bytes = (Path(first) / name).read_bytes()
                self.assertEqual(first_bytes, (Path(second) / name).read_bytes())
                self.check_members(Path(first) / name, members)
            first_manifest = json.loads((Path(first) / 'manifest.json').read_text())
            self.assertEqual(first_manifest, json.loads((Path(second) / 'manifest.json').read_text()))
            self.assertEqual(first_manifest['version'], 1)
            self.assertEqual(set(first_manifest['archives']), set(EXPECTED))
            for name, members in EXPECTED.items():
                record = first_manifest['archives'][name]
                self.assertEqual(record['members'], members)
                self.assertEqual(record['sha256'], sha256((Path(first) / name).read_bytes()).hexdigest())

    def test_checked_archives_have_exact_members_and_importable_handlers(self):
        contact = self.archive('contact-lambda.zip')
        stats = self.archive('stats-aggregator.zip')
        self.check_members(contact, EXPECTED['contact-lambda.zip'])
        self.check_members(stats, EXPECTED['stats-aggregator.zip'])
        self.check_stats_import(stats)
        with tempfile.TemporaryDirectory() as extracted, zipfile.ZipFile(contact) as package:
            package.extractall(extracted)
            script = ('import sys; from unittest.mock import patch; sys.path.insert(0, sys.argv[1]); '
                      '\nwith patch("boto3.client", return_value=object()):\n import lambda_function\n'
                      ' assert callable(lambda_function.lambda_handler)\n')
            subprocess.run([sys.executable, '-I', '-c', script, extracted], check=True,
                           env={**DUMMY_ENV, 'SNS_TOPIC_ARN': 'synthetic', 'PATH': os.environ.get('PATH', '')},
                           capture_output=True)

    def test_terraform_preserves_bootstrap_filenames_without_archive_generators(self):
        contact = (ROOT / 'terraform/contactLambda.tf').read_text()
        stats = (ROOT / 'terraform/statsLambda.tf').read_text()
        self.assertIn('filename = "lambda_function.zip"', contact)
        self.assertIn('filename = "stats_aggregator.zip"', stats)
        self.assertNotIn('data "archive_file"', contact + stats)

    def test_workflow_reuses_checked_archives_without_repackaging(self):
        workflow = (ROOT / '.github/workflows/main.yml').read_text()
        checks = (ROOT / '.github/workflows/checks.yml').read_text()
        self.assertIn('release-artifacts/contact-lambda.zip', workflow)
        self.assertIn('release-artifacts/stats-aggregator.zip', workflow)
        self.assertIn('cp release-artifacts/contact-lambda.zip terraform/lambda_function.zip', workflow)
        self.assertIn('cp release-artifacts/stats-aggregator.zip terraform/stats_aggregator.zip', workflow)
        self.assertNotIn('zip ../terraform/', workflow)
        self.assertNotIn('zip ../lambda_code.zip', workflow)
        self.assertNotIn('terraform refresh', workflow)
        self.assertNotIn('name: plan', workflow)
        self.assertIn('uses: ./.github/workflows/checks.yml', workflow)
        self.assertEqual(workflow.count('yarn build'), 0)
        self.assertEqual(checks.count('yarn build'), 1)
        self.assertIn('git status --porcelain --untracked-files=no', checks)
        self.assertIn('permissions:\n  contents: read', checks)

    def test_payload_import_does_not_load_the_sdk(self):
        script = ('import sys; sys.path.insert(0, sys.argv[1]); '
                  'from stats_aggregator.payload import render_payload; '
                  'assert "boto3" not in sys.modules and "botocore" not in sys.modules')
        subprocess.run([sys.executable, '-I', '-c', script, str(ROOT)], check=True,
                       env={**DUMMY_ENV, 'PATH': os.environ.get('PATH', '')}, capture_output=True)

    def test_extracted_checked_archive_runs_all_recovery_tests(self):
        archive = self.archive('stats-aggregator.zip')
        with tempfile.TemporaryDirectory() as directory, zipfile.ZipFile(archive) as package:
            package.extractall(directory)
            script = ('import sys, unittest; sys.path[:0] = [sys.argv[1], sys.argv[2]]; '
                      'suite = unittest.defaultTestLoader.loadTestsFromNames('
                      '["test_ledger", "test_ingestion", "test_source_failures"]); '
                      'result = unittest.TextTestRunner(verbosity=1).run(suite); '
                      'sys.exit(not result.wasSuccessful())')
            result = subprocess.run([sys.executable, '-I', '-c', script, directory, str(ROOT / 'tests/stats')],
                env={**DUMMY_ENV, 'STATS_HANDLER_MODULE': 'lambda_function', 'PATH': os.environ.get('PATH', '')},
                capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            print('Extracted checked archive recovery matrix: ' + result.stderr.strip())
