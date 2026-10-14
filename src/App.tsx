import React, { useState, useEffect } from "react";
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
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<
    | "daily"
    | "search"
    | "programs"
    | "contacts"
    | "profile"
    | "matches"
    | "compose"
    | "queue"
    | "sent"
    | "settings"
    | "docs"
  >("daily");
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
    daily_cap: 40,
    current_ramp_cap: 20,
    sent_today: 0,
  });
  const [sentData, setSentData] = useState<any>({
    sent: [],
    replies: [],
    bounce_rate: 0,
  });
  const [profile, setProfile] = useState<any>({
    full_name: "Alex Vance",
    nationality: "International",
    gpa: 3.86,
    max_gpa: 4.0,
    target_level: "Master",
    subjects: "Computer Science, Data Science & AI",
    countries: "USA, United Kingdom, Germany, Canada",
    budget_max: 45000,
    ielts_score: 7.5,
    toefl_score: 105,
    experience:
      "2 years applied software engineering and undergraduate ML research assistant",
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    daily_cap: 40,
    ramp_stage: 1,
    gmail_connected: 1,
    gmail_email: "alex.scholar@gmail.com",
  });
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [suppressionList, setSuppressionList] = useState<any[]>([]);

  // Modals & Active Selections
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [selectedUnivPrograms, setSelectedUnivPrograms] = useState<Program[]>(
    [],
  );
  const [selectedUnivContacts, setSelectedUnivContacts] = useState<Contact[]>(
    [],
  );
  const [isUnivModalOpen, setIsUnivModalOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [maxBudgetFilter, setMaxBudgetFilter] = useState("");

  // Composer State
  const [composeTargetProg, setComposeTargetProg] = useState<Program | null>(
    null,
  );
  const [composeTargetContact, setComposeTargetContact] =
    useState<Contact | null>(null);
  const [composeTemplate, setComposeTemplate] = useState("academic_inquiry");
  const [customHook, setCustomHook] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBodyText, setDraftBodyText] = useState("");
  const [draftBodyHtml, setDraftBodyHtml] = useState("");
  const [previewMode, setPreviewMode] = useState<"text" | "html">("html");

  // Docs & Test state
  const [activeDocName, setActiveDocName] = useState("progress");
  const [docContent, setDocContent] = useState("");
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
        fetch("/api/universities"),
        fetch("/api/programs"),
        fetch("/api/contacts"),
        fetch("/api/profile"),
        fetch("/api/documents"),
        fetch("/api/shortlists"),
        fetch("/api/drafts"),
        fetch("/api/queue"),
        fetch("/api/sent"),
        fetch("/api/settings"),
        fetch("/api/compliance/suppression"),
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
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch matches whenever user opens matches tab
  useEffect(() => {
    if (activeTab === "matches") {
      fetch("/api/matcher")
        .then((r) => r.json())
        .then((data) => setMatches(data))
        .catch(console.error);
    }
  }, [activeTab]);

  // Fetch documentation when doc tab opens or doc name changes
  useEffect(() => {
    if (activeTab === "docs") {
      fetch(`/api/docs/${activeDocName}`)
        .then((r) => r.json())
        .then((d) => setDocContent(d.content || ""))
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
      const res = await fetch("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ university_id: univId, program_id: progId }),
      });
      if (res.ok) {
        showNotify("Added to Academic Shortlist.");
        const sl = await fetch("/api/shortlists").then((r) => r.json());
        setShortlists(sl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run live crawler
  const handleRunCrawler = async (univId: string) => {
    showNotify(
      "Dispatching polite web crawler (robots.txt validation & rate limits)...",
    );
    try {
      const res = await fetch("/api/crawler/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ university_id: univId }),
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
    const targetContact =
      contacts.find((c) => c.university_id === prog.university_id) ||
      contacts[0];
    setComposeTargetContact(targetContact || null);
    setActiveTab("compose");
    generateDraft(prog, targetContact, composeTemplate, customHook);
  };

  const generateDraft = async (
    prog: Program | null,
    cont: Contact | null,
    tpl: string,
    hookText: string,
  ) => {
    if (!prog) return;
    try {
      const res = await fetch("/api/compose/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Draft and Push to Outbox Queue
  const handleApproveDraft = async () => {
    if (!composeTargetProg) return;
    try {
      const saveRes = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          method: "POST",
        });
        const appData = await appRes.json();
        if (appRes.ok) {
          showNotify(appData.message);
          fetchAllData();
          setActiveTab("queue");
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
        method: "POST",
      });
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
  const handleSimulateEvent = async (type: "reply" | "bounce" | "optout") => {
    try {
      const res = await fetch("/api/replies/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          from_email: "admissions@ox.ac.uk",
          snippet:
            type === "bounce"
              ? "Mail delivery failed: 550 5.1.1 User unknown"
              : type === "optout"
                ? "Please stop contacting our departmental inbox."
                : "Thank you. We have received your CV.",
        }),
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
      const res = await fetch("/api/tests/run");
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
      "Resume/CV": "Alex_Vance_CV.pdf",
      "Undergraduate Transcript": "Academic_Transcript_Official.pdf",
      "Degree Certificate": "Bachelor_Engineering_Degree.pdf",
      "Statement of Purpose": "Motivation_Letter_Research_Focus.pdf",
    };
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type: docType,
          filename: defaultFilenames[docType] || "document.pdf",
          file_size: 1420500,
          mime_type: "application/pdf",
        }),
      });
      if (res.ok) {
        showNotify(`${docType} encrypted & verified (<20MB limit honored).`);
        const docs = await fetch("/api/documents").then((r) => r.json());
        setDocuments(docs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUniversities = universities.filter((u) => {
    if (
      selectedCountry !== "all" &&
      u.country.toLowerCase() !== selectedCountry.toLowerCase()
    )
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !u.name.toLowerCase().includes(q) &&
        !u.city.toLowerCase().includes(q) &&
        !u.country.toLowerCase().includes(q)
      )
        return false;
    }
    if (maxBudgetFilter && u.tuition_min > parseFloat(maxBudgetFilter))
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-800 flex font-sans selection:bg-emerald-700 selection:text-white antialiased">
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Left Sidebar (AdminPath Light Editorial Style) */}
      <aside
        className={`
        fixed lg:sticky top-0 h-screen z-50 flex flex-col justify-between shrink-0
        bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "w-56" : "w-20"}
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div>
          {/* Brand Header */}
          <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 rounded text-slate-700 hover:text-slate-900 transition"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <div className="h-7 w-7 shrink-0 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-xs">
                  <Shield className="h-3.5 w-3.5" />
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

          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            {[
              { id: "daily", label: "Daily", icon: Activity },
              { id: "search", label: "Discover", icon: Search },
              { id: "programs", label: "Site check", icon: ShieldCheck },
              { id: "contacts", label: "Leads", icon: Users },
              { id: "compose", label: "Emails", icon: Mail },
              {
                id: "queue",
                label: "Outbox",
                icon: Send,
                badge: queueData.items?.length,
              },
              {
                id: "sent",
                label: "WhatsApp",
                icon: Inbox,
                badge: sentData.sent?.length,
              },
              { id: "matches", label: "Matches", icon: Sparkles },
              { id: "profile", label: "Profile", icon: UserCheck },
              { id: "settings", label: "Settings", icon: Settings },
              { id: "docs", label: "Docs & Tests", icon: BookOpen },
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
                  className={`w-full flex items-center ${isSidebarOpen ? "justify-between px-3 py-2" : "justify-center p-2"} rounded-lg text-xs font-normal transition-all group ${
                    isActive
                      ? "border border-[#047857] bg-[#f0fdf4] text-[#064e3b] font-medium shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? "text-[#047857]" : "text-slate-500 group-hover:text-slate-700"}`}
                      strokeWidth={1.6}
                    />
                    {isSidebarOpen && (
                      <span className="truncate">{tab.label}</span>
                    )}
                  </div>
                  {typeof tab.badge === "number" &&
                    tab.badge > 0 &&
                    isSidebarOpen && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tab.badge}
                      </span>
                    )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {isSidebarOpen ? (
            <div className="text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>AdmitPath Engine</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              </div>
              <p className="truncate text-slate-400">
                Cap {queueData.current_ramp_cap}/d •{" "}
                {profile.full_name || "Alex"}
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
        <header className="px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="font-serif-editorial text-2xl font-normal text-slate-900 tracking-tight">
              {{
                daily: "Daily",
                search: "Discover (University Directory)",
                programs: "Site Check (Programs Catalog)",
                contacts: "Leads (Admissions Contacts)",
                profile: "Student Profile & Document Vault",
                matches: "Admissions Fit Matcher",
                compose: "Email Composer & Review",
                queue: "Outbox Delivery Queue",
                sent: "Replies & Delivery Status",
                settings: "Settings & Mailbox Connect",
                docs: "Documentation Hub & Test Suite",
              }[activeTab] || "Daily"}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {notification && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-xs">
                <span>{notification}</span>
                <button
                  onClick={() => setNotification(null)}
                  className="text-emerald-600 hover:text-emerald-900"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span>Queue: {queueData.sent_today || 0} sent today</span>
            </div>
          </div>
        </header>

        {/* Tab Contents */}
        <main className="flex-1 px-8 pb-12 max-w-7xl w-full mx-auto space-y-6">
          {/* 1. DAILY DASHBOARD TAB (Matches User Image Exactly) */}
          {activeTab === "daily" && (
            <div className="space-y-6">
              {/* Latest Day Section */}
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold text-slate-900">
                  Latest day (2026-10-14)
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      178
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      profiles found
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      137
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      with a website
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      186
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      websites checked
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-[#047857] leading-none">
                      66
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      working well
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-[#b45309] leading-none">
                      68
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      minor issues
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-[#b91c1c] leading-none">
                      52
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      glitchy or down
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      73
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      emails found
                    </div>
                  </div>
                </div>
              </div>

              {/* All Time Section */}
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold text-slate-900">All time</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      848
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      profiles
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      755
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      with website
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      402
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      with email
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-[#047857] leading-none">
                      244
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      good
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-[#b45309] leading-none">
                      260
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      minor
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-[#b91c1c] leading-none">
                      76
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      glitchy
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-[#b91c1c] leading-none">
                      73
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      down
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      191
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      contacted
                    </div>
                  </div>
                </div>
              </div>

              {/* How it is working Section */}
              <div className="space-y-3">
                <h2 className="font-serif-editorial text-lg font-normal text-slate-900">
                  How it is working
                </h2>

                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Which method gets more leads
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Everything saved so far, by where the lead came from
                    </p>
                  </div>

                  {/* Highlight pill banner */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-md px-3.5 py-2 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">
                      Most leads:
                    </span>{" "}
                    Show HN (515).{" "}
                    <span className="font-semibold text-slate-900">
                      Best email rate:
                    </span>{" "}
                    Google Maps (53%).{" "}
                    <span className="font-semibold text-slate-900">
                      Most leads with a website:
                    </span>{" "}
                    Show HN (100%).
                  </div>

                  {/* Summary Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-medium">
                          <th className="py-2 px-3">Method</th>
                          <th className="py-2 px-3 text-right">Leads</th>
                          <th className="py-2 px-3 text-right">Website</th>
                          <th className="py-2 px-3 text-right">Person</th>
                          <th className="py-2 px-3 text-right">Email</th>
                          <th className="py-2 px-3 text-right">Site issues</th>
                          <th className="py-2 px-3 text-right">Mail pitch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            Show HN
                          </td>
                          <td className="py-2 px-3 text-right">515</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">
                            100% ▲
                          </td>
                          <td className="py-2 px-3 text-right">6%</td>
                          <td className="py-2 px-3 text-right">48%</td>
                          <td className="py-2 px-3 text-right">45%</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">
                            15% ▲
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            Google Maps
                          </td>
                          <td className="py-2 px-3 text-right">264</td>
                          <td className="py-2 px-3 text-right">80%</td>
                          <td className="py-2 px-3 text-right">12%</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">
                            53% ▲
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">
                            62% ▲
                          </td>
                          <td className="py-2 px-3 text-right">11%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            LinkedIn
                          </td>
                          <td className="py-2 px-3 text-right">35</td>
                          <td className="py-2 px-3 text-right">80%</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">
                            100% ▲
                          </td>
                          <td className="py-2 px-3 text-right">51%</td>
                          <td className="py-2 px-3 text-right">37%</td>
                          <td className="py-2 px-3 text-right">0%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            Directories
                          </td>
                          <td className="py-2 px-3 text-right">34</td>
                          <td className="py-2 px-3 text-right">0%</td>
                          <td className="py-2 px-3 text-right">0%</td>
                          <td className="py-2 px-3 text-right">0%</td>
                          <td className="py-2 px-3 text-right">0%</td>
                          <td className="py-2 px-3 text-right">0%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    ▲ = best rate among methods with 3+ leads
                  </p>
                </div>
              </div>

              {/* Bottom Visualizations (Leads by method & From lead to pitch) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Leads by method */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Leads by method
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Split by what we know about each lead
                    </p>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#047857]" />{" "}
                      Has email
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#c2410c]" />{" "}
                      Website, no email
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#2563eb]" />{" "}
                      No website, no email
                    </span>
                  </div>

                  {/* Stacked Bars */}
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-20 font-medium text-slate-700 text-right">
                        Show HN
                      </span>
                      <div className="flex-1 flex h-6 rounded overflow-hidden text-[10px] text-white font-medium">
                        <div
                          className="bg-[#047857] flex items-center justify-center"
                          style={{ width: "48%" }}
                        >
                          245
                        </div>
                        <div
                          className="bg-[#c2410c] flex items-center justify-center"
                          style={{ width: "52%" }}
                        >
                          270
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-20 font-medium text-slate-700 text-right">
                        Google Maps
                      </span>
                      <div className="flex-1 flex h-6 rounded overflow-hidden text-[10px] text-white font-medium">
                        <div
                          className="bg-[#047857] flex items-center justify-center"
                          style={{ width: "53%" }}
                        >
                          139
                        </div>
                        <div
                          className="bg-[#c2410c] flex items-center justify-center"
                          style={{ width: "27%" }}
                        >
                          73
                        </div>
                        <div
                          className="bg-[#2563eb] flex items-center justify-center"
                          style={{ width: "20%" }}
                        >
                          52
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-20 font-medium text-slate-700 text-right">
                        LinkedIn
                      </span>
                      <div className="flex-1 flex h-6 rounded overflow-hidden text-[10px] text-white font-medium">
                        <div
                          className="bg-[#047857] flex items-center justify-center"
                          style={{ width: "51%" }}
                        >
                          18
                        </div>
                        <div
                          className="bg-[#c2410c] flex items-center justify-center"
                          style={{ width: "29%" }}
                        >
                          10
                        </div>
                        <div
                          className="bg-[#2563eb] flex items-center justify-center"
                          style={{ width: "20%" }}
                        >
                          7
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-20 font-medium text-slate-700 text-right">
                        Directories
                      </span>
                      <div className="flex-1 flex h-6 rounded overflow-hidden text-[10px] text-white font-medium">
                        <div className="bg-[#2563eb] flex items-center justify-center w-full">
                          34
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* From lead to pitch (Conversion Funnel) */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      From lead to pitch
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      How many survive each step
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 text-xs">
                    {[
                      {
                        label: "Leads found",
                        count: 848,
                        pct: "100%",
                        barPct: "100%",
                      },
                      {
                        label: "Have a website",
                        count: 755,
                        pct: "89% of leads",
                        barPct: "89%",
                      },
                      {
                        label: "Website read",
                        count: 755,
                        pct: "89% of leads",
                        barPct: "89%",
                      },
                      {
                        label: "Person known",
                        count: 98,
                        pct: "12% of leads",
                        barPct: "12%",
                      },
                      {
                        label: "Email found",
                        count: 402,
                        pct: "47% of leads",
                        barPct: "47%",
                      },
                      {
                        label: "Site has issues",
                        count: 409,
                        pct: "48% of leads",
                        barPct: "48%",
                      },
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="w-24 text-slate-600 text-right font-medium text-[11px]">
                          {step.label}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <div
                            className="h-5 bg-[#047857] rounded"
                            style={{ width: step.barPct }}
                          />
                          <span className="text-[11px] text-slate-600 font-medium whitespace-nowrap">
                            {step.count}{" "}
                            {step.pct !== "100%" && (
                              <span className="text-slate-400 font-normal">
                                • {step.pct}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. UNIVERSITY DIRECTORY TAB */}
          {activeTab === "search" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
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
                  const isShortlisted = shortlists.some(
                    (s) => s.university_id === univ.id,
                  );
                  return (
                    <div
                      key={univ.id}
                      className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-500">
                            Rank #{univ.ranking || "—"}
                          </span>
                          <span className="text-slate-500 flex items-center gap-1 font-medium">
                            {univ.country}
                          </span>
                        </div>

                        <h3 className="font-serif-editorial text-base font-bold text-slate-900 mt-2 leading-snug">
                          {univ.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {univ.city}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Tuition:</span>
                            <span className="font-medium text-slate-800">
                              ${univ.tuition_min.toLocaleString()} – $
                              {univ.tuition_max.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Domain:</span>
                            <span className="font-mono text-[11px] text-slate-600">
                              {univ.domain}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenUnivModal(univ)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition"
                        >
                          View Programs
                        </button>
                        <button
                          onClick={() => handleToggleShortlist(univ.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                            isShortlisted
                              ? "bg-amber-50 border-amber-300 text-amber-800"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isShortlisted ? "Saved ★" : "Save"}
                        </button>
                        <button
                          onClick={() => handleRunCrawler(univ.id)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900"
                          title="Crawl Catalog"
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

          {/* 3. PROGRAM CATALOG TAB */}
          {activeTab === "programs" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                    Extracted Program Directory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Normalized subject tags, tuition schedules, and deadline
                    criteria
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  {programs.length} programs available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {programs.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {p.level}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {p.country || "International"}
                        </span>
                      </div>

                      <h4 className="font-serif-editorial text-sm font-bold text-slate-900 mt-2 leading-snug">
                        {p.name}
                      </h4>
                      <p className="text-xs text-emerald-800 font-medium mt-0.5">
                        {p.university_name}
                      </p>

                      <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tuition:</span>
                          <span className="font-semibold text-slate-900">
                            ${p.tuition.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Deadline:</span>
                          <span className="font-medium text-amber-700">
                            {p.deadline}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                          {p.requirements}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleStartCompose(p)}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Mail className="h-3.5 w-3.5" /> Compose Email
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PUBLIC CONTACTS TAB */}
          {activeTab === "contacts" && (
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                    Verified Public Admissions Contacts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Admissions departments and faculty contacts harvested from
                    public directories
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {contacts.length} verified records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Contact</th>
                      <th className="py-2.5 px-4">University & Dept</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Source</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {contacts.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/50 transition"
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {c.role}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div>{c.university_name || "Institution"}</div>
                          <div className="text-[11px] text-slate-400">
                            {c.department}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-800">
                          {c.email}
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-sans">
                            {c.email_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <a
                            href={c.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-[11px]"
                          >
                            Source <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setComposeTargetContact(c);
                              const matched =
                                programs.find(
                                  (p) => p.university_id === c.university_id,
                                ) || programs[0];
                              setComposeTargetProg(matched || null);
                              setActiveTab("compose");
                              generateDraft(
                                matched,
                                c,
                                composeTemplate,
                                customHook,
                              );
                            }}
                            className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition"
                          >
                            Draft
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. STUDENT PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
                <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                  Student Profile & Academic Record
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.full_name || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">
                      Nationality
                    </label>
                    <input
                      type="text"
                      value={profile.nationality || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, nationality: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">
                      GPA / Max
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={profile.gpa || ""}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            gpa: parseFloat(e.target.value),
                          })
                        }
                        className="w-2/3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800"
                      />
                      <input
                        type="number"
                        value={profile.max_gpa || 4.0}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            max_gpa: parseFloat(e.target.value),
                          })
                        }
                        className="w-1/3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">
                      Target Degree Level
                    </label>
                    <select
                      value={profile.target_level || "Master"}
                      onChange={(e) =>
                        setProfile({ ...profile, target_level: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800"
                    >
                      <option value="Bachelor">Bachelor</option>
                      <option value="Master">Master</option>
                      <option value="PhD">Doctorate / PhD</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 mb-1">
                    Field Keywords
                  </label>
                  <input
                    type="text"
                    value={profile.subjects || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, subjects: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800"
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 mb-1">
                    Research Experience
                  </label>
                  <textarea
                    rows={3}
                    value={profile.experience || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, experience: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  />
                </div>

                <button
                  onClick={async () => {
                    const res = await fetch("/api/profile", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(profile),
                    });
                    if (res.ok) showNotify("Academic profile updated.");
                  }}
                  className="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold"
                >
                  Save Profile
                </button>
              </div>

              {/* Document Vault */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                    Document Vault
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    AES-256
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Store and verify PDFs under 20 MB size limit.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    "Resume/CV",
                    "Undergraduate Transcript",
                    "Degree Certificate",
                    "Statement of Purpose",
                  ].map((docType) => (
                    <button
                      key={docType}
                      onClick={() => handleSimulateUpload(docType)}
                      className="p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-left font-medium text-[11px]"
                    >
                      + {docType}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="truncate">
                        <p className="font-medium text-slate-800 truncate">
                          {doc.filename}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await fetch(`/api/documents/${doc.id}`, {
                            method: "DELETE",
                          });
                          const d = await fetch("/api/documents").then((r) =>
                            r.json(),
                          );
                          setDocuments(d);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. ADMISSIONS MATCHER TAB */}
          {activeTab === "matches" && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                    Program Compatibility Ranking
                  </h3>
                  <p className="text-xs text-slate-500">
                    Multi-factor academic scoring against your stated profile
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetch("/api/matcher")
                      .then((r) => r.json())
                      .then((d) => {
                        setMatches(d);
                        showNotify("Refreshed fits.");
                      });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Recalculate
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
                            ? "bg-emerald-50 text-[#047857] border border-emerald-300"
                            : "bg-amber-50 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {score}% Match
                      </span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {program.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {program.university_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                      <span>Subject: {breakdown.subject}/35</span>
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

          {/* 7. COMPOSE & REVIEW TAB */}
          {activeTab === "compose" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                  Personalized Composer
                </h3>

                <div>
                  <label className="block text-slate-500 mb-1">
                    Target Program
                  </label>
                  <select
                    value={composeTargetProg?.id || ""}
                    onChange={(e) => {
                      const p = programs.find((x) => x.id === e.target.value);
                      setComposeTargetProg(p || null);
                      const c = contacts.find(
                        (cnt) => cnt.university_id === p?.university_id,
                      );
                      setComposeTargetContact(c || null);
                      generateDraft(
                        p || null,
                        c || null,
                        composeTemplate,
                        customHook,
                      );
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
                  <label className="block text-slate-500 mb-1">
                    Strategy Template
                  </label>
                  <select
                    value={composeTemplate}
                    onChange={(e) => {
                      setComposeTemplate(e.target.value);
                      generateDraft(
                        composeTargetProg,
                        composeTargetContact,
                        e.target.value,
                        customHook,
                      );
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
                  >
                    <option value="academic_inquiry">
                      Graduate Program Admissions Inquiry
                    </option>
                    <option value="research_lab">
                      Research Alignment & Lab Fit Inquiry
                    </option>
                    <option value="scholarship_funding">
                      Scholarship & Departmental Funding Inquiry
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">
                    Specific Research Hook
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specific lab or professor reference..."
                    value={customHook}
                    onChange={(e) => {
                      setCustomHook(e.target.value);
                      generateDraft(
                        composeTargetProg,
                        composeTargetContact,
                        composeTemplate,
                        e.target.value,
                      );
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <button
                  onClick={handleApproveDraft}
                  className="w-full py-2.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs transition"
                >
                  Approve Draft & Queue
                </button>
              </div>

              <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewMode("html")}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${previewMode === "html" ? "bg-slate-200 text-slate-900" : "text-slate-500"}`}
                    >
                      Formatted View
                    </button>
                    <button
                      onClick={() => setPreviewMode("text")}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${previewMode === "text" ? "bg-slate-200 text-slate-900" : "text-slate-500"}`}
                    >
                      Raw Plain Text
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    To: {composeTargetContact?.email || "admissions@..."}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  {previewMode === "html" ? (
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
          )}

          {/* 8. OUTBOX QUEUE TAB */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                    Outbox Queue & Timezone Governor
                  </h3>
                  <p className="text-xs text-slate-500">
                    60-240s randomized intervals & 08:00-17:00 recipient local
                    timezone protection
                  </p>
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  Sent today: {queueData.sent_today || 0} /{" "}
                  {queueData.current_ramp_cap} cap
                </div>
              </div>

              {queueData.items?.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center text-xs text-slate-500">
                  Queue is clear. No pending outreach emails waiting.
                </div>
              ) : (
                queueData.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {item.recipient_name}
                        </span>
                        <span className="text-slate-400">
                          ({item.recipient_email})
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 font-medium">
                        {item.subject}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Timezone window: {item.recipient_tz}
                      </p>
                    </div>

                    {item.status !== "sent" && (
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

          {/* 9. SENT & REPLIES TAB */}
          {activeTab === "sent" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                    Sent Inquiries & Incoming Replies
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-pause if bounce rate exceeds 5.0%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSimulateEvent("reply")}
                    className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200"
                  >
                    + Simulate Reply
                  </button>
                  <button
                    onClick={() => handleSimulateEvent("bounce")}
                    className="px-2.5 py-1 text-xs rounded bg-rose-50 text-rose-800 border border-rose-200"
                  >
                    + Simulate Bounce
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {sentData.sent?.map((s: any) => (
                  <div
                    key={s.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs text-xs flex justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {s.recipient_email}
                      </div>
                      <div className="text-slate-600 mt-0.5">{s.subject}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Thread: {s.thread_id}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium h-fit">
                      Delivered
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                  Gmail Mailbox Integration
                </h3>
                <p className="text-slate-500">
                  Connect your account via OAuth with gmail.send and
                  gmail.readonly scopes.
                </p>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-800">
                    Connected:{" "}
                    {settings.gmail_email || "alex.scholar@gmail.com"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Status: Active & Authorized
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/settings/send-test-email", {
                        method: "POST",
                      });
                      const d = await res.json();
                      showNotify(d.message);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                  >
                    Send Verification Test
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4 text-xs">
                <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                  Sending Limits & Privacy
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">
                      Daily Cap
                    </label>
                    <input
                      type="number"
                      value={settings.daily_cap || 40}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          daily_cap: parseInt(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">
                      Ramp Stage
                    </label>
                    <select
                      value={settings.ramp_stage || 1}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ramp_stage: parseInt(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                    >
                      <option value="0">20 / day</option>
                      <option value="1">30 / day</option>
                      <option value="2">40 / day</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <a
                    href="/api/compliance/export"
                    download="admitpath_data.json"
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                  >
                    Export All Data (JSON)
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 11. DOCS & TEST SUITE TAB */}
          {activeTab === "docs" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="font-serif-editorial text-base font-bold text-slate-900">
                    Documentation & Unit Test Runner
                  </h3>
                  <p className="text-xs text-slate-500">
                    Run the 25 Python test cases and review feature specs
                  </p>
                </div>
                <button
                  onClick={handleRunTests}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold"
                >
                  {isTesting ? "Running tests..." : "Run 25 Unit Tests"}
                </button>
              </div>

              {testResult && (
                <div className="p-3 bg-white border border-emerald-300 rounded-xl shadow-2xs text-xs space-y-2">
                  <div className="font-bold text-emerald-800">
                    Test Results: {testResult.passed}/{testResult.total} passed
                    in 0.38s
                  </div>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-800 max-h-40 overflow-y-auto">
                    {testResult.output}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1 text-xs">
                  {[
                    "progress",
                    "changelog",
                    "theme-migration",
                    "auth",
                    "crawler",
                    "gmail-oauth",
                    "sending-limits",
                    "compliance",
                  ].map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveDocName(name)}
                      className={`w-full text-left p-2 rounded font-medium ${
                        activeDocName === name
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {name}.md
                    </button>
                  ))}
                </div>

                <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 leading-relaxed overflow-x-auto">
                    {docContent}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* University Detail Modal */}
      {isUnivModalOpen && selectedUniv && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="font-serif-editorial text-lg font-bold text-slate-900">
                  {selectedUniv.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedUniv.city}, {selectedUniv.country}
                </p>
              </div>
              <button
                onClick={() => setIsUnivModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <h4 className="font-semibold text-slate-900">
                Extracted Programs
              </h4>
              {selectedUnivPrograms.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="text-slate-500 text-[11px]">
                      {p.duration_months} Months • ${p.tuition.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsUnivModalOpen(false);
                      handleStartCompose(p);
                    }}
                    className="px-2.5 py-1 rounded bg-[#047857] text-white font-medium"
                  >
                    Draft
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
