# F5: no default — the notification address is supplied via terraform.tfvars
# (or -var/TF_VAR_email_address) so it is not baked into source as a default.
variable "email_address" {
  description = "Email address for notifications"
  type        = string
}