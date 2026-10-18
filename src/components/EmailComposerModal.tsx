import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  Building2,
  Globe,
  GraduationCap,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  FileText,
  User,
} from "lucide-react";
import { DiscoveredProgram } from "./DiscoverView";

interface Contact {
  id: string;
  university_id: string;
  department: string;
  name: string;
  role: string;
  email: string;
  email_type: string;
  phone: string;
  source_url: string;
}

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: DiscoveredProgram | any | null;
  studentProfile: any;
  userEmail: string;
  contacts: Contact[];
  isGmailConnected: boolean;
  gmailEmail?: string;
  token?: string | null;
  onEmailSentSuccess: (result: {
    recipient_email: string;
    subject: string;
    message_id: string;
    remaining_daily_quota?: number;
  }) => void;
  onOpenGmailSettings: () => void;
  onNotify: (msg: string) => void;
}

export default function EmailComposerModal({
  isOpen,
  onClose,
  program,
  studentProfile,
  userEmail,
  contacts,
  isGmailConnected,
  gmailEmail,
  token,
  onEmailSentSuccess,
  onOpenGmailSettings,
  onNotify,
}: EmailComposerModalProps) {
  if (!isOpen || !program) return null;

  // Form States
  const [templateKey, setTemplateKey] = useState("academic_inquiry");
  const [customHook, setCustomHook] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [isVerifiedContact, setIsVerifiedContact] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  // Status & Loading States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Close on Escape key (unless submitting)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSending, onClose]);

  // Initial draft generation when modal opens or target program changes
  useEffect(() => {
    if (program && isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      handleGenerateDraft(templateKey, customHook);
    }
  }, [program?.id, isOpen]);

  // Call backend compose generation
  const handleGenerateDraft = async (tpl: string, hookText: string) => {
    if (!program) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Check if university has a contact in contacts list
      const matchedContact =
        contacts.find((c) => c.university_id === program.university_id) || null;

      const res = await fetch("/api/compose/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          program_id: program.id,
          contact_id: matchedContact?.id || undefined,
          template_key: tpl,
          custom_hook: hookText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate email draft.");
      }

      const data = await res.json();
      setSubject(data.subject || "");
      setBodyText(data.body_text || "");
      setRecipientEmail(data.recipient_email || "");
      setRecipientName(data.recipient_name || "Admissions Committee");
      setContactRole(data.recipient_role || "Admissions Office");
      setIsVerifiedContact(!!data.is_verified_contact);
      setContactId(data.contact_id || null);
      setPortalNotice(data.portal_notice || null);

      if (data.warning) {
        setErrorMessage(data.warning);
      }
    } catch (err: any) {
      console.error("Draft generation error:", err);
      setErrorMessage(
        err.message || "Failed to generate draft. Please check your inputs.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Send Email Handler
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Frontend validations
    const cleanEmail = recipientEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage(
        "Please provide a valid admissions recipient email address.",
      );
      return;
    }

    if (!subject.trim()) {
      setErrorMessage("Email subject line cannot be empty.");
      return;
    }

    if (!bodyText.trim()) {
      setErrorMessage("Email message body cannot be empty.");
      return;
    }

    if (!isGmailConnected) {
      setErrorMessage(
        "Your student Gmail account is not connected. Please connect your Gmail account before sending applications.",
      );
      return;
    }

    setIsSending(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const payload = {
        program_id: program.id,
        contact_id: contactId,
        recipient_email: cleanEmail,
        recipient_name: recipientName.trim() || cleanEmail.split("@")[0],
        subject: subject.trim(),
        body_text: bodyText.trim(),
        body_html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${bodyText
          .trim()
          .split("\n\n")
          .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
          .join("")}</div>`,
        hook: customHook,
        template_key: templateKey,
      };

      const res = await fetch("/api/compose/send", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email.");
      }

      // Success!
      setSuccessMessage(
        `Admissions inquiry successfully dispatched to ${cleanEmail} via your connected Gmail account!`,
      );
      onNotify(
        `Admissions inquiry sent to ${cleanEmail} for ${program.name}.`,
      );

      onEmailSentSuccess({
        recipient_email: cleanEmail,
        subject: subject.trim(),
        message_id: data.message_id,
        remaining_daily_quota: data.remaining_daily_quota,
      });

      // Close modal smoothly after brief visual confirmation
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error("Email send error:", err);
      setErrorMessage(
        err.message || "Failed to send email. Please review your settings.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const isPortalOnly = program.application_mode === "portal_only";
  const isSendDisabled =
    isSending ||
    isGenerating ||
    !recipientEmail.trim() ||
    !subject.trim() ||
    !bodyText.trim() ||
    !isGmailConnected;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-composer-title"
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 uppercase font-mono text-[10px]">
                {program.original_degree || program.level || "Master"}
              </span>
              <span>•</span>
              <span className="text-slate-600 font-medium">
                {program.department || program.subject_category}
              </span>
              <span>•</span>
              <span className="text-slate-500 font-normal">
                {program.country}
                {program.city ? `, ${program.city}` : ""}
              </span>
            </div>

            <h2
              id="email-composer-title"
              className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
            >
              Admissions Email Inquiry — {program.name}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {program.university_name || "Accredited University"}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Official Portal Notice vs Admissions Inquiry */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isPortalOnly
                ? "bg-amber-50/90 border-amber-200 text-amber-900"
                : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            }`}
          >
            {isPortalOnly ? (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="text-[11px] leading-relaxed">
              <strong className="font-semibold block mb-0.5">
                {isPortalOnly
                  ? "Admissions Inquiry vs. Formal Portal Application"
                  : "Admissions Inquiry Communication"}
              </strong>
              {isPortalOnly
                ? "This university requires formal application filing via their official portal. Sending this personalized inquiry serves to discuss research supervisor alignment, assistantship eligibility, or entry requirements prior to formal submission."
                : "This academic inquiry initiates direct contact with admissions officers and graduate coordinators to establish your academic qualifications and express interest."}
            </div>
          </div>

          {/* Gmail Connection Status Banner */}
          {!isGmailConnected ? (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">
                    Gmail Account Disconnected
                  </strong>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    AdminPath sends emails directly from your own authenticated
                    Google account so responses arrive in your primary inbox.
                    Please connect your Gmail account to send.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGmailSettings();
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="h-3 w-3" />
                Connect Gmail
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Sending via authenticated student Gmail:{" "}
                <strong className="text-slate-800">
                  {gmailEmail || userEmail}
                </strong>
              </span>
              <span className="text-[10px] text-slate-400">
                Least-privilege OAuth 2.0 (gmail.send)
              </span>
            </div>
          )}

          {/* Validation Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Confirmation Message */}
          {successMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Recipient & Contact Information Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-700" />
                Admissions Recipient Information
              </span>
              {isVerifiedContact ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Institutional Contact
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertCircle className="h-3 w-3" />
                  Verification Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Recipient Name / Office
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Graduate Admissions Coordinator"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="admissions@university.edu"
                  required
                  className={`w-full bg-white border rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none ${
                    !recipientEmail.trim()
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-slate-200 focus:border-emerald-600"
                  }`}
                />
                {!recipientEmail.trim() && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Please provide or verify the institutional admissions email
                    address before sending.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* AI Drafting Options: Template & Custom Research Hook */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                Personalized AI Email Tailoring
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="academic_inquiry">
                    Standard Academic Inquiry
                  </option>
                  <option value="research_fit">
                    Research & Lab Alignment
                  </option>
                  <option value="assistantship_inquiry">
                    Graduate Assistantship / Funding
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    handleGenerateDraft(templateKey, customHook)
                  }
                  disabled={isGenerating}
                  className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCw
                    className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`}
                  />
                  {isGenerating ? "Generating..." : "Regenerate Draft"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Custom Research Hook / Specific Faculty Interest (Optional)
              </label>
              <input
                type="text"
                value={customHook}
                onChange={(e) => setCustomHook(e.target.value)}
                placeholder="e.g. Inspired by Professor Smith's recent publications in distributed reinforcement learning."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Email Subject Field */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Email Subject Line *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Inquiry regarding admissions..."
              required
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Email Body Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                Email Message Body *
              </label>
              <span className="text-[10px] text-slate-400">
                Personalized with your academic credentials & GPA
              </span>
            </div>
            {isGenerating ? (
              <div className="h-48 border border-slate-200 rounded-lg bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-500">
                <RotateCw className="h-5 w-5 animate-spin text-emerald-700" />
                <span className="text-xs font-medium">
                  Crafting personalized academic inquiry email...
                </span>
              </div>
            ) : (
              <textarea
                rows={9}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-sans focus:outline-none focus:border-emerald-600"
                placeholder="Compose or review the email text..."
              />
            )}
          </div>

          {/* Compliance & Deliverability Note */}
          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Deliverability safeguards: RFC 2822 multipart MIME • Automatic
              opt-out notice included • Rate limited
            </span>
            <span className="text-emerald-700 font-medium">
              Direct Student Mailbox
            </span>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleGenerateDraft(templateKey, customHook)}
              disabled={isGenerating || isSending}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw
                className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`}
              />
              Generate Draft
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendDisabled}
              className="w-full sm:w-auto px-6 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  Dispatching via Gmail...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
