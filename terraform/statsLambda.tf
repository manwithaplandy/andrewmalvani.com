# Stats aggregator: a scheduled Lambda that turns the CloudFront access logs
# the site already collects (plus Cloudflare's edge analytics API) into a
# static, privacy-safe stats.json served from the website bucket. There is no
# public write endpoint anywhere in this pipeline.

# Lambda resources
resource "aws_lambda_function" "stats_aggregator" {
  function_name = "statsAggregator"
  handler       = "lambda_function.lambda_handler"
  # python3.12 (not 3.13): the locked AWS provider (5.50.0) predates the 3.13
  # runtime enum. Bump both together when the provider is next upgraded.
  runtime     = "python3.12"
  role        = aws_iam_role.stats_aggregator_exec.arn
  memory_size = 512
  timeout     = 300

  # Intentionally no source_code_hash: like formSubmission, the zip here only
  # bootstraps the function. CI pushes code updates via
  # `aws lambda update-function-code`, and omitting the hash keeps Terraform
  # from seeing that as drift on the next plan.
  filename = "stats_aggregator.zip"

  environment {
    variables = {
      TABLE_NAME         = aws_dynamodb_table.data_table.name
      LOG_BUCKET         = aws_s3_bucket.log_bucket.bucket
      WEBSITE_BUCKET     = aws_s3_bucket.website.bucket
      CF_ZONE_ID         = var.cloudflare_zone_id
      CF_TOKEN_SSM_PARAM = local.cloudflare_token_ssm_param
    }
  }

  depends_on = [aws_cloudwatch_log_group.stats_aggregator]
}

data "archive_file" "stats_aggregator_function" {
  type        = "zip"
  source_file = "../stats_aggregator/lambda_function.py"
  output_path = "stats_aggregator.zip"
}

locals {
  # SecureString parameter holding the Cloudflare Analytics:Read API token.
  # Created manually (see README) so the token never touches Terraform state
  # or GitHub.
  cloudflare_token_ssm_param = "/resume/cloudflare-analytics-token"
}

# Dedicated role — deliberately NOT reusing lambda_exec, which carries
# sns:Publish for the contact form. Least privilege per function.
resource "aws_iam_role" "stats_aggregator_exec" {
  name = "stats_aggregator_exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "stats_aggregator_basic_execution" {
  role       = aws_iam_role.stats_aggregator_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "stats_aggregator_access" {
  name        = "stats_aggregator_access"
  description = "Read CloudFront logs, write stats.json, and maintain aggregate items"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadCloudFrontLogs"
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.log_bucket.arn}/cloudfront-logs/*"
      },
      {
        Sid      = "ListCloudFrontLogs"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.log_bucket.arn
        Condition = {
          StringLike = {
            "s3:prefix" = "cloudfront-logs/*"
          }
        }
      },
      {
        Sid      = "WriteStatsJsonOnly"
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.website.arn}/stats.json"
      },
      {
        Sid    = "AggregateTable"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          # Scan is required to collect the page#/referrer#/cf#daily# item
          # families for rendering stats.json (hash-key-only table; the item
          # count is tiny).
          "dynamodb:Scan",
        ]
        Resource = aws_dynamodb_table.data_table.arn
      },
      {
        Sid      = "ReadCloudflareToken"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:us-west-1:${data.aws_caller_identity.current.account_id}:parameter${local.cloudflare_token_ssm_param}"
      },
      {
        # SecureString decryption goes through the AWS-managed aws/ssm key;
        # scope the grant to SSM in this region only.
        Sid      = "DecryptSsmSecureString"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.us-west-1.amazonaws.com"
          }
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "stats_aggregator_access_attach" {
  role       = aws_iam_role.stats_aggregator_exec.name
  policy_arn = aws_iam_policy.stats_aggregator_access.arn
}

# Daily schedule — "Updated daily at 00:00 UTC" is part of the page copy.
resource "aws_cloudwatch_event_rule" "stats_aggregator_daily" {
  name                = "stats-aggregator-daily"
  description         = "Run the stats aggregator once a day at 00:00 UTC"
  schedule_expression = "cron(0 0 * * ? *)"
}

resource "aws_cloudwatch_event_target" "stats_aggregator_daily" {
  rule = aws_cloudwatch_event_rule.stats_aggregator_daily.name
  arn  = aws_lambda_function.stats_aggregator.arn
}

resource "aws_lambda_permission" "stats_aggregator_events" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stats_aggregator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stats_aggregator_daily.arn
}

# Log groups with bounded retention. The formSubmission group already exists
# (created implicitly by Lambda), so adopt it with an import block instead of
# letting the create fail.
resource "aws_cloudwatch_log_group" "stats_aggregator" {
  name              = "/aws/lambda/statsAggregator"
  retention_in_days = 30
}

import {
  to = aws_cloudwatch_log_group.form_submission
  id = "/aws/lambda/formSubmission"
}

resource "aws_cloudwatch_log_group" "form_submission" {
  name              = "/aws/lambda/formSubmission"
  retention_in_days = 30
}

# Silent-staleness guard: if the aggregator errors, stats.json quietly stops
# updating — page the owner via the existing contact-us SNS email topic.
resource "aws_cloudwatch_metric_alarm" "stats_aggregator_errors" {
  alarm_name          = "stats-aggregator-errors"
  alarm_description   = "The stats aggregator Lambda failed; stats.json is going stale"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.stats_aggregator.function_name
  }

  alarm_actions = [aws_sns_topic.website-contact-us.arn]
}
