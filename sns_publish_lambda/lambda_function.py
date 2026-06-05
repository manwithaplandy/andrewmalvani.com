import json
import os
import re

import boto3

# SNS client created at module scope so it is reused across warm invocations
# rather than rebuilt on every request.
sns = boto3.client("sns")

# Allowed browser origin for CORS responses. Injected by Terraform (see the
# Lambda's environment block in terraform/contactLambda.tf) so the origin has a
# single source of truth; the default keeps local runs working.
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "https://andrewmalvani.com")

# Conservative input limits. The client textarea caps the message at 250 chars,
# but the server is authoritative — these guard against oversized / abusive
# payloads regardless of what the client sends.
MAX_NAME_LEN = 100
MAX_EMAIL_LEN = 254  # RFC 5321 maximum length of an email address
MAX_MESSAGE_LEN = 2000

# Pragmatic email shape check — intentionally conservative, not RFC-exhaustive.
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Control characters except tab/newline/carriage-return, which we strip outright.
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Collapse CR/LF runs (and surrounding whitespace) into a single space.
_NEWLINE_COLLAPSE_RE = re.compile(r"\s*[\r\n]+\s*")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
}


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": body,
    }


def _sanitize(value, max_len):
    """Strip control chars and collapse newlines to neutralize header-style
    injection, then enforce the length cap."""
    cleaned = _CONTROL_CHARS_RE.sub("", value)
    # Collapse CR/LF into single spaces so an attacker cannot forge
    # "From:"/"Reply-To:" style lines in the email body.
    cleaned = _NEWLINE_COLLAPSE_RE.sub(" ", cleaned).strip()
    return cleaned[:max_len]


def _validate(body):
    """Validate and sanitize the parsed request body.

    Returns (sanitized_dict, None) on success, or (None, error_message) on
    failure so the caller can return a 400.
    """
    if not isinstance(body, dict):
        return None, "Request body must be a JSON object"

    for field in ("name", "email", "message"):
        if field not in body:
            return None, f"Missing required field: {field}"
        if not isinstance(body[field], str):
            return None, f"Field '{field}' must be a string"

    name = _sanitize(body["name"], MAX_NAME_LEN)
    email = _sanitize(body["email"], MAX_EMAIL_LEN)
    message = _sanitize(body["message"], MAX_MESSAGE_LEN)

    if not name:
        return None, "Field 'name' must not be empty"
    if not EMAIL_RE.match(email):
        return None, "Field 'email' is not a valid email address"
    if not message:
        return None, "Field 'message' must not be empty"

    return {"name": name, "email": email, "message": message}, None


def lambda_handler(event, context):
    # F3: never let a malformed body raise an uncaught exception (502).
    try:
        eventbody = json.loads(event["body"])
    except (TypeError, KeyError, ValueError):
        return _response(400, "Request body must be valid JSON")

    # F2: enforce types, length caps, email format, and strip injection vectors.
    sanitized, error = _validate(eventbody)
    if error is not None:
        return _response(400, error)

    email_body = (
        f"Name: {sanitized['name']}\n\n"
        f"Email: {sanitized['email']}\n\n"
        f"Message: {sanitized['message']}\n"
    )
    subject = "New contact request from andrewmalvani.com"

    # F5: no PII printed to logs. Wrap publish so SNS failures don't leak
    # internals via an unhandled stack trace.
    try:
        sns.publish(
            TopicArn=os.environ["SNS_TOPIC_ARN"],
            Message=email_body,
            Subject=subject,
        )
    except Exception:  # noqa: BLE001 — surface a clean error, not internals
        return _response(502, "Failed to send message. Please try again later.")

    return _response(200, "Message sent to SNS topic")
