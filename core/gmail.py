"""AdmitPath Gmail Integration & RFC 2822 MIME Builder.
Generates compliant MIME multipart emails with plain text alternative, HTML part,
optional encrypted attachments, and Gmail API format compatibility.
"""
import base64
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

def build_gmail_mime_message(
    sender_email: str,
    recipient_email: str,
    subject: str,
    body_text: str,
    body_html: str = None,
    attachments: list[dict] = None
) -> tuple[MIMEMultipart, str]:
    """
    Constructs a standard RFC 2822 MIME message and returns the MIMEMultipart object
    and the URL-safe base64 string required by Gmail API messages.send.
    attachments: list of {"filename": "cv.pdf", "content_bytes": b"...", "mime_type": "application/pdf"}
    """
    message = MIMEMultipart("mixed")
    message["To"] = recipient_email
    message["From"] = sender_email
    message["Subject"] = subject

    # Create alternative part for plain text and HTML
    alt_part = MIMEMultipart("alternative")
    alt_part.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        alt_part.attach(MIMEText(body_html, "html", "utf-8"))
    message.attach(alt_part)

    # Attach any documents
    if attachments:
        for att in attachments:
            filename = att.get("filename", "attachment.pdf")
            data = att.get("content_bytes", b"")
            maintype, subtype = att.get("mime_type", "application/pdf").split("/", 1)
            part = MIMEBase(maintype, subtype)
            part.set_payload(data)
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename=\"{filename}\""
            )
            message.attach(part)

    # Gmail API requires URL-safe base64 string
    raw_bytes = message.as_bytes()
    encoded_b64 = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")
    return message, encoded_b64
