"""Evaluate real Terraform with native AWS mocks; mutate config to test deployment triggers.

Copies only source configuration, lock and checked archives to a temporary root.
No tfvars, state, backend initialization or AWS clients are used. Terraform >=1.7.
TF_CLI_CONFIG_FILE may select a local provider mirror for fully offline runs.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
NATIVE_TEST = (ROOT / 'tests/infra/contact-api.tftest.hcl').read_text()
MOCK_ONLY = NATIVE_TEST.split('run "contact_configuration"')[0] + '''
run "fingerprint" {
  command = apply
  plan_options { target = [aws_api_gateway_stage.api] }
}
'''


class ContactInfrastructureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='contact-api-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.directory = Path(cls.temporary.name)
        for source in (ROOT / 'terraform').glob('*.tf'):
            shutil.copyfile(source, cls.directory / source.name)
        shutil.copyfile(ROOT / 'terraform/.terraform.lock.hcl', cls.directory / '.terraform.lock.hcl')
        shutil.copytree(ROOT / 'terraform/functions', cls.directory / 'functions')
        release = Path(os.environ.get('RELEASE_ARTIFACT_DIR', ROOT / 'release-artifacts'))
        for source, destination in [('contact-lambda.zip', 'lambda_function.zip'), ('stats-aggregator.zip', 'stats_aggregator.zip')]:
            shutil.copyfile(release / source, cls.directory / destination)
        (cls.directory / 'tests').mkdir()
        cls.env = {**os.environ, 'AWS_ACCESS_KEY_ID': 'testing', 'AWS_SECRET_ACCESS_KEY': 'testing',
                   'AWS_DEFAULT_REGION': 'us-west-1', 'AWS_EC2_METADATA_DISABLED': 'true',
                   'AWS_CONFIG_FILE': '/dev/null', 'AWS_SHARED_CREDENTIALS_FILE': '/dev/null',
                   'TF_DATA_DIR': str(cls.directory / '.terraform')}
        for key in list(cls.env):
            if key.startswith('TF_VAR_') or key in ('AWS_PROFILE', 'AWS_SESSION_TOKEN', 'TF_CLI_ARGS', 'TF_CLI_ARGS_init', 'TF_CLI_ARGS_test'):
                del cls.env[key]
        initialized = cls.command('init', '-backend=false', '-input=false', '-lockfile=readonly', '-no-color', label='init')
        if initialized.returncode:
            raise RuntimeError(initialized.stdout + initialized.stderr)

    @classmethod
    def command(cls, *arguments, label):
        command = ['terraform', f'-chdir={cls.directory}', *arguments]
        result = subprocess.run(command, env=cls.env, capture_output=True, text=True)
        evidence = os.environ.get('CONTACT_TEST_EVIDENCE_DIR')
        if evidence:
            Path(evidence).mkdir(parents=True, exist_ok=True)
            (Path(evidence) / f'{label}.log').write_text(result.stdout + result.stderr)
        return result

    def evaluate(self, label, override=None, assertions=False):
        (self.directory / 'tests/contact.tftest.hcl').write_text(NATIVE_TEST if assertions else MOCK_ONLY)
        (self.directory / 'mutation_override.tf.json').write_text(json.dumps(override or {}))
        result = self.command('test', '-json', '-verbose', '-no-color', label=label)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        events = [json.loads(line) for line in result.stdout.splitlines()]
        state = next(event['test_state'] for event in events if event['type'] == 'test_state')
        resources = {item['address']: item for item in state['root_module']['resources']}
        return resources

    def test_configuration_and_all_response_dependencies(self):
        resources = self.evaluate('configuration', assertions=True)
        dependencies = resources['aws_api_gateway_deployment.api']['depends_on']
        for name in ('post_200', 'http_200_options', 'healthcheck_200'):
            self.assertIn('aws_api_gateway_integration_response.' + name, dependencies)
            self.assertIn('aws_api_gateway_method_response.' + name, dependencies)

    def test_fingerprint_is_stable_and_changes_with_real_configuration(self):
        def fingerprint(resources):
            return resources['aws_api_gateway_deployment.api']['values']['triggers']['redeployment']
        baseline = fingerprint(self.evaluate('baseline'))
        self.assertEqual(baseline, fingerprint(self.evaluate('no-op')))
        mutations = {
            'method': {'aws_api_gateway_method': {'post_method': {'authorization': 'AWS_IAM'}}},
            'integration': {'aws_api_gateway_integration': {'healthcheck': {'request_templates': {'application/json': '{"statusCode":201}'}}}},
            'method-response': {'aws_api_gateway_method_response': {'post_200': {'response_parameters': {'method.response.header.Vary': True}}}},
            'integration-response': {'aws_api_gateway_integration_response': {'healthcheck_200': {'response_templates': {'application/json': '{"reachable":true}'}}}},
        }
        for label, mutation in mutations.items():
            with self.subTest(configuration=label):
                self.assertNotEqual(baseline, fingerprint(self.evaluate(label, {'resource': mutation})))


if __name__ == '__main__':
    unittest.main()
