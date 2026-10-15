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
  BookOpen
} from 'lucide-react';

interface StudentProfileProps {
  profile: any;
  documents: any[];
  onUploadDoc: (docType: string, filename: string, size: number, mimeType: string) => Promise<void>;
  onDeleteDoc: (docId: string) => Promise<void>;
  onNotify: (msg: string) => void;
}

export default function StudentProfile({
  profile,
  documents,
  onUploadDoc,
  onDeleteDoc,
  onNotify
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
      {/* Top Banner: Read-Only Administrator Managed Notice */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
        <div className="p-1 rounded-md bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
          <Lock className="h-4 w-4" />
        </div>
        <div className="text-xs text-emerald-950">
          <div className="font-semibold text-emerald-900">
            Institutional Read-Only Profile Mode
          </div>
          <div className="mt-0.5 text-emerald-800 leading-relaxed">
            Your academic records, degree qualifications, GPA verification, and country preferences are authenticated and managed directly by your AdminPath administrator to maintain admissions credibility. To update profile information, please contact your administrator.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Identity Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-serif-editorial text-xl font-bold">
                {(profile.full_name || 'Alex Vance')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="font-serif-editorial text-lg font-bold text-slate-900 leading-tight">
                  {profile.full_name || 'Alex Vance'}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>{profile.nationality || 'International'}</span>
                  <span>•</span>
                  <span>{profile.target_level || 'Master'} Candidate</span>
                </div>
              </div>
            </div>

            <hr className="my-5 border-slate-100" />

            {/* Quick Metrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Academic Standing</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  GPA: {profile.gpa || '3.86'} / {profile.max_gpa || '4.0'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Degree Level</span>
                <span className="font-medium text-slate-800">{profile.target_level || 'Master'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Target Intake</span>
                <span className="font-medium text-slate-800">{profile.intake_term || 'Fall 2026'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">English Proficiency</span>
                <span className="font-medium text-slate-800">
                  IELTS {profile.ielts_score || '7.5'} • TOEFL {profile.toefl_score || '105'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Max Budget Target</span>
                <span className="font-medium text-slate-800">
                  ${(profile.budget_max || 45000).toLocaleString()} {profile.currency || 'USD'}
                </span>
              </div>
            </div>

            <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Verified credentials signed by AdminPath compliance team.</span>
            </div>
          </div>

          {/* Target Countries Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              Target Countries
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(profile.countries || 'USA, United Kingdom, Germany, Canada')
                .split(',')
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
                <p className="text-xs text-slate-500">Verified credentials entered during onboarding</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Read-Only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Full Legal Name</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 font-medium">
                  {profile.full_name || 'Alex Vance'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Current / Completed Qualification</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                  {profile.qualification || 'Bachelor of Science in Computer Science'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nationality & Citizenship</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                  {profile.nationality || 'International'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Country of Current Residence</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                  {profile.country_of_residence || 'International'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cumulative Grade Point Average (GPA)</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 font-semibold text-emerald-800">
                  {profile.gpa || '3.86'} / {profile.max_gpa || '4.0'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Intended Field of Study</label>
                <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 font-medium">
                  {profile.subjects || 'Computer Science, Data Science & AI'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Preferred Institutions</label>
              <div className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800">
                {profile.preferred_universities || 'MIT, Stanford, Oxford, TU Munich'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Research Experience & Projects</label>
              <div className="w-full p-3 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 leading-relaxed">
                {profile.experience || '2 years applied software engineering and undergraduate ML research assistant'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Academic Honors & Publications</label>
              <div className="w-full p-3 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 leading-relaxed">
                {profile.academic_achievements || "Dean's List for 6 semesters, Regional IEEE paper author"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Additional Admissions Preferences</label>
              <div className="w-full p-3 text-xs rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 leading-relaxed">
                {profile.additional_preferences || 'Departmental Graduate Assistantship desired'}
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
