import React, { useState } from 'react';
import {
  UserCheck,
  Shield,
  Lock,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  GraduationCap,
  Globe,
  Award,
  BookOpen,
  Pencil
} from 'lucide-react';

const NOT_SET = 'Not set';
const show = (value: unknown) => (value === null || value === undefined || value === '' ? NOT_SET : String(value));
const ENGLISH_LABELS: Record<string, string> = {
  ielts: 'IELTS',
  toefl: 'TOEFL',
  pte: 'PTE',
  duolingo: 'Duolingo',
  native: 'Native speaker',
  planned: 'Test planned',
  none: 'No test yet'
};
function englishSummary(p: any): string {
  const label = ENGLISH_LABELS[p.english_test];
  if (!label) return NOT_SET;
  const score = p[`${p.english_test}_score`];
  return score !== null && score !== undefined ? `${label} ${score}` : label;
}

interface StudentProfileProps {
  profile: any;
  documents: any[];
  onUploadDoc: (docType: string, filename: string, size: number, mimeType: string) => Promise<void>;
  onDeleteDoc: (docId: string) => Promise<void>;
  onNotify: (msg: string) => void;
  onEdit?: () => void;
}

export default function StudentProfile({
  profile,
  documents,
  onUploadDoc,
  onDeleteDoc,
  onNotify,
  onEdit
}: StudentProfileProps) {
  const [docType, setDocType] = useState('Curriculum Vitae');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        onNotify('Error: File exceeds the maximum 20 MB size limit.');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      onNotify('Please select a file to upload to the Document Vault.');
      return;
    }

    setIsUploading(true);
    try {
      await onUploadDoc(
        docType,
        uploadFile.name,
        uploadFile.size,
        uploadFile.type || 'application/pdf'
      );
      setUploadFile(null);
      onNotify('Document encrypted and securely saved in Document Vault.');
    } catch (err: any) {
      onNotify('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
        <div className="p-1 rounded-md bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
          <UserCheck className="h-4 w-4" />
        </div>
        <div className="text-xs text-emerald-950 flex-1">
          <div className="font-semibold text-emerald-900">Your profile drives your matches and emails</div>
          <div className="mt-0.5 text-emerald-800 leading-relaxed">
            Keep it accurate. Program matching uses your degree, subjects, countries, budget and language scores, and the email composer uses your experience and research interests.
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Identity Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-serif-editorial text-xl font-bold">
                {(profile.full_name || '?')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="font-serif-editorial text-lg font-bold text-slate-900 leading-tight">
                  {show(profile.full_name)}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>{show(profile.nationality)}</span>
                  <span>•</span>
                  <span>{profile.target_level ? `${profile.target_level} applicant` : NOT_SET}</span>
                </div>
              </div>
            </div>

            <hr className="my-5 border-slate-100" />

            {/* Quick Metrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Academic Standing</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  GPA: {show(profile.gpa)} / {show(profile.max_gpa)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Degree Level</span>
                <span className="font-medium text-slate-800">{show(profile.target_level)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Target Intake</span>
                <span className="font-medium text-slate-800">{show(profile.intake_term)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">English Proficiency</span>
                <span className="font-medium text-slate-800">
                  {englishSummary(profile)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Max Budget Target</span>
                <span className="font-medium text-slate-800">
                  {profile.budget_max !== null && profile.budget_max !== undefined
                    ? `${Number(profile.budget_max).toLocaleString()} ${profile.currency || ''}`
                    : NOT_SET}
                </span>
              </div>
            </div>

            <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Only you can see and change your profile.</span>
            </div>
          </div>

          {/* Target Countries Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              Target Countries
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {!profile.countries && <span className="text-xs text-slate-400">{NOT_SET}</span>}
              {(profile.countries || '')
                .split(',')
                .filter((c: string) => c.trim())
                .map((c: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-50 text-slate-700 border border-slate-200"
                  >
                    {c.trim()}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* Right Columns: Read-Only Academic Fields & Document Vault */}
        <div className="lg:col-span-2 space-y-6">
          {/* Academic Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Academic Background</h3>
                <p className="text-xs text-slate-500">What you entered during setup</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Full Legal Name</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 font-medium">
                  {show(profile.full_name)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Current / Completed Qualification</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                  {show(profile.qualification)}
                  {profile.current_institution ? `, ${profile.current_institution}` : ''}
                  {profile.graduation_year ? ` (${profile.graduation_year})` : ''}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nationality & Citizenship</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                  {show(profile.nationality)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Country of Current Residence</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                  {show(profile.country_of_residence)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cumulative Grade Point Average (GPA)</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 font-semibold text-emerald-800">
                  {show(profile.gpa)} / {show(profile.max_gpa)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Intended Field of Study</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 font-medium">
                  {show(profile.subjects)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Preferred Institutions</label>
              <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                {show(profile.preferred_universities)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Research Interests</label>
              <div className="w-full p-3 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line">
                {show(profile.research_interests)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Experience & Projects</label>
              <div className="w-full p-3 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line">
                {show(profile.experience)}
                {profile.work_experience_years ? ` (${profile.work_experience_years} years of work experience)` : ''}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Academic Honors & Publications</label>
              <div className="w-full p-3 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 leading-relaxed">
                {show(profile.academic_achievements)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Additional Admissions Preferences</label>
              <div className="w-full p-3 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 leading-relaxed">
                {show(profile.additional_preferences)}
              </div>
            </div>
          </div>

          {/* Document Vault Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Document Vault</h3>
                <p className="text-xs text-slate-500">Secure AES-256 encrypted storage for CVs, transcripts, and certificates (Max 20 MB/file)</p>
              </div>
              <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {documents.length} Files Stored
              </span>
            </div>

            {/* Upload Control */}
            <form onSubmit={handleUploadSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Document Category</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="Curriculum Vitae">Curriculum Vitae (CV)</option>
                    <option value="Academic Transcript">Official Academic Transcript</option>
                    <option value="Degree Certificate">Degree Certificate / Diploma</option>
                    <option value="Statement of Purpose">Statement of Purpose / SOP</option>
                    <option value="Language Score Report">Language Test Report (IELTS/TOEFL)</option>
                    <option value="Recommendation Letter">Letter of Recommendation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select File (PDF, DOCX, &lt;20MB)</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.jpg,.png"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploading ? 'Encrypting & Saving...' : 'Upload to Vault'}
                </button>
              </div>
            </form>

            {/* Document List */}
            {documents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No documents uploaded yet. Add your CV and transcripts to attach with application inquiries.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{doc.filename}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="font-medium text-slate-600">{doc.doc_type}</span>
                          <span>•</span>
                          <span>{(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>•</span>
                          <span>{doc.uploaded_at?.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        AES-256
                      </span>
                      <button
                        onClick={() => onDeleteDoc(doc.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
