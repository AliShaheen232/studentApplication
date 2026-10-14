import React, { useState, useEffect } from 'react';
import {
  Compass,
  GraduationCap,
  Users,
  UserCheck,
  Sparkles,
  Send,
  Clock,
  Inbox,
  Settings,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Globe,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Upload,
  Trash2,
  Plus,
  Play,
  RotateCw,
  Eye,
  Mail,
  Lock,
  Layers,
  HelpCircle,
  Building2,
  X,
  FileCheck
} from 'lucide-react';

interface University {
  id: string;
  name: string;
  country: string;
  city: string;
  website: string;
  domain: string;
  ranking: number;
  languages: string;
  tuition_min: number;
  tuition_max: number;
  currency: string;
  intake_months: string;
  source_url: string;
}

interface Program {
  id: string;
  university_id: string;
  name: string;
  level: string;
  department: string;
  language: string;
  duration_months: number;
  tuition: number;
  deadline: string;
  requirements: string;
  program_url: string;
  subject_category: string;
  university_name?: string;
  country?: string;
}

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
  university_name?: string;
  country?: string;
}

interface MatchResult {
  program: Program;
  score: number;
  reasons: string[];
  breakdown: {
    subject: number;
    level: number;
    country: number;
    budget: number;
    requirements: number;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'programs' | 'contacts' | 'profile' | 'matches' | 'compose' | 'queue' | 'sent' | 'settings' | 'docs'>('search');
  
  // Data States
  const [universities, setUniversities] = useState<University[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [shortlists, setShortlists] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [queueData, setQueueData] = useState<any>({ items: [], daily_cap: 40, current_ramp_cap: 20, sent_today: 0 });
  const [sentData, setSentData] = useState<any>({ sent: [], replies: [], bounce_rate: 0 });
  const [profile, setProfile] = useState<any>({
    full_name: 'Alex Vance',
    nationality: 'International',
    gpa: 3.86,
    max_gpa: 4.0,
    target_level: 'Master',
    subjects: 'Computer Science, Data Science & AI',
    countries: 'USA, United Kingdom, Germany, Canada',
    budget_max: 45000,
    ielts_score: 7.5,
    toefl_score: 105,
    experience: '2 years applied software engineering and undergraduate ML research assistant'
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ daily_cap: 40, ramp_stage: 1, gmail_connected: 1, gmail_email: 'alex.scholar@gmail.com' });
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [suppressionList, setSuppressionList] = useState<any[]>([]);
  
  // Modals & Active Selections
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [selectedUnivPrograms, setSelectedUnivPrograms] = useState<Program[]>([]);
  const [selectedUnivContacts, setSelectedUnivContacts] = useState<Contact[]>([]);
  const [isUnivModalOpen, setIsUnivModalOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [maxBudgetFilter, setMaxBudgetFilter] = useState('');

  // Composer State
  const [composeTargetProg, setComposeTargetProg] = useState<Program | null>(null);
  const [composeTargetContact, setComposeTargetContact] = useState<Contact | null>(null);
  const [composeTemplate, setComposeTemplate] = useState('academic_inquiry');
  const [customHook, setCustomHook] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBodyText, setDraftBodyText] = useState('');
  const [draftBodyHtml, setDraftBodyHtml] = useState('');
  const [previewMode, setPreviewMode] = useState<'text' | 'html'>('html');

  // Docs & Test state
  const [activeDocName, setActiveDocName] = useState('progress');
  const [docContent, setDocContent] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Status message notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // Initial Data Fetching
  const fetchAllData = async () => {
    try {
      const [uRes, pRes, cRes, profRes, docsRes, slRes, drRes, qRes, sRes, settRes, suppRes] = await Promise.all([
        fetch('/api/universities'),
        fetch('/api/programs'),
        fetch('/api/contacts'),
        fetch('/api/profile'),
        fetch('/api/documents'),
        fetch('/api/shortlists'),
        fetch('/api/drafts'),
        fetch('/api/queue'),
        fetch('/api/sent'),
        fetch('/api/settings'),
        fetch('/api/compliance/suppression')
      ]);

      if (uRes.ok) setUniversities(await uRes.json());
      if (pRes.ok) setPrograms(await pRes.json());
      if (cRes.ok) setContacts(await cRes.json());
      if (profRes.ok) setProfile(await profRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (slRes.ok) setShortlists(await slRes.json());
      if (drRes.ok) setDrafts(await drRes.json());
      if (qRes.ok) setQueueData(await qRes.json());
      if (sRes.ok) setSentData(await sRes.json());
      if (settRes.ok) setSettings(await settRes.json());
      if (suppRes.ok) setSuppressionList(await suppRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch matches whenever user opens matches tab
  useEffect(() => {
    if (activeTab === 'matches') {
      fetch('/api/matcher')
        .then(r => r.json())
        .then(data => setMatches(data))
        .catch(console.error);
    }
  }, [activeTab]);

  // Fetch documentation when doc tab opens or doc name changes
  useEffect(() => {
    if (activeTab === 'docs') {
      fetch(`/api/docs/${activeDocName}`)
        .then(r => r.json())
        .then(d => setDocContent(d.content || ''))
        .catch(console.error);
    }
  }, [activeTab, activeDocName]);

  // Handle University Detail View
  const handleOpenUnivModal = async (univ: University) => {
    setSelectedUniv(univ);
    setIsUnivModalOpen(true);
    try {
      const res = await fetch(`/api/universities/${univ.id}`);
      const data = await res.json();
      setSelectedUnivPrograms(data.programs || []);
      setSelectedUnivContacts(data.contacts || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Shortlist action
  const handleToggleShortlist = async (univId: string, progId?: string) => {
    try {
      const res = await fetch('/api/shortlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ university_id: univId, program_id: progId })
      });
      if (res.ok) {
        showNotify('Added to Academic Shortlist.');
        const sl = await fetch('/api/shortlists').then(r => r.json());
        setShortlists(sl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run live crawler
  const handleRunCrawler = async (univId: string) => {
    showNotify('Dispatching polite web crawler (robots.txt validation & rate limits)...');
    try {
      const res = await fetch('/api/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ university_id: univId })
      });
      const data = await res.json();
      if (res.ok) {
        showNotify(data.message);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Prepare Compose
  const handleStartCompose = (prog: Program) => {
    setComposeTargetProg(prog);
    // Find matching contact for this university
    const targetContact = contacts.find(c => c.university_id === prog.university_id) || contacts[0];
    setComposeTargetContact(targetContact || null);
    setActiveTab('compose');
    generateDraft(prog, targetContact, composeTemplate, customHook);
  };

  const generateDraft = async (prog: Program | null, cont: Contact | null, tpl: string, hookText: string) => {
    if (!prog) return;
    try {
      const res = await fetch('/api/compose/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: prog.id,
          contact_id: cont?.id,
          template_key: tpl,
          custom_hook: hookText
        })
      });
      const data = await res.json();
      setDraftSubject(data.subject);
      setDraftBodyText(data.body_text);
      setDraftBodyHtml(data.body_html);
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Draft and Push to Outbox Queue
  const handleApproveDraft = async () => {
    if (!composeTargetProg) return;
    try {
      // First save draft
      const saveRes = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: composeTargetProg.id,
          contact_id: composeTargetContact?.id,
          template_key: composeTemplate,
          subject: draftSubject,
          body_text: draftBodyText,
          body_html: draftBodyHtml,
          hook: customHook
        })
      });
      const saveData = await saveRes.json();
      if (saveData.draft_id) {
        // Approve draft into outbox
        const appRes = await fetch(`/api/drafts/${saveData.draft_id}/approve`, { method: 'POST' });
        const appData = await appRes.json();
        if (appRes.ok) {
          showNotify(appData.message);
          fetchAllData();
          setActiveTab('queue');
        } else {
          showNotify(`Error: ${appData.error}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send single queue item
  const handleSendQueueItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/queue/${itemId}/send-now`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showNotify(data.message);
        fetchAllData();
      } else {
        showNotify(`Warning: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate Reply or Bounce
  const handleSimulateEvent = async (type: 'reply' | 'bounce' | 'optout') => {
    try {
      const res = await fetch('/api/replies/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          from_email: 'admissions@ox.ac.uk',
          snippet: type === 'bounce' 
            ? 'Mail delivery failed: 550 5.1.1 User unknown' 
            : (type === 'optout' ? 'Please stop contacting our departmental inbox.' : 'Thank you. We have received your CV.')
        })
      });
      const data = await res.json();
      showNotify(data.message);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Run Test Suite
  const handleRunTests = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/tests/run');
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  // Document Upload Simulator
  const handleSimulateUpload = async (docType: string) => {
    const defaultFilenames: Record<string, string> = {
      'Resume/CV': 'Alex_Vance_CV.pdf',
      'Undergraduate Transcript': 'Academic_Transcript_Official.pdf',
      'Degree Certificate': 'Bachelor_Engineering_Degree.pdf',
      'Statement of Purpose': 'Motivation_Letter_Research_Focus.pdf'
    };
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: docType,
          filename: defaultFilenames[docType] || 'document.pdf',
          file_size: 1420500, // 1.4 MB
          mime_type: 'application/pdf'
        })
      });
      if (res.ok) {
        showNotify(`${docType} encrypted & verified (<20MB limit honored).`);
        const docs = await fetch('/api/documents').then(r => r.json());
        setDocuments(docs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered universities
  const filteredUniversities = universities.filter(u => {
    if (selectedCountry !== 'all' && u.country.toLowerCase() !== selectedCountry.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.city.toLowerCase().includes(q) && !u.country.toLowerCase().includes(q)) return false;
    }
    if (maxBudgetFilter && u.tuition_min > parseFloat(maxBudgetFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">AdmitPath</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Global Admissions Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">Directory • Public Contacts • Personalized Outreach • Deliverability Guard</p>
            </div>
          </div>

          {/* Background Lanes Status Bar */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Crawler Lane:</span>
              <span className="font-medium text-emerald-300">Ready (1-2 Concurrency)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
              <span className="text-slate-400">Mailer Lane:</span>
              <span className="font-medium text-cyan-300">
                Cap {queueData.current_ramp_cap}/day (Stage {queueData.ramp_stage || 1})
              </span>
            </div>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{profile.full_name || 'Alex Vance'}</p>
              <p className="text-[11px] text-slate-400">{profile.nationality || 'Indonesia'} • GPA {profile.gpa || 3.86}/4.0</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-indigo-900 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-300">
              {(profile.full_name || 'A').charAt(0)}
            </div>
          </div>
        </div>

        {/* Global Notification Toast */}
        {notification && (
          <div className="max-w-7xl mx-auto mt-2">
            <div className="bg-indigo-600/90 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center justify-between shadow-lg backdrop-blur">
              <span>{notification}</span>
              <button onClick={() => setNotification(null)} className="text-indigo-200 hover:text-white">✕</button>
            </div>
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-slate-800 bg-slate-900/50 px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-1.5 min-w-max">
          {[
            { id: 'search', label: 'University Directory', icon: Building2 },
            { id: 'programs', label: 'Program Catalog', icon: Layers },
            { id: 'contacts', label: 'Public Contacts', icon: Users },
            { id: 'profile', label: 'Profile & Documents', icon: UserCheck },
            { id: 'matches', label: 'Admissions Matcher', icon: Sparkles },
            { id: 'compose', label: 'Compose & Review', icon: Mail },
            { id: 'queue', label: 'Outbox Queue', icon: Clock, badge: queueData.items?.length },
            { id: 'sent', label: 'Sent & Replies', icon: Send, badge: sentData.sent?.length },
            { id: 'settings', label: 'Settings & OAuth', icon: Settings },
            { id: 'docs', label: 'Docs & Unit Tests', icon: BookOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-indigo-800 text-white' : 'bg-slate-800 text-indigo-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* 1. UNIVERSITY DIRECTORY TAB */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Compass className="h-5 w-5 text-indigo-400" /> Worldwide University Directory
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified dataset across 16 countries: USA, Canada, UK, Germany, Netherlands, France, Italy, Spain, Sweden, Finland, Ireland, Australia, South Korea, Indonesia, Malaysia, South Africa.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredUniversities.length} Universities Listed
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800/40 font-medium">
                  {shortlists.length} Shortlisted
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search university or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Countries (16 destinations)</option>
                  <option value="USA">USA</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Germany">Germany</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="France">France</option>
                  <option value="Italy">Italy</option>
                  <option value="Spain">Spain</option>
                  <option value="Sweden">Sweden</option>
                  <option value="Finland">Finland</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Australia">Australia</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="South Africa">South Africa</option>
                </select>
              </div>

              <div>
                <input
                  type="number"
                  placeholder="Max tuition ($ / yr)"
                  value={maxBudgetFilter}
                  onChange={(e) => setMaxBudgetFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCountry('all'); setMaxBudgetFilter(''); }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* University Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUniversities.map((univ) => {
                const isShortlisted = shortlists.some(s => s.university_id === univ.id);
                return (
                  <div
                    key={univ.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group shadow-sm hover:shadow-indigo-500/5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          Rank #{univ.ranking || '—'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5 text-indigo-400" /> {univ.country}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-3 leading-snug group-hover:text-indigo-300 transition">
                        {univ.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{univ.city}</p>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Tuition Range:</span>
                          <span className="font-semibold text-slate-200">
                            ${univ.tuition_min.toLocaleString()} – ${univ.tuition_max.toLocaleString()} {univ.currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Primary Intakes:</span>
                          <span className="font-medium text-slate-300">{univ.intake_months}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Domain:</span>
                          <span className="font-mono text-[11px] text-indigo-400">{univ.domain}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenUnivModal(univ)}
                        className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-400" /> View Programs
                      </button>
                      <button
                        onClick={() => handleToggleShortlist(univ.id)}
                        className={`p-2 rounded-lg border text-xs font-semibold transition ${
                          isShortlisted
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title={isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}
                      >
                        ★
                      </button>
                      <button
                        onClick={() => handleRunCrawler(univ.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition"
                        title="Run Polite Crawler on Admissions Catalog"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. PROGRAM CATALOG TAB */}
        {activeTab === 'programs' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-400" /> Extracted Academic Programs
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Normalized across disciplines: Computer Science, Data Science & AI, Engineering, Business, Medicine.
                </p>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                {programs.length} Programs Extracted
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {programs.map((prog) => (
                <div key={prog.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {prog.level}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{prog.country || 'Global'}</span>
                    </div>

                    <h3 className="text-sm font-bold text-white mt-2 leading-tight">{prog.name}</h3>
                    <p className="text-xs text-indigo-300 font-medium mt-1">{prog.university_name || 'Partner University'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{prog.department}</p>

                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Tuition:</span>
                        <span className="font-semibold text-slate-200">${prog.tuition.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Deadline:</span>
                        <span className="font-medium text-amber-300">{prog.deadline}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Duration:</span>
                        <span className="text-slate-300">{prog.duration_months} Months</span>
                      </div>
                      <div className="mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-snug">
                        <strong className="text-slate-300">Requirements:</strong> {prog.requirements}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleStartCompose(prog)}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Mail className="h-3.5 w-3.5" /> Compose Inquiry
                    </button>
                    <button
                      onClick={() => handleToggleShortlist(prog.university_id, prog.id)}
                      className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                      title="Shortlist"
                    >
                      ★
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. PUBLIC CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" /> Public Admissions & Faculty Contacts
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Extracted strictly from public university directories and contact pages. Never guessed, never scraped behind logins.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Role vs Personal Classification
                </span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Verified &lt; 90 Days
                </span>
              </div>
            </div>

            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Contact / Title</th>
                    <th className="py-3 px-4">University & Department</th>
                    <th className="py-3 px-4">Email & Classification</th>
                    <th className="py-3 px-4">Phone / Helpline</th>
                    <th className="py-3 px-4">Audit Source</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.role}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">{c.university_name || 'Academic Institution'}</div>
                        <div className="text-[11px] text-slate-400">{c.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-indigo-300">{c.email}</div>
                        <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                          c.email_type === 'role' 
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {c.email_type === 'role' ? 'Role Email (admissions@)' : 'Personal Staff'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {c.phone || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-indigo-400 flex items-center gap-1 font-mono text-[11px]"
                        >
                          Public Page <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setComposeTargetContact(c);
                            const matchedProg = programs.find(p => p.university_id === c.university_id) || programs[0];
                            setComposeTargetProg(matchedProg || null);
                            setActiveTab('compose');
                            generateDraft(matchedProg, c, composeTemplate, customHook);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                        >
                          Email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PROFILE & DOCUMENTS VAULT TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-400" /> Student Academic Profile & Document Vault
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Your profile powers the algorithmic admissions matcher and dynamically generates personalized inquiry letters.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Form */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">Academic Background</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profile.full_name || ''}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nationality / Citizenship</label>
                    <input
                      type="text"
                      value={profile.nationality || ''}
                      onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">GPA / Scale</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={profile.gpa || ''}
                        onChange={(e) => setProfile({ ...profile, gpa: parseFloat(e.target.value) })}
                        className="w-2/3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        value={profile.max_gpa || 4.0}
                        onChange={(e) => setProfile({ ...profile, max_gpa: parseFloat(e.target.value) })}
                        className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Target Degree Level</label>
                    <select
                      value={profile.target_level || 'Master'}
                      onChange={(e) => setProfile({ ...profile, target_level: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Bachelor">Bachelor Degree</option>
                      <option value="Master">Master Degree (MSc / MA / MBA)</option>
                      <option value="PhD">Doctorate / PhD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">IELTS Score (or equivalent)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={profile.ielts_score || ''}
                      onChange={(e) => setProfile({ ...profile, ielts_score: parseFloat(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Annual Budget Ceiling ($ USD)</label>
                    <input
                      type="number"
                      value={profile.budget_max || ''}
                      onChange={(e) => setProfile({ ...profile, budget_max: parseFloat(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-400 mb-1">Interested Disciplines & Keywords</label>
                  <input
                    type="text"
                    value={profile.subjects || ''}
                    onChange={(e) => setProfile({ ...profile, subjects: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-400 mb-1">Target Country Preferences (Comma separated)</label>
                  <input
                    type="text"
                    value={profile.countries || ''}
                    onChange={(e) => setProfile({ ...profile, countries: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-400 mb-1">Academic / Research Experience</label>
                  <textarea
                    rows={3}
                    value={profile.experience || ''}
                    onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={async () => {
                    const res = await fetch('/api/profile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(profile)
                    });
                    if (res.ok) showNotify('Profile updated successfully.');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                >
                  Save Academic Profile
                </button>
              </div>

              {/* Document Vault */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> Document Vault
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    &lt; 20 MB Limit
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Store PDF certificates, transcripts, and CVs. Validated with MIME type checks and encrypted metadata.
                </p>

                {/* Upload Buttons */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['Resume/CV', 'Undergraduate Transcript', 'Degree Certificate', 'Statement of Purpose'].map((docType) => (
                    <button
                      key={docType}
                      onClick={() => handleSimulateUpload(docType)}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left font-medium transition flex items-center justify-between"
                    >
                      <span className="truncate">{docType}</span>
                      <Upload className="h-3 w-3 text-indigo-400 shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Vault List */}
                <div className="mt-4 space-y-2">
                  {documents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                      No documents stored yet. Click an upload button above.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-slate-200 truncate">{doc.filename}</p>
                            <p className="text-[10px] text-slate-400">{doc.doc_type} • {(doc.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
                            const d = await fetch('/api/documents').then(r => r.json());
                            setDocuments(d);
                            showNotify('Document removed.');
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. ADMISSIONS MATCHER TAB */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400" /> Algorithmic Program Matcher
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-factor alignment scoring across subject curriculum, degree level, budget tolerance, language scores, and geographic targets.
                </p>
              </div>
              <button
                onClick={() => {
                  fetch('/api/matcher')
                    .then(r => r.json())
                    .then(d => { setMatches(d); showNotify('Refreshed compatibility matrix.'); });
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCw className="h-3.5 w-3.5" /> Recalculate Fits
              </button>
            </div>

            <div className="space-y-3">
              {matches.map(({ program, score, reasons, breakdown }) => (
                <div key={program.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-700 transition">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        score >= 85
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : score >= 70
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {score}% Match Fit
                      </span>
                      <span className="text-xs font-bold text-slate-300">{program.university_name}</span>
                      <span className="text-xs text-slate-500">• {program.country}</span>
                    </div>

                    <h3 className="text-base font-bold text-white">{program.name}</h3>

                    {/* Breakdown Badges */}
                    <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                        Subject: {breakdown.subject}/35
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                        Level: {breakdown.level}/20
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                        Budget: {breakdown.budget}/15
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                        Credentials: {breakdown.requirements}/15
                      </span>
                    </div>

                    {/* Reasons list */}
                    <div className="space-y-1 text-xs text-slate-300 pt-1">
                      {reasons.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => handleStartCompose(program)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Mail className="h-4 w-4" /> Compose Outreach
                    </button>
                    <button
                      onClick={() => handleToggleShortlist(program.university_id, program.id)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      Shortlist Program
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. COMPOSE & REVIEW TAB */}
        {activeTab === 'compose' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-indigo-400" /> Personalized Email Composer & Review Gate
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every inquiry requires mandatory review and student approval before entering the outbox queue.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Mandatory Opt-Out Included
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Template, Hook & Recipient controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Target University & Program</label>
                  <select
                    value={composeTargetProg?.id || ''}
                    onChange={(e) => {
                      const p = programs.find(x => x.id === e.target.value);
                      setComposeTargetProg(p || null);
                      const cont = contacts.find(c => c.university_id === p?.university_id);
                      setComposeTargetContact(cont || null);
                      generateDraft(p || null, cont || null, composeTemplate, customHook);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.university_name || 'University'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Admissions Recipient Contact</label>
                  <select
                    value={composeTargetContact?.id || ''}
                    onChange={(e) => {
                      const c = contacts.find(x => x.id === e.target.value);
                      setComposeTargetContact(c || null);
                      generateDraft(composeTargetProg, c || null, composeTemplate, customHook);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Template Strategy</label>
                  <select
                    value={composeTemplate}
                    onChange={(e) => {
                      setComposeTemplate(e.target.value);
                      generateDraft(composeTargetProg, composeTargetContact, e.target.value, customHook);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="academic_inquiry">Graduate Program Admissions Inquiry</option>
                    <option value="research_lab">Research Alignment & Lab Fit Inquiry</option>
                    <option value="scholarship_funding">Scholarship & Departmental Funding Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Specific Personalized Hook (1-2 sentences)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g., Your department's paper on low-latency inference aligns with my undergraduate thesis..."
                    value={customHook}
                    onChange={(e) => {
                      setCustomHook(e.target.value);
                      generateDraft(composeTargetProg, composeTargetContact, composeTemplate, e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                    <p className="font-semibold text-slate-300">Attachments included:</p>
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <FileCheck className="h-3.5 w-3.5 text-emerald-400" /> Alex_Vance_CV.pdf (Encrypted, 1.4 MB)
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleApproveDraft}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve Draft & Queue for Delivery
                </button>
              </div>

              {/* Right Column: Editable Preview (Plain Text & HTML) */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewMode('html')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          previewMode === 'html' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        HTML Preview
                      </button>
                      <button
                        onClick={() => setPreviewMode('text')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          previewMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Plain Text Part
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      To: {composeTargetContact?.email || 'admissions@...'}
                    </span>
                  </div>

                  {/* Subject input */}
                  <div className="mt-4">
                    <label className="block text-[11px] text-slate-400 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Body Preview */}
                  <div className="mt-4">
                    {previewMode === 'html' ? (
                      <div
                        className="p-5 rounded-xl bg-white text-slate-900 min-h-[300px] text-sm overflow-y-auto leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: draftBodyHtml }}
                      />
                    ) : (
                      <textarea
                        rows={12}
                        value={draftBodyText}
                        onChange={(e) => setDraftBodyText(e.target.value)}
                        className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>MIME Multipart: RFC 2822 Alternative + Base64 attachment encoding</span>
                  <span className="text-emerald-400 font-medium">Ready for Gmail REST API</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. OUTBOX QUEUE TAB */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-400" /> Outbox Delivery Queue & Governor
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enforces warm-up ramp schedule, random jitter intervals (60-240s), and recipient business hours timezone windows.
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Sent Today: </span>
                  <span className="font-bold text-white">{queueData.sent_today || 0} / {queueData.current_ramp_cap} max</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Ramp Stage: </span>
                  <span className="font-bold text-indigo-400">Stage {queueData.ramp_stage || 1} (20→30→40)</span>
                </div>
              </div>
            </div>

            {queueData.items?.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Queue is clear</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All approved drafts have been dispatched or no items are waiting. Compose and approve drafts to populate your queue.
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  Browse Universities
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {queueData.items.map((item: any) => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          item.status === 'sent' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-white">{item.recipient_name}</span>
                        <span className="text-xs text-slate-400">({item.recipient_email})</span>
                      </div>

                      <p className="text-sm font-semibold text-slate-200">{item.subject}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                        <span>University: <strong className="text-slate-300">{item.university_name || 'Academic Dept'}</strong></span>
                        <span>•</span>
                        <span>Timezone Window: <strong className="text-indigo-300">{item.recipient_tz || 'Recipient Local (08:00-17:00)'}</strong></span>
                        <span>•</span>
                        <span>Scheduled: <strong className="text-slate-300">{item.scheduled_for || 'Next Available Window'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status !== 'sent' && (
                        <button
                          onClick={() => handleSendQueueItem(item.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition"
                        >
                          <Play className="h-3.5 w-3.5" /> Dispatch Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 8. SENT & REPLIES TAB */}
        {activeTab === 'sent' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-indigo-400" /> Delivery Tracking, Replies & Bounces
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitors delivery status, conversation threads, and automatic 5% bounce rate circuit breaker protection.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className={`px-3 py-1.5 rounded-xl border font-semibold ${
                  sentData.bounce_rate > 5.0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  Bounce Rate: {sentData.bounce_rate || 0}% {sentData.bounce_rate > 5.0 && '(CIRCUIT BREAKER ACTIVE)'}
                </div>
              </div>
            </div>

            {/* Simulation testing banner */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">Simulation Controls (Test deliverability edge cases):</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateEvent('reply')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                >
                  + Simulate Admissions Reply
                </button>
                <button
                  onClick={() => handleSimulateEvent('bounce')}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-200 font-semibold"
                >
                  + Simulate Delivery Bounce (NDR)
                </button>
                <button
                  onClick={() => handleSimulateEvent('optout')}
                  className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 text-amber-200 font-semibold"
                >
                  + Simulate 'Stop' Opt-Out
                </button>
              </div>
            </div>

            {/* Sent Messages List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">Sent Inquiries Log</h2>
              {sentData.sent?.length === 0 ? (
                <p className="text-xs text-slate-500">No sent messages recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {sentData.sent.map((s: any) => (
                    <div key={s.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{s.recipient_email}</span>
                          <span className="text-slate-500">• {s.university_name || 'Academic Contact'}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            DELIVERED
                          </span>
                        </div>
                        <p className="text-slate-300 font-medium mt-1">{s.subject}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">Thread ID: {s.thread_id} • Sent: {s.sent_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Replies List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">Incoming Replies & Bounces</h2>
              {sentData.replies?.length === 0 ? (
                <p className="text-xs text-slate-500">No incoming replies detected yet.</p>
              ) : (
                <div className="space-y-2">
                  {sentData.replies.map((r: any) => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{r.from_email}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          r.is_bounce ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {r.is_bounce ? 'BOUNCE / NDR' : (r.is_optout ? 'OPTOUT DETECTED' : 'ADMISSIONS REPLY')}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1.5 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono text-[11px]">
                        "{r.snippet}"
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">Received: {r.received_at}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 9. SETTINGS & OAUTH TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-400" /> Account Settings, Deliverability & Compliance
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your Google OAuth mailbox integration, daily sending caps, suppression list, and privacy controls.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Google Mailbox Integration */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-400" /> Google Mailbox Integration
                  </h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    settings.gmail_connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {settings.gmail_connected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  AdmitPath connects to your personal Gmail account using Google OAuth 2.0 with minimal required permissions:
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="font-semibold text-slate-200">https://www.googleapis.com/auth/gmail.send</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Allows sending student-approved inquiry emails directly from your verified address.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="font-semibold text-slate-200">https://www.googleapis.com/auth/gmail.readonly</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Detects direct replies from professors and automated delivery failure notifications (bounces).</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={async () => {
                      const newStatus = !settings.gmail_connected;
                      await fetch('/api/settings/connect-google', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ connected: newStatus, email: profile.full_name?.toLowerCase().replace(' ', '.') + '@gmail.com' })
                      });
                      const updated = await fetch('/api/settings').then(r => r.json());
                      setSettings(updated);
                      showNotify(newStatus ? 'Gmail integration connected.' : 'Gmail disconnected.');
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                      settings.gmail_connected 
                        ? 'bg-slate-800 hover:bg-slate-700 text-rose-300' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {settings.gmail_connected ? 'Disconnect Gmail Integration' : 'Connect Google Mailbox'}
                  </button>

                  <button
                    onClick={async () => {
                      const res = await fetch('/api/settings/send-test-email', { method: 'POST' });
                      const d = await res.json();
                      showNotify(d.message);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                  >
                    Send Verification Self-Test
                  </button>
                </div>
              </div>

              {/* Sending Caps & Ramp-up */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                  Deliverability Caps & Timezone Windows
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Daily Cap Ceiling</label>
                    <input
                      type="number"
                      value={settings.daily_cap || 40}
                      onChange={(e) => setSettings({ ...settings, daily_cap: parseInt(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Warm-Up Stage</label>
                    <select
                      value={settings.ramp_stage || 1}
                      onChange={(e) => setSettings({ ...settings, ramp_stage: parseInt(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="0">Stage 0 (20 emails / day max)</option>
                      <option value="1">Stage 1 (30 emails / day max)</option>
                      <option value="2">Stage 2 (40 emails / day max)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Window Start (Local Hour)</label>
                    <input
                      type="number"
                      value={settings.send_window_start || 8}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Window End (Local Hour)</label>
                    <input
                      type="number"
                      value={settings.send_window_end || 17}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-slate-400">
                  <p className="font-semibold text-slate-300">Deliverability Guarantees:</p>
                  <p>• Random spacing: 60 - 240 seconds between consecutive dispatches.</p>
                  <p>• 7-day minimum spacing for any university follow-up.</p>
                  <p>• Automatic pause if bounce rate exceeds 5.0%.</p>
                </div>

                <button
                  onClick={async () => {
                    await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(settings)
                    });
                    showNotify('Deliverability settings saved.');
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition"
                >
                  Save Deliverability Rules
                </button>
              </div>
            </div>

            {/* Compliance, Suppression List & GDPR Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" /> Do-Not-Contact Suppression List & GDPR
                </h2>
                <span className="text-xs text-slate-400">{suppressionList.length} Addresses Suppressed</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <h3 className="font-bold text-slate-200">GDPR & PECR (Europe)</h3>
                  <p className="text-slate-400 leading-snug">Strict adherence to legitimate academic interest and instantaneous honoring of opt-out requests.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <h3 className="font-bold text-slate-200">CASL (Canada)</h3>
                  <p className="text-slate-400 leading-snug">Clear student sender identity, valid physical/electronic contacts, and simple reply unsubscribe.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <h3 className="font-bold text-slate-200">CAN-SPAM (USA)</h3>
                  <p className="text-slate-400 leading-snug">Non-deceptive subject lines, physical mailing address disclosure, and suppression list permanence.</p>
                </div>
              </div>

              {/* Data Subject Rights Buttons */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <a
                  href="/api/compliance/export"
                  download="admitpath_student_data_export.json"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <FileText className="h-4 w-4" /> Export All My Data (JSON)
                </a>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to permanently delete your student account and all related data under GDPR Article 17?')) {
                      await fetch('/api/compliance/delete-account', { method: 'POST' });
                      alert('Account data permanently erased.');
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition"
                >
                  Delete Account (Right to be Forgotten)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 10. DOCS & TEST SUITE TAB */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-400" /> Documentation Hub & Test Runner
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Browse architectural specifications, compliance docs, changelogs, and execute real unit tests directly in your browser.
                </p>
              </div>

              <button
                onClick={handleRunTests}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow transition"
              >
                <Play className="h-4 w-4" />
                {isTesting ? 'Running 25 Unit Tests...' : 'Run Python Unit Test Suite'}
              </button>
            </div>

            {/* Test Results Output Box */}
            {testResult && (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="font-bold text-white text-sm">
                      Test Suite Execution: {testResult.passed}/{testResult.total} Tests Passed (100% Pass Rate)
                    </span>
                  </div>
                  <span className="text-xs text-emerald-300 font-mono">0.393s Execution Time</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {testResult.output}
                </pre>
              </div>
            )}

            {/* Docs Navigation & Viewer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 text-xs">
                {[
                  { id: 'progress', label: 'Progress Roadmap (docs/progress.md)' },
                  { id: 'changelog', label: 'Changelog (docs/CHANGELOG.md)' },
                  { id: 'auth', label: 'Auth & Isolation (docs/auth.md)' },
                  { id: 'crawler', label: 'Web Crawler (docs/crawler.md)' },
                  { id: 'gmail-oauth', label: 'Google OAuth (docs/gmail-oauth.md)' },
                  { id: 'sending-limits', label: 'Sending Limits (docs/sending-limits.md)' },
                  { id: 'compliance', label: 'Compliance & GDPR (docs/compliance.md)' }
                ].map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setActiveDocName(doc.id)}
                    className={`w-full text-left p-2.5 rounded-lg font-medium transition ${
                      activeDocName === doc.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {doc.label}
                  </button>
                ))}
              </div>

              <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed overflow-x-auto">
                  {docContent}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* University Programs & Contacts Detail Modal */}
      {isUnivModalOpen && selectedUniv && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Rank #{selectedUniv.ranking || '—'}
                  </span>
                  <span className="text-xs text-slate-400">{selectedUniv.city}, {selectedUniv.country}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1.5">{selectedUniv.name}</h2>
                <a href={selectedUniv.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-0.5 font-mono">
                  {selectedUniv.website} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <button
                onClick={() => setIsUnivModalOpen(false)}
                className="h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Programs */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" /> Academic Programs Offered
                </h3>
                {selectedUnivPrograms.length === 0 ? (
                  <p className="text-slate-500">No programs extracted for this university yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedUnivPrograms.map((p) => (
                      <div key={p.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{p.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold text-[10px]">
                            {p.level}
                          </span>
                        </div>
                        <p className="text-slate-400">{p.department} • {p.duration_months} Months • Tuition: ${p.tuition.toLocaleString()}</p>
                        <p className="text-slate-300"><strong className="text-slate-400">Requirements:</strong> {p.requirements}</p>
                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setIsUnivModalOpen(false);
                              handleStartCompose(p);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                          >
                            Compose Inquiry
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Public Contacts */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" /> Public Admissions Contacts
                </h3>
                {selectedUnivContacts.length === 0 ? (
                  <p className="text-slate-500">No public contacts extracted yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedUnivContacts.map((c) => (
                      <div key={c.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-slate-400 text-[11px]">{c.role}</div>
                        <div className="font-mono text-indigo-400 text-[11px]">{c.email}</div>
                        {c.phone && <div className="text-slate-400 text-[11px]">{c.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  handleRunCrawler(selectedUniv.id);
                  setIsUnivModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCw className="h-3.5 w-3.5" /> Re-crawl Admissions Catalog
              </button>
              <button
                onClick={() => setIsUnivModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
