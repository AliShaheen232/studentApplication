import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  KeyRound,
  FileText,
  Copy,
  Paperclip,
} from "lucide-react";

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: any | null;
  studentProfile: any;
  userEmail: string;
  contacts: any[];
  documents?: any[];
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

const TEMPLATES: [string, string][] = [
  ["academic_inquiry", "Admission questions"],
  ["eligibility_check", "Am I eligible?"],
  ["research_fit", "Research and supervisors"],
  ["assistantship_inquiry", "Funding and scholarships"],
];

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function EmailComposerModal({
  isOpen,
  onClose,
  program,
  studentProfile,
  documents = [],
  isGmailConnected,
  gmailEmail,
  userEmail,
  onEmailSentSuccess,
  onOpenGmailSettings,
  onNotify,
}: EmailComposerModalProps) {
  const [templateKey, setTemplateKey] = useState("academic_inquiry");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMissed, setSearchMissed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const run = useRef(0);

  const generate = async (tpl: string) => {
    if (!program) return;
    const id = ++run.current;
    setIsGenerating(true);
    setErrorMessage(null);
    setSearchMissed(false);
    try {
      const data = await post("/api/compose/generate", { program_id: program.id, template_key: tpl });
      if (id !== run.current) return;
      setSubject(data.subject || "");
      setBodyText(data.body_text || "");
      setRecipientEmail(data.recipient_email || "");
      setIsGenerating(false);
      if (!data.recipient_email && data.can_search) {
        setIsSearching(true);
        try {
          const found = await post("/api/compose/find-contact", { university_id: data.university_id });
          if (id !== run.current) return;
          if (found.recipient_email) {
            setRecipientEmail(found.recipient_email);
            if (found.greeting) setBodyText((b: string) => b.replace(/^Dear [^\n]*,/, found.greeting));
          } else {
            setSearchMissed(true);
          }
        } catch {
          if (id === run.current) setSearchMissed(true);
        } finally {
          if (id === run.current) setIsSearching(false);
        }
      } else if (!data.recipient_email) {
        setSearchMissed(true);
      }
    } catch (err: any) {
      if (id !== run.current) return;
      setErrorMessage(err.message || "Could not write the draft.");
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (program && isOpen) {
      setSuccessMessage(null);
      generate(templateKey);
    }
    return () => {
      run.current++;
    };
  }, [program?.id, isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSending, onClose]);

  if (!isOpen || !program) return null;

  const email = recipientEmail.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const busy = isGenerating || isSending;
  const canSend = isGmailConnected && emailOk && !!subject.trim() && !!bodyText.trim() && !busy;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!emailOk) return setErrorMessage("Add the admissions email address first.");
    setIsSending(true);
    try {
      const data = await post("/api/compose/send", {
        program_id: program.id,
        recipient_email: email,
        subject: subject.trim(),
        body_text: bodyText.trim(),
      });
      setSuccessMessage(`Sent to ${email}.`);
      onNotify(`Email sent to ${email} for ${program.name}.`);
      onEmailSentSuccess({ recipient_email: email, subject: subject.trim(), message_id: data.message_id, remaining_daily_quota: data.remaining_daily_quota });
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not send the email.");
    } finally {
      setIsSending(false);
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const tests = ["ielts", "toefl", "pte", "duolingo"];
  const required: [string, string][] = [
    ["Curriculum Vitae", "CV"],
    ["Academic Transcript", "Academic transcript"],
    ["Degree Certificate", "Degree certificate"],
    ...(tests.includes(studentProfile?.english_test) ? ([["Language Score Report", "English test report"]] as [string, string][]) : []),
  ];
  const have = (type: string) => documents.find((d) => d.doc_type === type);
  const missing = required.filter(([type]) => !have(type));

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  const copyButtons: [string, string, string][] = [
    ["to", "Copy email", email],
    ["subject", "Copy subject", subject],
    ["body", "Copy message", bodyText],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60" role="dialog" aria-modal="true" aria-labelledby="email-composer-title">
      <form onSubmit={send} className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="email-composer-title" className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              Email the university
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {program.name} · {program.university_name}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isSending} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">To</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder={isSearching ? "Looking for the admissions email…" : "admissions@university.edu"}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
            />
            {isSearching && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <RotateCw className="h-3 w-3 animate-spin" />
                Checking the university's website for an admissions email.
              </p>
            )}
            {searchMissed && !isSearching && !email && (
              <p className="text-[11px] text-amber-700 mt-1">
                We could not find a public email on the university's website. Paste one if you have it.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase">Message</label>
              <select
                value={templateKey}
                onChange={(e) => {
                  setTemplateKey(e.target.value);
                  generate(e.target.value);
                }}
                disabled={busy}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
              >
                {TEMPLATES.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {isGenerating ? (
              <div className="h-48 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center gap-2 text-slate-500">
                <RotateCw className="h-4 w-4 animate-spin text-emerald-700" />
                Writing your draft…
              </div>
            ) : (
              <textarea
                rows={10}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-emerald-600"
              />
            )}
          </div>

          {!isGmailConnected && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-[11px] text-slate-600">
                  Gmail is not connected. Connect it to send from here, or copy this draft and send it from your own mail app.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenGmailSettings();
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <KeyRound className="h-3 w-3" />
                  Connect Gmail
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {copyButtons.map(([key, label, text]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={!text.trim() || isGenerating}
                    onClick={() => copy(key, text)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {copied === key ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied === key ? "Copied" : label}
                  </button>
                ))}
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Gmail
                </a>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Paperclip className="h-3 w-3" />
                  Attach these files to your email
                </div>
                <ul className="space-y-1">
                  {required.map(([type, label]) => {
                    const doc = have(type);
                    return (
                      <li key={type} className="flex items-center gap-2 text-[11px] min-w-0">
                        {doc ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        <span className="font-medium text-slate-800 shrink-0">{label}</span>
                        <span className={`truncate ${doc ? "text-slate-500" : "text-amber-700"}`}>{doc ? doc.filename : "not uploaded yet"}</span>
                      </li>
                    );
                  })}
                </ul>
                {missing.length > 0 && (
                  <p className="text-[11px] text-amber-700 mt-2">
                    Please upload {missing.map(([, label]) => label).join(", ")} in your Profile, then attach them in your mail app.
                  </p>
                )}
              </div>
            </div>
          )}

          {isGmailConnected && (
            <p className="text-[11px] text-slate-500">
              Sends from <strong className="text-slate-700">{gmailEmail || userEmail}</strong>. Replies come to your inbox.
            </p>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <button type="button" onClick={onClose} disabled={isSending} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={() => generate(templateKey)} disabled={busy} className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
              <RotateCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
              Rewrite draft
            </button>
            <button type="submit" disabled={!canSend} className="px-6 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSending ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {isSending ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
