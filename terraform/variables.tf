# F5: no default — the notification address is supplied via terraform.tfvars
# (or -var/TF_VAR_email_address) so it is not baked into source as a default.
variable "email_address" {
  description = "Email address for notifications"
  type        = string
}

# Cloudflare zone ID for andrewmalvani.com, used by the stats aggregator to
# query the Cloudflare GraphQL Analytics API (uniques + countries). Supplied
# via TF_VAR_cloudflare_zone_id (GitHub repo var CLOUDFLARE_ZONE_ID). The
# empty default keeps plans working before it is configured — the Lambda
# skips the Cloudflare query (with a logged warning) when unset.
variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the site (Analytics API queries)"
  type        = string
  default     = ""
}