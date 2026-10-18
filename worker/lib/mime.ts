import { randomHex } from "./crypto.ts";
import { base64UrlEncode, utf8Base64 } from "./vault.ts";

export interface OutgoingEmail {
  from: string;
  fromName?: string;
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

const EMAIL_RE = /^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+\.[^\s@<>"(),;:]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 254;
}

function assertHeaderSafe(label: string, value: string): void {
  if (/[\r\n]/.test(value)) throw new Error(`${label} must not contain line breaks.`);
}

function encodeWord(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8Base64(value)}?=`;
}

function mailbox(email: string, name?: string): string {
  if (!name) return email;
  const quoted = /^[\x20-\x7e]*$/.test(name) ? `"${name.replace(/["\\]/g, "\\$&")}"` : encodeWord(name);
  return `${quoted} <${email}>`;
}

function wrap76(b64: string): string {
  return b64.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function textToHtml(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">${paragraphs}</div>`;
}

export function buildMime(mail: OutgoingEmail): string {
  for (const [label, value] of [
    ["From", mail.from],
    ["From name", mail.fromName ?? ""],
    ["To", mail.to],
    ["To name", mail.toName ?? ""],
    ["Subject", mail.subject],
    ["Reply-To", mail.replyTo ?? ""],
  ] as const) {
    assertHeaderSafe(label, value);
  }
  if (!isValidEmail(mail.to)) throw new Error("Recipient email is not valid.");
  if (!isValidEmail(mail.from)) throw new Error("Sender email is not valid.");
  if (!mail.subject.trim()) throw new Error("Subject is required.");

  const boundary = `ap_${randomHex(12)}`;
  const html = mail.html ?? textToHtml(mail.text);
  const lines = [
    `From: ${mailbox(mail.from, mail.fromName)}`,
    `To: ${mailbox(mail.to, mail.toName)}`,
    `Subject: ${encodeWord(mail.subject)}`,
    ...(mail.replyTo ? [`Reply-To: ${mail.replyTo}`] : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(utf8Base64(mail.text)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(utf8Base64(html)),
    `--${boundary}--`,
    "",
  ];
  return lines.join("\r\n");
}

export function toGmailRaw(mime: string): string {
  return base64UrlEncode(new TextEncoder().encode(mime));
}
