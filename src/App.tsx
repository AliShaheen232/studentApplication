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
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Globe,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Menu,
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
  FileCheck,
  Activity,
  Check,
  Shield,
  KeyRound,
  CreditCard
} from 'lucide-react';

import PublicWebsite from './components/PublicWebsite';
import AdminDashboard from './components/AdminDashboard';
import StudentProfile from './components/StudentProfile';
import GmailTab from './components/GmailTab';
import StartSendingModal from './components/StartSendingModal';

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
  application_mode?: string;
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
  // Mode & Role State
  const [appMode, setAppMode] = useState<'app' | 'public'>('app');
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student');

  // Student Navigation Tab
  const [activeTab, setActiveTab] = useState<
    | 'daily'
    | 'search'
    | 'programs'
    | 'compose'
    | 'queue'
    | 'gmail'
    | 'matches'
    | 'profile'
    | 'settings'
  >('daily');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data States
  const [universities, setUniversities] = useState<University[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [shortlists, setShortlists] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [queueData, setQueueData] = useState<any>({
    items: [],
    daily_cap: 25,
    monthly_cap: 400,
    plan_name: 'Scholar Pro',
    sent_today: 0,
    remaining_daily_quota: 25,
  });
  const [sentData, setSentData] = useState<any>({
    sent: [],
    replies: [],
    bounce_rate: 0,
  });
  const [profile, setProfile] = useState<any>({
    full_name: 'Alex Vance',
    nationality: 'Indonesia',
    country_of_residence: 'Indonesia',
    gpa: 3.86,
    max_gpa: 4.0,
    qualification: 'Bachelor of Science in Computer Science',
    target_level: 'Master',
    intake_term: 'Fall 2026',
    subjects: 'Computer Science, Data Science & AI',
    countries: 'USA, United Kingdom, Germany, Canada',
    preferred_universities: 'MIT, Stanford, Oxford, TU Munich',
    budget_max: 45000,
    ielts_score: 7.5,
    toefl_score: 105,
    experience: '2 years applied software engineering and undergraduate ML research assistant',
    academic_achievements: "Dean's List for 6 semesters, Regional IEEE paper author",
    additional_preferences: 'Departmental Graduate Assistantship desired',
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    daily_cap: 25,
    ramp_stage: 1,
    gmail_connected: 1,
    gmail_email: 'alex.scholar@gmail.com',
  });
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [suppressionList, setSuppressionList] = useState<any[]>([]);

  // Modals & Selections
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [selectedUnivPrograms, setSelectedUnivPrograms] = useState<Program[]>([]);
  const [selectedUnivContacts, setSelectedUnivContacts] = useState<Contact[]>([]);
  const [isUnivModalOpen, setIsUnivModalOpen] = useState(false);
  const [isStartSendingOpen, setIsStartSendingOpen] = useState(false);

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
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  // Status Notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // Initial Data Fetching
  const fetchAllData = async () => {
    try {
      const headers = { 'x-impersonate-role': userRole };
      const [
        uRes,
        pRes,
        cRes,
        profRes,
        docsRes,
        slRes,
        drRes,
        qRes,
        sRes,
        settRes,
        suppRes,
      ] = await Promise.all([
        fetch('/api/universities'),
        fetch('/api/programs'),
        fetch('/api/contacts'),
        fetch('/api/profile', { headers }),
        fetch('/api/documents', { headers }),
        fetch('/api/shortlists', { headers }),
        fetch('/api/drafts', { headers }),
        fetch('/api/queue', { headers }),
        fetch('/api/sent', { headers }),
        fetch('/api/gmail/status', { headers }),
        fetch('/api/compliance/suppression', { headers }),
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
      if (settRes.ok) {
        const gmData = await settRes.json();
        setSettings({
          daily_cap: queueData.daily_cap || 25,
          gmail_connected: gmData.connected ? 1 : 0,
          gmail_email: gmData.email,
        });
      }
      if (suppRes.ok) setSuppressionList(await suppRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userRole]);

  // Fetch matches whenever user opens matches tab
  useEffect(() => {
    if (activeTab === 'matches') {
      fetch('/api/matcher', { headers: { 'x-impersonate-role': userRole } })
        .then((r) => r.json())
        .then((data) => setMatches(data))
        .catch(console.error);
    }
  }, [activeTab, userRole]);

  // University Detail Modal
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
        headers: { 'Content-Type': 'application/json', 'x-impersonate-role': userRole },
        body: JSON.stringify({ university_id: univId, program_id: progId }),
      });
      if (res.ok) {
        showNotify('Added to Academic Shortlist.');
        const sl = await fetch('/api/shortlists', { headers: { 'x-impersonate-role': userRole } }).then((r) => r.json());
        setShortlists(sl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run polite crawler with SSRF defense
  const handleRunCrawler = async (univId: string) => {
    showNotify('Dispatching polite web crawler (robots.txt validation & SSRF policy checked)...');
    try {
      const res = await fetch('/api/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-impersonate-role': userRole },
        body: JSON.stringify({ university_id: univId }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotify(data.message);
        fetchAllData();
      } else {
        showNotify('Crawler blocked: ' + data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Prepare Compose
  const handleStartCompose = (prog: Program) => {
    setComposeTargetProg(prog);
    const targetContact =
      contacts.find((c) => c.university_id === prog.university_id) || contacts[0];
    setComposeTargetContact(targetContact || null);
    setActiveTab('compose');
    generateDraft(prog, targetContact, composeTemplate, customHook);
  };

  const generateDraft = async (
    prog: Program | null,
    cont: Contact | null,
    tpl: string,
    hookText: string
  ) => {
    if (!prog) return;
    try {
      const res = await fetch('/api/compose/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-impersonate-role': userRole },
        body: JSON.stringify({
          program_id: prog.id,
          contact_id: cont?.id,
          template_key: tpl,
          custom_hook: hookText,
        }),
      });
      const data = await res.json();
      setDraftSubject(data.subject);
      setDraftBodyText(data.body_text);
      setDraftBodyHtml(data.body_html);
      setPortalNotice(data.portal_notice || null);
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Draft and Push to Outbox Queue
  const handleApproveDraft = async () => {
    if (!composeTargetProg) return;
    try {
      const saveRes = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-impersonate-role': userRole },
        body: JSON.stringify({
          program_id: composeTargetProg.id,
          contact_id: composeTargetContact?.id,
          template_key: composeTemplate,
          subject: draftSubject,
          body_text: draftBodyText,
          body_html: draftBodyHtml,
          hook: customHook,
        }),
      });
      const saveData = await saveRes.json();
      if (saveData.draft_id) {
        const appRes = await fetch(`/api/drafts/${saveData.draft_id}/approve`, {
          method: 'POST',
          headers: { 'x-impersonate-role': userRole }
        });
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
      const res = await fetch(`/api/queue/${itemId}/send-now`, {
        method: 'POST',
        headers: { 'x-impersonate-role': userRole }
      });
      const data = await res.json();
      if (res.ok) {
        showNotify(data.message);
        fetchAllData();
      } else {
        showNotify(`Delivery blocked: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Document Vault Actions
  const handleUploadDoc = async (docType: string, filename: string, size: number, mimeType: string) => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-impersonate-role': userRole },
      body: JSON.stringify({
        doc_type: docType,
        filename,
        file_size: size,
        mime_type: mimeType
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }
    const updated = await fetch('/api/documents', { headers: { 'x-impersonate-role': userRole } }).then(r => r.json());
    setDocuments(updated);
  };

  const handleDeleteDoc = async (docId: string) => {
    await fetch(`/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'x-impersonate-role': userRole }
    });
    const updated = await fetch('/api/documents', { headers: { 'x-impersonate-role': userRole } }).then(r => r.json());
    setDocuments(updated);
    showNotify('Document removed from vault.');
  };

  // Filter Universities
  const filteredUniversities = universities.filter((u) => {
    if (selectedCountry !== 'all' && u.country.toLowerCase() !== selectedCountry.toLowerCase())
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchCity = u.city.toLowerCase().includes(q);
      const matchDomain = u.domain.toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchDomain) return false;
    }
    if (maxBudgetFilter && u.tuition_min > parseFloat(maxBudgetFilter))
      return false;
    return true;
  });

  // If in Public Website Mode, render the full public SaaS marketing portal
  if (appMode === 'public') {
    return (
      <PublicWebsite
        onSignInClick={() => setAppMode('app')}
        onSelectPlan={(planId) => {
          showNotify(`Selected plan ${planId}. Opening sign-in to complete subscription.`);
          setAppMode('app');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-800 flex font-sans selection:bg-emerald-700 selection:text-white antialiased">
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`
        fixed lg:sticky top-0 h-screen z-50 flex flex-col justify-between shrink-0
        bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-56' : 'w-20'}
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        <div>
          {/* Brand Header */}
          <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 rounded text-slate-700 hover:text-slate-900 transition"
                title="Toggle sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <div className="h-7 w-7 shrink-0 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-xs">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                {isSidebarOpen && (
                  <span className="font-serif-editorial text-lg font-bold tracking-tight text-slate-900 truncate">
                    AdminPath
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Links for Students */}
          {userRole === 'student' ? (
            <div className="p-3 space-y-1">
              {[
                { id: 'daily', label: 'Daily', icon: Activity },
                { id: 'search', label: 'Discover', icon: Search },
                { id: 'programs', label: 'Programmes', icon: GraduationCap },
                { id: 'compose', label: 'Emails', icon: Mail },
                {
                  id: 'queue',
                  label: 'Outbox',
                  icon: Send,
                  badge: queueData.items?.filter((i: any) => i.status === 'pending')?.length,
                },
                { id: 'gmail', label: 'Gmail Account', icon: KeyRound },
                { id: 'matches', label: 'Matches', icon: Sparkles },
                { id: 'profile', label: 'Profile', icon: UserCheck },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileSidebarOpen(false);
                    }}
                    title={!isSidebarOpen ? tab.label : undefined}
                    className={`w-full flex items-center ${
                      isSidebarOpen ? 'justify-between px-3 py-2' : 'justify-center p-2'
                    } rounded-lg text-xs font-normal transition-all group ${
                      isActive
                        ? 'border border-[#047857] bg-[#f0fdf4] text-[#064e3b] font-medium shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-[#047857]' : 'text-slate-500 group-hover:text-slate-700'
                        }`}
                        strokeWidth={1.6}
                      />
                      {isSidebarOpen && <span className="truncate">{tab.label}</span>}
                    </div>
                    {typeof tab.badge === 'number' && tab.badge > 0 && isSidebarOpen && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Admin Sidebar Navigation */
            <div className="p-3 space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administrator
              </div>
              <div className="px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                Admin Console Active
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {isSidebarOpen ? (
            <div className="text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>{userRole === 'admin' ? 'Admin Master' : 'Student Mode'}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              </div>
              <p className="truncate text-slate-400">
                {userRole === 'admin' ? 'System Oversight' : `${queueData.plan_name || 'Scholar Pro'} • ${profile.full_name || 'Alex'}`}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="px-6 lg:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="font-serif-editorial text-2xl font-normal text-slate-900 tracking-tight">
              {userRole === 'admin'
                ? 'Administrator Dashboard & Provisioning'
                : {
                    daily: 'Daily Overview',
                    search: 'Discover (Global Institutions)',
                    programs: 'Academic Programmes Catalog',
                    compose: 'Personalized Email Generation',
                    queue: 'Application Outbox & Queue',
                    gmail: 'Gmail Account Integration',
                    matches: 'Admissions Fit Matcher',
                    profile: 'Student Academic Profile',
                    settings: 'Account Settings & Preferences',
                  }[activeTab] || 'Daily'}
            </h1>
          </div>

          {/* Quick Role & Mode Switcher + Start Sending CTA */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {notification && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-xs">
                <span>{notification}</span>
                <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-900">
                  ✕
                </button>
              </div>
            )}

            {/* Role Switcher Pill */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setUserRole('student')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  userRole === 'student' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student View
              </button>
              <button
                onClick={() => setUserRole('admin')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  userRole === 'admin' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin View
              </button>
              <button
                onClick={() => setAppMode('public')}
                className="px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
                title="View public landing & pricing website"
              >
                <Globe className="h-3 w-3" />
                Public Site
              </button>
            </div>

            {/* Start Sending Button in Header for Student */}
            {userRole === 'student' && (
              <button
                onClick={() => setIsStartSendingOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Start Sending ({queueData.remaining_daily_quota ?? 25} left)
              </button>
            )}
          </div>
        </header>

        {/* Tab Contents */}
        <main className="flex-1 px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ADMINISTRATOR DASHBOARD VIEW */}
          {userRole === 'admin' ? (
            <AdminDashboard onNotify={showNotify} />
          ) : (
            /* STUDENT VIEWS */
            <>
              {/* 1. DAILY DASHBOARD TAB */}
              {activeTab === 'daily' && (
                <div className="space-y-6">
                  {/* Latest Day Stats Bar */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold text-slate-900">
                        Admissions Outreach Snapshot ({new Date().toISOString().slice(0, 10)})
                      </h2>
                      <span className="text-xs text-slate-500">
                        Subscription: <strong className="text-slate-800">{queueData.plan_name || 'Scholar Pro'}</strong> ({queueData.remaining_daily_quota} / {queueData.daily_cap} quota today)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                        <div className="text-2xl font-bold text-slate-900 leading-none">
                          {universities.length}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                          universities indexed
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                        <div className="text-2xl font-bold text-slate-900 leading-none">
                          {programs.length}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                          programmes catalogued
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                        <div className="text-2xl font-bold text-slate-900 leading-none">
                          {contacts.length}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                          verified admissions desks
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                        <div className="text-2xl font-bold text-[#047857] leading-none">
                          {queueData.sent_today || 0}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                          dispatched today
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                        <div className="text-2xl font-bold text-emerald-800 leading-none">
                          {queueData.remaining_daily_quota ?? 25}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                          daily quota remaining
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                        <div className="text-2xl font-bold text-slate-900 leading-none">
                          {queueData.items?.filter((i: any) => i.status === 'pending')?.length || 0}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                          approved in queue
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Banner */}
                  <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">Ready to Send Applications?</h3>
                      <p className="text-xs text-slate-600 max-w-xl">
                        Review your personalized AI email drafts, verify recipient contact details, and click Start Sending to dispatch through your connected Gmail account.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('compose')}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        Draft New Inquiry
                      </button>
                      <button
                        onClick={() => setIsStartSendingOpen(true)}
                        className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-xs transition flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Start Sending
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DISCOVER UNIVERSITIES TAB */}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search universities, countries or cities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="all">All 16 Countries</option>
                        <option value="USA">USA</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Germany">Germany</option>
                        <option value="Netherlands">Netherlands</option>
                        <option value="France">France</option>
                        <option value="Australia">Australia</option>
                        <option value="South Korea">South Korea</option>
                        <option value="Indonesia">Indonesia</option>
                      </select>

                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {filteredUniversities.length} institutions
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredUniversities.map((univ) => {
                      const isShortlisted = shortlists.some((s) => s.university_id === univ.id);
                      return (
                        <div
                          key={univ.id}
                          className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-500">Rank #{univ.ranking || '—'}</span>
                              <span className="text-slate-500 flex items-center gap-1 font-medium">{univ.country}</span>
                            </div>

                            <h3 className="font-serif-editorial text-base font-bold text-slate-900 mt-2 leading-snug">
                              {univ.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{univ.city}</p>

                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Tuition:</span>
                                <span className="font-medium text-slate-800">
                                  ${univ.tuition_min.toLocaleString()} – ${univ.tuition_max.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Domain:</span>
                                <span className="font-mono text-[11px] text-slate-600">{univ.domain}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                            <button
                              onClick={() => handleOpenUnivModal(univ)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition"
                            >
                              View Catalog
                            </button>
                            <button
                              onClick={() => handleToggleShortlist(univ.id)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                                isShortlisted
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {isShortlisted ? 'Saved ★' : 'Save'}
                            </button>
                            <button
                              onClick={() => handleRunCrawler(univ.id)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
                              title="Crawl Catalog (SSRF Protected)"
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

              {/* 3. PROGRAMMES CATALOG TAB (Renamed from Leads / Site Check) */}
              {activeTab === 'programs' && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                    <div>
                      <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                        Verified Academic Programmes
                      </h3>
                      <p className="text-xs text-slate-500">
                        Discovered degrees with tuition schedules, admissions portals, and direct inquiry links
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                      {programs.length} programmes catalogued
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {programs.map((p) => {
                      const isPortalOnly = p.application_mode === 'portal_only';
                      return (
                        <div
                          key={p.id}
                          className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {p.level}
                              </span>
                              <span className="text-slate-400 font-medium">{p.country || 'International'}</span>
                            </div>

                            <h4 className="font-serif-editorial text-sm font-bold text-slate-900 mt-2 leading-snug">
                              {p.name}
                            </h4>
                            <p className="text-xs text-emerald-800 font-medium mt-0.5">{p.university_name}</p>

                            <div className="mt-2 text-xs text-slate-600 space-y-1">
                              <div>
                                <span className="text-slate-400">Department:</span> {p.department}
                              </div>
                              <div>
                                <span className="text-slate-400">Tuition:</span> ${p.tuition?.toLocaleString()}
                              </div>
                              <div>
                                <span className="text-slate-400">Deadline:</span> {p.deadline}
                              </div>
                              {isPortalOnly && (
                                <div className="mt-2 p-1.5 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-900 font-medium">
                                  Official admissions portal submission required.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleStartCompose(p)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-medium transition"
                            >
                              Create AI Draft
                            </button>
                            {p.program_url && (
                              <a
                                href={p.program_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900"
                                title="Open Official Programme Website"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. EMAILS & AI DRAFT COMPOSER TAB */}
              {activeTab === 'compose' && (
                <div className="space-y-5">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Personalized Application Inquiries</h3>
                      <p className="text-xs text-slate-500">
                        AI drafts bespoke inquiries combining your verified academic background with program curriculum
                      </p>
                    </div>

                    <button
                      onClick={() => setIsStartSendingOpen(true)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-xs transition flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Start Sending ({queueData.remaining_daily_quota ?? 25} left today)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Controls */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-1 font-medium">Target Academic Programme</label>
                        <select
                          value={composeTargetProg?.id || ''}
                          onChange={(e) => {
                            const p = programs.find((x) => x.id === e.target.value);
                            setComposeTargetProg(p || null);
                            const c = contacts.find((cnt) => cnt.university_id === p?.university_id);
                            setComposeTargetContact(c || null);
                            generateDraft(p || null, c || null, composeTemplate, customHook);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
                        >
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 mb-1 font-medium">Inquiry Strategy</label>
                        <select
                          value={composeTemplate}
                          onChange={(e) => {
                            setComposeTemplate(e.target.value);
                            generateDraft(composeTargetProg, composeTargetContact, e.target.value, customHook);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
                        >
                          <option value="academic_inquiry">Graduate Program Admissions Inquiry</option>
                          <option value="research_lab">Research Alignment & Lab Fit Inquiry</option>
                          <option value="scholarship_funding">Scholarship & Departmental Funding Inquiry</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 mb-1 font-medium">Bespoke Research Hook</label>
                        <textarea
                          rows={3}
                          placeholder="Reference specific departmental lab work or professors..."
                          value={customHook}
                          onChange={(e) => {
                            setCustomHook(e.target.value);
                            generateDraft(composeTargetProg, composeTargetContact, composeTemplate, e.target.value);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
                        />
                      </div>

                      {portalNotice && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1">
                          <span className="font-semibold block flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            Portal Notice
                          </span>
                          {portalNotice}
                        </div>
                      )}

                      <button
                        onClick={handleApproveDraft}
                        className="w-full py-2.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs transition shadow-2xs"
                      >
                        Approve Draft & Queue for Sending
                      </button>
                    </div>

                    {/* Preview Box */}
                    <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewMode('html')}
                            className={`px-2.5 py-1 rounded text-xs font-medium ${
                              previewMode === 'html' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            Formatted Preview
                          </button>
                          <button
                            onClick={() => setPreviewMode('text')}
                            className={`px-2.5 py-1 rounded text-xs font-medium ${
                              previewMode === 'text' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            Plain Text
                          </button>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          To: {composeTargetContact?.email || 'admissions@university.edu'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
                        <input
                          type="text"
                          value={draftSubject}
                          onChange={(e) => setDraftSubject(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800"
                        />
                      </div>

                      <div>
                        {previewMode === 'html' ? (
                          <div
                            className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800 max-h-96 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: draftBodyHtml }}
                          />
                        ) : (
                          <textarea
                            rows={12}
                            value={draftBodyText}
                            onChange={(e) => setDraftBodyText(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. OUTBOX QUEUE TAB */}
              {activeTab === 'queue' && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                        Outbox Queue & Timezone Safeguards
                      </h3>
                      <p className="text-xs text-slate-500">
                        Randomized 60–240s send jitter • 08:00–17:00 recipient local business hours
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 font-medium">
                        Sent today: {queueData.sent_today || 0} / {queueData.daily_cap || 25}
                      </span>
                      <button
                        onClick={() => setIsStartSendingOpen(true)}
                        className="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Start Sending
                      </button>
                    </div>
                  </div>

                  {queueData.items?.length === 0 ? (
                    <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center text-xs text-slate-500">
                      Outbox queue is empty. Explore programmes and approve drafts to begin sending.
                    </div>
                  ) : (
                    queueData.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{item.recipient_name}</span>
                            <span className="text-slate-400">({item.recipient_email})</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                item.status === 'sent'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : item.status === 'failed'
                                  ? 'bg-rose-50 text-rose-800'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 font-medium">{item.subject}</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">Timezone window: {item.recipient_tz}</p>
                        </div>

                        {item.status !== 'sent' && (
                          <button
                            onClick={() => handleSendQueueItem(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-medium"
                          >
                            Send Now
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 6. DEDICATED GMAIL ACCOUNT TAB */}
              {activeTab === 'gmail' && (
                <GmailTab onNotify={showNotify} />
              )}

              {/* 7. ADMISSIONS FIT MATCHER TAB */}
              {activeTab === 'matches' && (
                <div className="space-y-3">
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                    <div>
                      <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                        Academic Program Compatibility Ranking
                      </h3>
                      <p className="text-xs text-slate-500">
                        Scored dynamically against your verified profile (GPA, Target Degree, Discipline, Budget)
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        fetch('/api/matcher', { headers: { 'x-impersonate-role': userRole } })
                          .then((r) => r.json())
                          .then((d) => {
                            setMatches(d);
                            showNotify('Recalculated program fits.');
                          });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                    >
                      Recalculate Fits
                    </button>
                  </div>

                  {matches.map(({ program, score, reasons, breakdown }) => (
                    <div
                      key={program.id}
                      className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              score >= 85
                                ? 'bg-emerald-50 text-[#047857] border border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {score}% Match
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">{program.name}</span>
                          <span className="text-xs text-slate-400">• {program.university_name}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                          <span>Curriculum: {breakdown.subject}/35</span>
                          <span>•</span>
                          <span>Level: {breakdown.level}/20</span>
                          <span>•</span>
                          <span>Budget: {breakdown.budget}/15</span>
                          <span>•</span>
                          <span>GPA: {breakdown.requirements}/15</span>
                        </div>

                        <div className="space-y-0.5 text-xs text-slate-600 pt-1">
                          {reasons.slice(0, 2).map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-[#047857]" /> {r}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartCompose(program)}
                        className="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-medium text-xs whitespace-nowrap"
                      >
                        Draft Outreach
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 8. STUDENT PROFILE TAB (STRICTLY READ-ONLY) */}
              {activeTab === 'profile' && (
                <StudentProfile
                  profile={profile}
                  documents={documents}
                  onUploadDoc={handleUploadDoc}
                  onDeleteDoc={handleDeleteDoc}
                  onNotify={showNotify}
                />
              )}

              {/* 9. SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
                    <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                      Deliverability Safeguards
                    </h3>
                    <div className="space-y-2 text-slate-600">
                      <div className="flex justify-between p-2 bg-slate-50 rounded">
                        <span>Timezone Business Hours:</span>
                        <strong className="text-slate-800">08:00 – 17:00 Local</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50 rounded">
                        <span>Follow-Up Minimum Spacing:</span>
                        <strong className="text-slate-800">7 Days Per Contact</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50 rounded">
                        <span>Bounce Circuit Breaker:</span>
                        <strong className="text-emerald-700">Auto-Pause if &gt; 5.0%</strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
                    <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                      Compliance & Do-Not-Contact List
                    </h3>
                    <p className="text-slate-500">
                      Permanent suppression list enforced across all queues and campaigns.
                    </p>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {suppressionList.map((sup: any) => (
                        <div key={sup.id} className="py-2 flex justify-between items-center">
                          <span className="font-mono text-slate-700">{sup.email}</span>
                          <span className="text-[10px] text-slate-400">{sup.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* START SENDING MODAL */}
      <StartSendingModal
        isOpen={isStartSendingOpen}
        onClose={() => setIsStartSendingOpen(false)}
        queueData={queueData}
        gmailConnected={!!settings.gmail_connected}
        onDispatchComplete={() => {
          fetchAllData();
        }}
        onNotify={showNotify}
      />

      {/* University Detail Modal */}
      {isUnivModalOpen && selectedUniv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedUniv.name}</h3>
                <p className="text-xs text-slate-500">{selectedUniv.city}, {selectedUniv.country} • Rank #{selectedUniv.ranking || '—'}</p>
              </div>
              <button onClick={() => setIsUnivModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Available Degree Programmes ({selectedUnivPrograms.length})</h4>
                <div className="space-y-2">
                  {selectedUnivPrograms.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-slate-500">{p.level} • ${p.tuition?.toLocaleString()} • Deadline: {p.deadline}</div>
                      </div>
                      <button
                        onClick={() => {
                          setIsUnivModalOpen(false);
                          handleStartCompose(p);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#047857] text-white text-xs font-medium"
                      >
                        Draft Inquiry
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Verified Admissions Contacts ({selectedUnivContacts.length})</h4>
                <div className="space-y-1.5">
                  {selectedUnivContacts.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex justify-between">
                      <div>
                        <span className="font-medium text-slate-800">{c.name}</span>
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">{c.email}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{c.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
