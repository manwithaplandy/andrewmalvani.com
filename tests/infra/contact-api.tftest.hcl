# Native provider mocks: no AWS requests, credentials or backend state.
mock_provider "aws" {
  # Stable synthetic identities make independent mock runs comparable. The
  # resource configuration itself remains the actual source, including changes.
  mock_resource "aws_api_gateway_rest_api" {
    defaults = { id = "synthetic-api", root_resource_id = "synthetic-root", execution_arn = "arn:aws:execute-api:us-west-1:870140981796:synthetic" }
  }
  mock_resource "aws_api_gateway_resource" { defaults = { id = "synthetic-resource" } }
  mock_resource "aws_api_gateway_method" { defaults = { id = "synthetic-method" } }
  mock_resource "aws_api_gateway_integration" {
    defaults = { id = "synthetic-integration", cache_namespace = "synthetic-cache", passthrough_behavior = "WHEN_NO_MATCH" }
  }
  mock_resource "aws_api_gateway_method_response" { defaults = { id = "synthetic-method-response" } }
  mock_resource "aws_api_gateway_integration_response" { defaults = { id = "synthetic-integration-response" } }

  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::870140981796:role/synthetic" }
  }
  mock_resource "aws_sns_topic" {
    defaults = { arn = "arn:aws:sns:us-west-1:870140981796:synthetic" }
  }
  mock_resource "aws_lambda_function" {
    defaults = { invoke_arn = "arn:aws:apigateway:us-west-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-1:870140981796:function:formSubmission/invocations" }
  }
}
mock_provider "aws" { alias = "us_east_1" }
mock_provider "random" {}
mock_provider "archive" {}
variables { email_address = "synthetic@example.com" }

run "contact_configuration" {
  command = apply
  plan_options { target = [aws_api_gateway_stage.api] }
  assert {
    condition     = try(jsondecode(aws_api_gateway_integration.healthcheck.request_templates["application/json"]).statusCode == 200, false)
    error_message = "Health MOCK must receive an explicit statusCode 200 request mapping."
  }
  assert {
    condition     = aws_api_gateway_integration.http_200_options.type == "AWS_PROXY" && aws_api_gateway_integration.http_200_options.integration_http_method == "POST"
    error_message = "OPTIONS must use the same origin-aware Lambda boundary as POST."
  }
  assert {
    condition     = aws_api_gateway_deployment.api.stage_name == null
    error_message = "The explicit stage must be the sole stage owner."
  }
  assert {
    condition     = tolist(jsondecode(aws_lambda_function.form_submission.environment[0].variables.ALLOWED_ORIGINS)) == tolist(["https://andrewmalvani.com", "https://www.andrewmalvani.com"])
    error_message = "Lambda must receive exactly both production origins from Terraform."
  }
}
