import json
import os
import re

import boto3

# SNS client created at module scope so it is reused across warm invocations
# rather than rebuilt on every request.
sns = boto3.client("sns")

# Terraform supplies the exact browser allow-list for both POST and OPTIONS.
# Missing configuration grants no browser origin; non-browser requests remain
# compatible. CORS is browser response policy, not authentication.
ALLOWED_ORIGINS = frozenset(json.loads(os.environ.get("ALLOWED_ORIGINS", "[]")))

# Server-authoritative input limits, independent of client validation.
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
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
}


def _response(status_code, body, origin):
    headers = dict(CORS_HEADERS)
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
    return {
        "statusCode": status_code,
        "headers": headers,
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
    origin = next((value for key, value in (event.get("headers") or {}).items()
                   if key.lower() == "origin"), None)
    if origin is not None and origin not in ALLOWED_ORIGINS:
        return _response(403, "Origin is not allowed", None)
    # Preflight is body-independent and never sends a notification.
    if event.get("httpMethod") == "OPTIONS":
        return _response(200, "", origin)

    # F3: never let a malformed body raise an uncaught exception (502).
    try:
        eventbody = json.loads(event["body"])
    except (TypeError, KeyError, ValueError):
        return _response(400, "Request body must be valid JSON", origin)

    # F2: enforce types, length caps, email format, and strip injection vectors.
    sanitized, error = _validate(eventbody)
    if error is not None:
        return _response(400, error, origin)

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
        return _response(502, "Failed to send message. Please try again later.", origin)

    return _response(200, "Message sent to SNS topic", origin)
