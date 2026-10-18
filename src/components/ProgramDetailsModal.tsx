import React from "react";
import {
  X,
  ExternalLink,
  Building2,
  Globe,
  GraduationCap,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { DiscoveredProgram } from "./DiscoverView";

interface ProgramDetailsModalProps {
  program: DiscoveredProgram | null;
  onClose: () => void;
  onSendEmail: (program: DiscoveredProgram) => void;
}

export default function ProgramDetailsModal({
  program,
  onClose,
  onSendEmail,
}: ProgramDetailsModalProps) {
  if (!program) return null;

  const isPortalOnly = program.application_mode === "portal_only";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 uppercase font-mono text-[10px]">
                {program.original_degree || program.level}
              </span>
              <span>•</span>
              <span>{program.subject_category}</span>
              <span>•</span>
              {program.program_url && (
                <span className="flex items-center gap-1 text-slate-500 font-normal">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> From the
                  official website
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-900 leading-snug">
              {program.name}
            </h3>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {program.university_name} -{" "}
              {program.city ? `${program.city}, ` : ""}
              {program.country}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* Official Application Portal Notice */}
          {isPortalOnly ? (
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">
                  Official Portal Required for Formal Application
                </strong>
                This institution requires formal application submission through
                their university admissions portal. Inquiry emails sent via
                AdminPath serve strictly to request guidance regarding
                eligibility, department assistantships, or research supervision.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">
                  Check the official page before you write
                </strong>
                Application steps differ by university. An email from AdmitPath
                is a question to the university, not an application.
              </div>
            </div>
          )}

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Study Level
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {program.level === "Bachelor"
                  ? "Bachelor's"
                  : program.level === "Master"
                    ? "Master's"
                    : program.level}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Annual Tuition
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {program.tuition
                  ? `$${program.tuition.toLocaleString()} USD`
                  : "Not available"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Duration
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {program.duration_months ? `${program.duration_months} Months` : "Not listed"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Application Deadline
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {program.deadline || "Not listed"}
              </span>
            </div>
          </div>

          {/* Department & Curriculum */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Department & Academic Discipline
            </h4>
            <p className="text-slate-600">
              {program.department ? (
                <>
                  Offered by <strong>{program.department}</strong>.{" "}
                </>
              ) : null}
              Subject: <strong>{program.subject_category}</strong>. Language of
              instruction: <strong>{program.language || "Not listed"}</strong>.
            </p>
          </div>

          {/* Admission Prerequisites & Requirements */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Admission Requirements & Criteria
            </h4>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
              {program.requirements ||
                "Not listed on the pages we checked. See the official programme page for the exact requirements."}
            </div>
          </div>

          {/* Source Provenance & Verification */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Source Provenance & Official Links
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              {program.program_url && (
                <div className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200">
                  <span className="font-medium truncate mr-2">
                    Official Programme Catalogue
                  </span>
                  <a
                    href={program.program_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline shrink-0 font-semibold"
                  >
                    Open Catalogue <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {program.admissions_url && (
                <div className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200">
                  <span className="font-medium truncate mr-2">
                    Admissions Office Portal
                  </span>
                  <a
                    href={program.admissions_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline shrink-0 font-semibold"
                  >
                    Open Admissions <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div className="text-[11px] text-slate-400 pt-1">
                {program.last_verified
                  ? `Last checked on the official website on ${new Date(program.last_verified.replace(" ", "T") + (program.last_verified.includes("Z") ? "" : "Z")).toLocaleDateString()}.`
                  : "Not checked on the official website yet."}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onSendEmail(program);
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold shadow-xs transition"
          >
            <Mail className="h-3.5 w-3.5" />
            Send Admissions Inquiry Email
          </button>
        </div>
      </div>
    </div>
  );
}
