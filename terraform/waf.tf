# ===========================================================================
# AWS WAF — DISABLED 2026-06-21 to cut cost.
#
# Both Web ACLs below were turned off. They cost ~$12/month (~$144/yr) for a
# personal site, and the charge is almost entirely fixed overhead:
#   - $5.00/month per Web ACL  +  $1.00/month per rule  =  $6.00/month each
#   - Request inspection was negligible (~$0.01/mo at current volume).
# Over the trailing 30 days the two ACLs inspected ~18k requests and blocked 0.
#
# Protection retained for free after disabling:
#   - Contact API: API Gateway stage throttling (rate 5/s, burst 10) still
#     caps TOTAL contact-form throughput — the real backstop against the
#     email-bomb / SNS cost-amplification vector. See contactLambda.tf
#     (aws_api_gateway_method_settings.api_method_settings). Disabling the WAF
#     loses only the per-IP granularity the rate-based rule added on top.
#   - Static site: Cloudflare fronts the CloudFront distribution with free edge
#     DDoS protection, and AWS Shield Standard is automatically enabled on
#     CloudFront at no cost. The site is fully-cached static content, so there
#     is no backend cost-amplification vector behind it.
#
# To RE-ENABLE: uncomment the two resources + the association below AND the
# `web_acl_id` line in main.tf (aws_cloudfront_distribution.website_distribution,
# marked "F1"). The original F1 design notes are preserved verbatim below.
# ===========================================================================

# ---------------------------------------------------------------------------
# F1 — Per-client rate limiting.
#
# The email-bomb / cost-amplification vector is the *API Gateway* contact
# endpoint, which is REGIONAL (us-west-1). A regional WAFv2 web ACL with a
# rate-based rule is associated directly to the API stage so a single IP can
# only make a bounded number of requests in the 5-minute WAF window.
#
# A separate CLOUDFRONT-scope web ACL (us-east-1) protects the static site
# distribution and is wired in via main.tf's `web_acl_id`.
# ---------------------------------------------------------------------------

# Regional WAF for the contact API Gateway (the actual abuse surface).
# resource "aws_wafv2_web_acl" "contact_api_waf" {
#   name        = "${random_pet.bucket_name.id}-contact-api-waf"
#   scope       = "REGIONAL"
#   description = "Rate limiting for the public contact API Gateway endpoint"

#   default_action {
#     allow {}
#   }

#   rule {
#     name     = "rate-limit-per-ip"
#     priority = 1

#     action {
#       block {}
#     }

#     statement {
#       rate_based_statement {
#         # Max requests from a single IP over a 5-minute sliding window.
#         # 100 is far above any legitimate human use of a contact form while
#         # still stopping automated flooding.
#         limit              = 100
#         aggregate_key_type = "IP"
#       }
#     }

#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "ContactApiRateLimit"
#       sampled_requests_enabled   = true
#     }
#   }

#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name                = "ContactApiWAF"
#     sampled_requests_enabled   = true
#   }
# }

# resource "aws_wafv2_web_acl_association" "contact_api" {
#   resource_arn = aws_api_gateway_stage.api.arn
#   web_acl_arn  = aws_wafv2_web_acl.contact_api_waf.arn
# }

# CloudFront-scope WAF for the static site distribution (defense in depth).
# resource "aws_wafv2_web_acl" "website_waf" {
#   provider    = aws.us_east_1
#   name        = "${random_pet.bucket_name.id}-website-waf"
#   scope       = "CLOUDFRONT"
#   description = "A Web ACL to protect the website distribution"

#   default_action {
#     allow {}
#   }

#   rule {
#     name     = "RateLimitRule"
#     priority = 1
#     action {
#       block {}
#     }
#     statement {
#       rate_based_statement {
#         limit              = 2000
#         aggregate_key_type = "IP"
#       }
#     }
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name                = "WebsiteRateLimit"
#       sampled_requests_enabled   = true
#     }
#   }

#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name                = "WebsiteWAF"
#     sampled_requests_enabled   = true
#   }
# }
