resource "random_pet" "bucket_name" {
  length    = 3
  separator = "-"
}

locals {
  # Define MIME types for common file extensions
  mime_types = {
    ".html"        = "text/html"
    ".css"         = "text/css"
    ".js"          = "application/javascript"
    ".json"        = "application/json"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".gif"         = "image/gif"
    ".ico"         = "image/x-icon"
    ".svg"         = "image/svg+xml"
    ".txt"         = "text/plain"
    ".webmanifest" = "application/json"
    ".webp"        = "image/webp"
  }
  # build_trigger = sha1(join("", [for f in fileset("${path.module}/../src", "**") : filesha1("${path.module}/../src/${f}")]))
  build_trigger = sha1("${path.module}/../src")
  file_paths    = { for f in fileset("${path.module}/../../out/", "**") : f => f }

  # One exact browser allow-list, consumed by the contact Lambda for both
  # POST responses and OPTIONS preflight. CORS is not authentication.
  allowed_cors_origins = [
    "https://andrewmalvani.com",
    "https://www.andrewmalvani.com",
  ]
}

# S3 bucket for static website hosting
resource "aws_s3_bucket" "website" {
  bucket = "${random_pet.bucket_name.id}-website-bucket"
}

resource "aws_s3_bucket_logging" "website_logs" {
  bucket = aws_s3_bucket.website.id

  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "website-log/"
}

resource "aws_s3_bucket_versioning" "website_versioning" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_policy" "allow_cloudfront_access" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = { "AWS" : "${aws_cloudfront_origin_access_identity.oai.iam_arn}" }
        Action    = ["s3:GetObject"]
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}/*"
        ]
      },
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly",
        Effect = "Allow",
        Principal = {
          Service = "cloudfront.amazonaws.com"
        },
        Action = "s3:GetObject",
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.website.bucket}/*"
        ],
        # Condition = {
        #   StringEquals = {
        #     "aws:SourceArn" = "${aws_cloudfront_distribution.website_distribution.arn}"
        #   }
        # }
      },
    ]
  })
}

resource "aws_s3_bucket_cors_configuration" "example" {
  bucket = aws_s3_bucket.website.id

  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
  }
}

# # Upload React/Next.js build files to the S3 bucket
# resource "aws_s3_object" "website_files" {
#   for_each = local.file_paths

#   bucket = aws_s3_bucket.website.id
#   key    = each.key
#   source = each.value != null ? "${path.module}/../../out/${each.value}" : null
#   etag   = local.build_trigger
#   # Attempt to map the mime type explicitly using local.mime_type, but default to null if match can't be made
#   content_type = each.value != null ? try(lookup(local.mime_types, regex("\\.[^.]+$", each.value), null), null) : null


#   # depends_on = [null_resource.npm_build]
# }

# S3 bucket for storing access logs
resource "aws_s3_bucket" "log_bucket" {
  bucket = "${random_pet.bucket_name.id}-log-bucket"
}

resource "aws_s3_bucket_versioning" "log_bucket_versioning" {
  bucket = aws_s3_bucket.log_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_ownership_controls" "example" {
  bucket = aws_s3_bucket.log_bucket.id

  rule {
    object_ownership = "ObjectWriter"
  }
}

# Bucket policy to allow Cloudwatch Logs to be put into the bucket
resource "aws_s3_bucket_policy" "allow_cloudfront_logs" {
  bucket = aws_s3_bucket.log_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "s3:PutObject"
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.log_bucket.arn}/*"
        Principal = { "Service" : "delivery.logs.amazonaws.com" }
      },
      {
        Action    = "s3:PutObject"
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.log_bucket.arn}/*"
        Principal = { "Service" : "logging.s3.amazonaws.com" }
        Condition = {
          "StringEquals" : {
            "aws:SourceAccount" : "${data.aws_caller_identity.current.account_id}"
          }
        }
      },
      {
        Action    = "s3:GetBucketAcl"
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.log_bucket.arn}"
        Principal = { "Service" : "delivery.logs.amazonaws.com" }
      }
    ]
  })
}

# Lifecycle rules keep current access-log objects eligible for expiration after
# 90 days and noncurrent versions eligible after 30 noncurrent days. Eligibility
# does not guarantee exact deletion timing or establish that history can be
# reconstructed after objects expire.
resource "aws_s3_bucket_lifecycle_configuration" "log_bucket_lifecycle" {
  bucket = aws_s3_bucket.log_bucket.id

  rule {
    id     = "expire-cloudfront-logs"
    status = "Enabled"
    filter {
      prefix = "cloudfront-logs/"
    }
    expiration {
      days = 90
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "expire-website-access-logs"
    status = "Enabled"
    filter {
      prefix = "website-log/"
    }
    expiration {
      days = 90
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "expire-self-logs"
    status = "Enabled"
    filter {
      prefix = "this-bucket-log/"
    }
    expiration {
      days = 90
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for accessing S3 bucket from CloudFront"
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "oac"
  description                       = "Origin Access Control for resume website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Origin metadata sets browser TTL separately from shared TTL. MinTTL stays zero
# in BOTH policies: a long immutable minimum would also extend missing-asset errors.
resource "aws_cloudfront_cache_policy" "site" {
  for_each = {
    stable    = 300
    immutable = 31536000
  }
  name        = "${random_pet.bucket_name.id}-${each.key}"
  min_ttl     = 0
  default_ttl = each.value
  max_ttl     = each.value

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# CloudFront distribution for HTTPS
resource "aws_cloudfront_distribution" "website_distribution" {
  depends_on = [aws_s3_bucket_policy.allow_cloudfront_logs]
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  origin {
    connection_attempts = 3
    connection_timeout  = 10
    domain_name         = "andrewmalvani.com"
    origin_id           = "andrewmalvani.com"
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_keepalive_timeout = 5
      # F6: always fetch the origin over HTTPS (no plaintext downgrade).
      origin_protocol_policy = "https-only"
      origin_read_timeout    = 30
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    connection_attempts = 3
    connection_timeout  = 10
    domain_name         = "www.andrewmalvani.com"
    origin_id           = "www.andrewmalvani.com"
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_keepalive_timeout = 5
      # F6: always fetch the origin over HTTPS (no plaintext downgrade).
      origin_protocol_policy = "https-only"
      origin_read_timeout    = 30
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  aliases = ["andrewmalvani.com", "www.andrewmalvani.com"]

  enabled             = true
  default_root_object = "index.html"

  custom_error_response {
    error_caching_min_ttl = 10
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
  }

  custom_error_response {
    error_caching_min_ttl = 10
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
  }

  default_cache_behavior {
    # F7: a static read-only site only needs read methods.
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-${aws_s3_bucket.website.id}"
    cache_policy_id            = aws_cloudfront_cache_policy.site["stable"].id
    origin_request_policy_id   = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    compress                   = true

    # Keep allow-all until the account's Cloudflare SSL mode and proxy status are
    # authenticated and a coordinated rollout has verified HTTPS to this origin.
    # Public redirects show current viewer behavior, not Cloudflare's origin mode.
    # Tightening this setting alone can create a loop if the upstream still uses
    # HTTP; docs/operations/delivery.md records the required branches and rollback.
    viewer_protocol_policy = "allow-all"

    # OAC-to-S3 origins do not resolve index documents, so extensionless
    # paths like /stats would 404 (only default_root_object covers "/").
    # Rewrite them to their .html objects at the viewer-request edge.
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_extensionless.arn
    }
  }

  ordered_cache_behavior {
    path_pattern               = "_next/static/*"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-${aws_s3_bucket.website.id}"
    cache_policy_id            = aws_cloudfront_cache_policy.site["immutable"].id
    origin_request_policy_id   = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    compress                   = true
    # Same working viewer policy and route normalization as the default behavior.
    viewer_protocol_policy = "allow-all"
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_extensionless.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.amazon_issued.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # TODO: Get this working
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.log_bucket.bucket_domain_name
    prefix          = "cloudfront-logs/"
  }

  # F1: associate the CloudFront-scope WAF (rate limiting) with the distribution.
  # DISABLED 2026-06-21 to cut cost — see waf.tf header for the full rationale.
  # Re-enable this line together with the website_waf resource in waf.tf.
  # web_acl_id = aws_wafv2_web_acl.website_waf.arn
}

# Viewer-request rewrite so Next.js static-export pages resolve without their
# .html extension (S3-via-OAC has no index-document support).
resource "aws_cloudfront_function" "rewrite_extensionless" {
  name    = "rewrite-extensionless-to-html"
  runtime = "cloudfront-js-2.0"
  comment = "Normalize public page paths for the S3 origin"
  publish = true
  code    = file("${path.module}/functions/rewrite-extensionless.js")
}

# F6: response-headers policy adding HSTS (and a few hardening headers) to every
# CloudFront response for the static site.
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${random_pet.bucket_name.id}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000 # 2 years
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

# DynamoDB table for data storage
resource "aws_dynamodb_table" "data_table" {
  name         = "${random_pet.bucket_name.id}-data-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Used by the stats aggregator's marker# items (one per processed CloudFront
  # log object) so they age out alongside the log objects themselves. Items
  # without expires_at (the aggregate counters) are untouched.
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}

# SNS topic for "Contact Us" submissions
resource "aws_sns_topic" "contact_us_topic" {
  name = "${random_pet.bucket_name.id}-contact-us-topic"
}

# IAM role for Lambda function
# resource "aws_iam_role" "lambda_role" {
#   name = "${random_pet.bucket_name.id}-lambda-role"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Action = "sts:AssumeRole"
#         Effect = "Allow"
#         Principal = {
#           Service = "lambda.amazonaws.com"
#         }
#       }
#     ]
#   })
# }

# # IAM policy for Lambda function
# resource "aws_iam_role_policy_attachment" "lambda_policy" {
#   policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
#   role       = aws_iam_role.lambda_role.name
# }

# # Lambda function for handling "Contact Us" submissions
# resource "aws_lambda_function" "contact_us_lambda" {
#   filename      = "lambda_function.zip"
#   function_name = "contact-us-lambda"
#   role          = aws_iam_role.lambda_role.arn
#   handler       = "index.handler"
#   runtime       = "nodejs20.x"

#   environment {
#     variables = {
#       SNS_TOPIC_ARN = aws_sns_topic.contact_us_topic.arn
#     }
#   }
# }

# # Lambda permission to allow SNS to invoke the function
# resource "aws_lambda_permission" "sns_lambda_permission" {
#   statement_id  = "AllowSNSInvoke"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.contact_us_lambda.function_name
#   principal     = "sns.amazonaws.com"
#   source_arn    = aws_sns_topic.contact_us_topic.arn
# }

# # SNS topic subscription for Lambda function
# resource "aws_sns_topic_subscription" "lambda_subscription" {
#   topic_arn = aws_sns_topic.contact_us_topic.arn
#   protocol  = "lambda"
#   endpoint  = aws_lambda_function.contact_us_lambda.arn
# }
