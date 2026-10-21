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
  CreditCard,
  Calendar,
  DollarSign,
  Info,
  LogOut,
} from "lucide-react";

import { RouterProvider, useRouter, AppSurface } from "./router";
import PublicWebsite from "./components/PublicWebsite";
import AdminDashboard from "./components/AdminDashboard";
import StudentProfile from "./components/StudentProfile";
import GmailTab from "./components/GmailTab";
import StartSendingModal from "./components/StartSendingModal";
import DiscoverView, { DiscoveredProgram } from "./components/DiscoverView";
import ProgramDetailsModal from "./components/ProgramDetailsModal";
import EmailComposerModal from "./components/EmailComposerModal";
import LoginView from "./components/LoginView";
import OnboardingView from "./components/OnboardingView";
import BrandIcon from "./components/BrandIcon";

interface University {
  id: string;
  name: string;
  country: string;
  country_code?: string;
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
  original_degree?: string;
  department: string;
  language: string;
  duration_months: number;
  tuition: number;
  deadline: string;
  requirements: string;
  program_url: string;
  admissions_url?: string;
  subject_category: string;
  application_mode?: string;
  university_name?: string;
  country?: string;
  city?: string;
  domain?: string;
  website?: string;
  ranking?: number;
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

function AppContent() {
  const { surface, path, navigate } = useRouter();

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
    plan_name: "Scholar Pro",
    sent_today: 0,
    remaining_daily_quota: 25,
  });
  const [sentData, setSentData] = useState<any>({
    sent: [],
    replies: [],
    bounce_rate: 0,
  });
  const [profile, setProfile] = useState<any>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    daily_cap: 25,
    ramp_stage: 1,
    gmail_connected: 0,
    gmail_email: null,
  });
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [suppressionList, setSuppressionList] = useState<any[]>([]);

  // Authentication & Session States
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Modals & Selections
  const [selectedDetailProg, setSelectedDetailProg] =
    useState<DiscoveredProgram | null>(null);
  const [isStartSendingOpen, setIsStartSendingOpen] = useState(false);

  // Discover Email Composer Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalProgram, setEmailModalProgram] =
    useState<DiscoveredProgram | Program | null>(null);

  const handleOpenEmailModal = (prog: Program | DiscoveredProgram) => {
    setEmailModalProgram(prog);
    setIsEmailModalOpen(true);
  };

  // Programmes Catalog Filter State
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [catalogCountryFilter, setCatalogCountryFilter] = useState("all");
  const [catalogLevelFilter, setCatalogLevelFilter] = useState("all");

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
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  // Status Notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // Helper for auth headers
  const getAuthHeaders = (_tokenOverride?: string): Record<string, string> => ({
    "Content-Type": "application/json",
  });

  // Initial & Background Data Fetching
  const fetchAllData = async (tokenOverride?: string) => {
    try {
      const headers = getAuthHeaders(tokenOverride);
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
        fetch("/api/profile", { headers }),
        fetch("/api/documents", { headers }),
        fetch("/api/shortlists", { headers }),
        fetch("/api/drafts", { headers }),
        fetch("/api/queue", { headers }),
        fetch("/api/sent", { headers }),
        fetch("/api/gmail/status", { headers }),
        fetch("/api/compliance/suppression", { headers }),
      ]);

      if (uRes.ok) setUniversities(await uRes.json());
      if (pRes.ok) setPrograms(await pRes.json());
      if (cRes.ok) setContacts(await cRes.json());
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
      }
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
      console.error("Error fetching data:", err);
    }
  };

  // Auth & Session Verification on Mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
          setSessionToken("cookie");
          if (userData.student_profile) {
            setProfile(userData.student_profile);
          }
          if (userData.settings) {
            setSettings({
              daily_cap: userData.subscription?.daily_send_limit || 25,
              gmail_connected: userData.gmail?.connected ? 1 : 0,
              gmail_email:
                userData.gmail?.email || userData.settings?.gmail_email,
            });
          }
          await fetchAllData();
        } else {
          setSessionToken(null);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Session verification error:", err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    verifyAuth();
  }, []);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setSessionToken(null);
    setCurrentUser(null);
    setDrafts([]);
    setDocuments([]);
    setShortlists([]);
    navigate("/login");
    showNotify("Logged out successfully.");
  };

  // Fetch matches whenever on /matches
  useEffect(() => {
    if (path.startsWith("/matches")) {
      const headers = getAuthHeaders();
      fetch("/api/matcher", { headers })
        .then((r) => r.json())
        .then((data) => setMatches(data))
        .catch(console.error);
    }
  }, [path, sessionToken]);

  // Prepare Compose for Emails tab
  const handleStartCompose = (prog: Program | DiscoveredProgram) => {
    setComposeTargetProg(prog as Program);
    const targetContact =
      contacts.find((c) => c.university_id === prog.university_id) ||
      contacts[0];
    setComposeTargetContact(targetContact || null);
    generateDraft(prog as Program, targetContact, composeTemplate, customHook);
    navigate("/emails");
  };

  const generateDraft = async (
    prog: Program | null,
    cont: Contact | null,
    tpl: string,
    hookText: string,
  ) => {
    if (!prog) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/compose/generate", {
        method: "POST",
        headers,
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
      const headers = getAuthHeaders();
      const saveRes = await fetch("/api/drafts", {
        method: "POST",
        headers,
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
          headers,
        });
        const appData = await appRes.json();
        if (appRes.ok) {
          showNotify(appData.message);
          fetchAllData();
          navigate("/outbox");
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
      const headers = getAuthHeaders();
      const res = await fetch(`/api/queue/${itemId}/send-now`, {
        method: "POST",
        headers,
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
  const handleUploadDoc = async (docType: string, file: File) => {
    const headers = getAuthHeaders();
    const form = new FormData();
    form.set("doc_type", docType);
    form.set("file", file);
    const res = await fetch("/api/documents/upload", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Upload failed");
    }
    const updated = await fetch("/api/documents", {
      headers,
    }).then((r) => r.json());
    setDocuments(updated);
  };

  const handleDeleteDoc = async (docId: string) => {
    const headers = getAuthHeaders();
    await fetch(`/api/documents/${docId}`, {
      method: "DELETE",
      headers,
    });
    const updated = await fetch("/api/documents", {
      headers,
    }).then((r) => r.json());
    setDocuments(updated);
    showNotify("Document removed from vault.");
  };

  // Filter Catalog Programmes
  const filteredCatalogPrograms = programs.filter((p) => {
    if (
      catalogCountryFilter !== "all" &&
      p.country?.toLowerCase() !== catalogCountryFilter.toLowerCase()
    )
      return false;
    if (
      catalogLevelFilter !== "all" &&
      p.level?.toLowerCase() !== catalogLevelFilter.toLowerCase()
    )
      return false;
    if (catalogSearchQuery) {
      const q = catalogSearchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchUniv = (p.university_name || "").toLowerCase().includes(q);
      const matchDept = (p.department || "").toLowerCase().includes(q);
      if (!matchName && !matchUniv && !matchDept) return false;
    }
    return true;
  });

  // -------------------------------------------------------------
  // SURFACE 0: LOGIN VIEW (Direct /login route)
  // -------------------------------------------------------------
  if (path === "/login") {
    return (
      <LoginView
        onLoginSuccess={(token, user) => {
          setSessionToken("cookie");
          setCurrentUser(user);
          if (user.student_profile) {
            setProfile(user.student_profile);
          }
          fetchAllData();
          showNotify(`Welcome back, ${user.full_name || "Scholar"}!`);
          if (user.role === "admin") {
            navigate("/admin/dashboard");
          } else if (!user.onboarding_complete) {
            navigate("/onboarding");
          } else {
            navigate("/dashboard");
          }
        }}
        onBackToPublic={() => navigate("/?surface=public")}
      />
    );
  }

  // -------------------------------------------------------------
  // SURFACE 1: PUBLIC WEBSITE (Landing, Pricing, Checkout)
  // -------------------------------------------------------------
  if (surface === "public") {
    return (
      <PublicWebsite
        onSignInClick={() => navigate("/login")}
        onSelectPlan={(planId) => {
          showNotify(
            `Plan ${planId} selected. Complete checkout to provision student access.`,
          );
          navigate("/login");
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // AUTH GUARD: Require active session for student/admin surfaces
  // -------------------------------------------------------------
  if (!isAuthLoading && !currentUser && !sessionToken) {
    return (
      <LoginView
        onLoginSuccess={(token, user) => {
          setSessionToken("cookie");
          setCurrentUser(user);
          if (user.student_profile) {
            setProfile(user.student_profile);
          }
          fetchAllData();
          showNotify(`Welcome back, ${user.full_name || "Scholar"}!`);
          if (user.role === "admin") {
            navigate("/admin/dashboard");
          } else if (!user.onboarding_complete) {
            navigate("/onboarding");
          } else {
            navigate("/dashboard");
          }
        }}
        onBackToPublic={() => navigate("/?surface=public")}
      />
    );
  }

  if (currentUser && currentUser.role === "student" && !currentUser.onboarding_complete) {
    return (
      <OnboardingView
        profile={currentUser.student_profile}
        mode="onboarding"
        onSaved={(saved) => {
          setProfile(saved);
          setCurrentUser({ ...currentUser, onboarding_complete: true, full_name: saved.full_name, student_profile: saved });
          navigate("/dashboard");
          showNotify("Profile saved. Welcome to AdmitPath!");
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // SURFACE 2: ADMINISTRATOR DASHBOARD
  // -------------------------------------------------------------
  if (surface === "admin") {
    return <AdminDashboard onNotify={showNotify} />;
  }

  // -------------------------------------------------------------
  // SURFACE 3: STUDENT APPLICATION
  // NOTE: Strict compliance with Master Prompt:
  // "The student application must not contain buttons that switch
  // between Student View, Admin View, and Public Site."
  // -------------------------------------------------------------
  const activeStudentTab = path.startsWith("/discover")
    ? "discover"
    : path.startsWith("/programmes")
      ? "programmes"
      : path.startsWith("/matches")
        ? "matches"
        : path.startsWith("/emails")
          ? "emails"
          : path.startsWith("/outbox")
            ? "outbox"
            : path.startsWith("/gmail")
              ? "gmail"
              : path.startsWith("/profile")
                ? "profile"
                : path.startsWith("/settings")
                  ? "settings"
                  : "dashboard";

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex font-sans selection:bg-emerald-700 selection:text-white antialiased">
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
                title="Toggle sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <BrandIcon size="sm" />
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
          <div className="p-3 space-y-1">
            {[
              {
                path: "/dashboard",
                id: "dashboard",
                label: "Daily",
                icon: Activity,
              },
              {
                path: "/discover",
                id: "discover",
                label: "Discover",
                icon: Search,
              },
              {
                path: "/programmes",
                id: "programmes",
                label: "Programmes",
                icon: GraduationCap,
              },
              { path: "/emails", id: "emails", label: "Emails", icon: Mail },
              {
                path: "/outbox",
                id: "outbox",
                label: "Outbox",
                icon: Send,
                badge: queueData.items?.filter(
                  (i: any) => i.status === "pending",
                )?.length,
              },
              {
                path: "/gmail",
                id: "gmail",
                label: "Gmail Account",
                icon: KeyRound,
              },
              {
                path: "/matches",
                id: "matches",
                label: "Matches",
                icon: Sparkles,
              },
              {
                path: "/profile",
                id: "profile",
                label: "Profile",
                icon: UserCheck,
              },
              {
                path: "/settings",
                id: "settings",
                label: "Settings",
                icon: Settings,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeStudentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    navigate(tab.path);
                    setIsMobileSidebarOpen(false);
                  }}
                  title={!isSidebarOpen ? tab.label : undefined}
                  className={`w-full flex items-center ${
                    isSidebarOpen
                      ? "justify-between px-3 py-2"
                      : "justify-center p-2"
                  } rounded-lg text-xs font-normal transition-all group ${
                    isActive
                      ? "border border-[#4f3fd0] bg-[#f3f1ff] text-[#352d82] font-medium shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-[#4f3fd0]"
                          : "text-slate-500 group-hover:text-slate-700"
                      }`}
                      strokeWidth={1.6}
                    />
                    {isSidebarOpen && (
                      <span className="truncate">{tab.label}</span>
                    )}
                  </div>
                  {typeof tab.badge === "number" &&
                    tab.badge > 0 &&
                    isSidebarOpen && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {tab.badge}
                      </span>
                    )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer with Dynamic Authenticated Student Identity & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          {isSidebarOpen ? (
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <div className="flex items-center justify-between text-slate-700 font-semibold">
                  <span>Student Application</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                </div>
                <p className="truncate text-slate-800 font-bold text-xs">
                  {currentUser?.full_name || profile.full_name || "Scholar Student"}
                </p>
                <p className="truncate text-slate-400 text-[10px]">
                  {currentUser?.subscription?.plan_name || queueData.plan_name || "Scholar Pro"} • {currentUser?.email || "student@admitpath.app"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-medium transition cursor-pointer"
                title="Log out of student account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
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
            <BrandIcon size="sm" className="lg:hidden" />
            <h1 className="font-serif-editorial text-2xl font-normal text-slate-900 tracking-tight">
              {{
                dashboard: "Daily Overview",
                discover: "Discover (Country-First Academic Programmes)",
                programmes: "Academic Programmes Catalog",
                emails: "Personalized Email Generation",
                outbox: "Application Outbox & Queue",
                gmail: "Gmail Account Integration",
                matches: "Admissions Fit Matcher",
                profile: "Student Academic Profile (Read-Only)",
                settings: "Account Settings & Preferences",
              }[activeStudentTab] || "Daily"}
            </h1>
          </div>

          {/* Notification + Start Sending CTA (No Role Switcher in Student UI!) */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
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

            {/* Start Sending Button in Header */}
            <button
              onClick={() => setIsStartSendingOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#4f3fd0] hover:bg-[#4034a8] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Start Sending ({queueData.remaining_daily_quota ?? 25} left)
            </button>
          </div>
        </header>

        {/* Tab Contents */}
        <main className="flex-1 px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* 1. DAILY DASHBOARD */}
          {activeStudentTab === "dashboard" && (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-900">
                    Admissions Outreach Snapshot (
                    {new Date().toISOString().slice(0, 10)})
                  </h2>
                  <span className="text-xs text-slate-500">
                    Subscription:{" "}
                    <strong className="text-slate-800">
                      {queueData.plan_name || "Scholar Pro"}
                    </strong>{" "}
                    ({queueData.remaining_daily_quota} / {queueData.daily_cap}{" "}
                    quota today)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      {universities.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      institutions indexed
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      {programs.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      distinct programmes
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      {shortlists.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      shortlisted targets
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      {drafts.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      inquiry drafts
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-emerald-800 leading-none">
                      {queueData.remaining_daily_quota ?? 25}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-normal">
                      daily quota left
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-3.5 shadow-2xs">
                    <div className="text-2xl font-bold text-slate-900 leading-none">
                      {queueData.items?.filter(
                        (i: any) => i.status === "pending",
                      )?.length || 0}
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
                  <h3 className="text-base font-bold text-slate-900">
                    Country-First Academic Programme Discovery
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    Search accredited institutions across 190+ sovereign
                    nations. Filter by subject taxonomy, derive real study-level
                    filters, inspect official catalogues, and send personalized
                    inquiry emails.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/discover")}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Open Discover
                  </button>
                  <button
                    onClick={() => setIsStartSendingOpen(true)}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#4f3fd0] text-white hover:bg-[#4034a8] shadow-xs transition flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Start Sending
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. DISCOVER TAB (Country-First Academic Discovery) */}
          {activeStudentTab === "discover" && (
            <DiscoverView
              onSelectProgramForEmail={(prog) => handleOpenEmailModal(prog)}
              onViewProgramDetails={(prog) => setSelectedDetailProg(prog)}
              onNotify={showNotify}
            />
          )}

          {/* 3. PROGRAMMES CATALOG TAB */}
          {activeStudentTab === "programmes" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search programmes, disciplines, or institutions..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={catalogLevelFilter}
                    onChange={(e) => setCatalogLevelFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="all">All Study Levels</option>
                    <option value="bachelor">Bachelor's</option>
                    <option value="master">Master's</option>
                    <option value="phd">PhD / Doctoral</option>
                    <option value="mba">MBA</option>
                  </select>

                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {filteredCatalogPrograms.length} programmes
                  </span>
                </div>
              </div>

              {/* Grid of Distinct Programme Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCatalogPrograms.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {p.university_name || "Accredited Institution"}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {p.name}
                          </h4>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                          {p.original_degree || p.level}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        {p.department} • {p.subject_category}
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                        <span className="truncate">
                          Tuition:{" "}
                          {p.tuition
                            ? `$${p.tuition.toLocaleString()}`
                            : "Not available"}
                        </span>
                        <span className="truncate">
                          Deadline: {p.deadline || "Rolling"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedDetailProg(p as any)}
                        className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleOpenEmailModal(p as any)}
                        className="py-1.5 px-2.5 rounded-lg bg-[#4f3fd0] hover:bg-[#4034a8] text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Mail className="h-3 w-3" />
                        Send Email
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. EMAILS / COMPOSE TAB */}
          {activeStudentTab === "emails" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Draft Configuration */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-700" />
                  Inquiry Target & Template
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Target Programme
                  </label>
                  <select
                    value={composeTargetProg?.id || ""}
                    onChange={(e) => {
                      const prog = programs.find(
                        (p) => p.id === e.target.value,
                      );
                      if (prog) {
                        setComposeTargetProg(prog);
                        const c =
                          contacts.find(
                            (cnt) => cnt.university_id === prog.university_id,
                          ) || contacts[0];
                        setComposeTargetContact(c || null);
                        generateDraft(prog, c, composeTemplate, customHook);
                      }
                    }}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  >
                    <option value="">Select a programme...</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.university_name}: {p.name} (
                        {p.original_degree || p.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Admissions Recipient
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-800">
                      {composeTargetContact?.name ||
                        "Graduate Admissions Office"}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {composeTargetContact?.email ||
                        "admissions@university.edu"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Custom Research Hook
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe specific lab, professor, or curriculum aspect..."
                    value={customHook}
                    onChange={(e) => setCustomHook(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>

                <button
                  onClick={() =>
                    generateDraft(
                      composeTargetProg,
                      composeTargetContact,
                      composeTemplate,
                      customHook,
                    )
                  }
                  disabled={!composeTargetProg}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerate Personalized Draft
                </button>
              </div>

              {/* Draft Preview & Review */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Personalized Email Draft Review
                      </h3>
                      <p className="text-xs text-slate-500">
                        Human-in-the-loop review required before queue
                        eligibility.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setPreviewMode("html")}
                        className={`px-2.5 py-1 text-xs rounded-md ${previewMode === "html" ? "bg-white font-semibold text-slate-800 shadow-2xs" : "text-slate-600"}`}
                      >
                        Formatted
                      </button>
                      <button
                        onClick={() => setPreviewMode("text")}
                        className={`px-2.5 py-1 text-xs rounded-md ${previewMode === "text" ? "bg-white font-semibold text-slate-800 shadow-2xs" : "text-slate-600"}`}
                      >
                        Raw Text
                      </button>
                    </div>
                  </div>

                  {portalNotice && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{portalNotice}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-lg font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      Email Body
                    </label>
                    {previewMode === "html" ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: draftBodyHtml }}
                        className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 min-h-[240px] text-xs leading-relaxed"
                      />
                    ) : (
                      <textarea
                        rows={12}
                        value={draftBodyText}
                        onChange={(e) => setDraftBodyText(e.target.value)}
                        className="w-full p-3 font-mono text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                      />
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Includes required RFC-compliant opt-out footer.
                  </span>

                  <button
                    onClick={handleApproveDraft}
                    disabled={!composeTargetProg || !draftSubject}
                    className="px-6 py-2.5 rounded-lg bg-[#4f3fd0] hover:bg-[#4034a8] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Draft & Queue for Sending
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. OUTBOX QUEUE TAB */}
          {activeStudentTab === "outbox" && (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Application Dispatch Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    Governed by <strong>{queueData.plan_name}</strong> (
                    {queueData.remaining_daily_quota} emails remaining today).
                  </p>
                </div>

                <button
                  onClick={() => setIsStartSendingOpen(true)}
                  className="px-5 py-2.5 rounded-lg bg-[#4f3fd0] hover:bg-[#4034a8] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Start Sending Batch ({queueData.remaining_daily_quota} Daily
                  Quota Left)
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Programme</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {queueData.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">
                            {item.recipient_name}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">
                            {item.recipient_email}
                          </div>
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {item.program_name || "Academic Inquiry"}
                        </td>
                        <td className="p-3 text-slate-600 line-clamp-1">
                          {item.subject}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === "sent"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "failed"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {item.status === "pending" && (
                            <button
                              onClick={() => handleSendQueueItem(item.id)}
                              className="px-3 py-1 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 text-[11px]"
                            >
                              Send Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!queueData.items || queueData.items.length === 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-slate-400"
                        >
                          No pending applications in queue. Discover programmes
                          and approve drafts to populate your outbox.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. GMAIL ACCOUNT TAB */}
          {activeStudentTab === "gmail" && <GmailTab onNotify={showNotify} />}

          {/* 7. MATCHES TAB */}
          {activeStudentTab === "matches" && (
            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">
                  Academic Fit Matcher
                </h3>
                <p className="text-xs text-slate-500">
                  Scores calculated against your academic profile (
                  {profile.qualification}, GPA {profile.gpa}/{profile.max_gpa},
                  budget ${profile.budget_max?.toLocaleString()}).
                </p>
              </div>

              <div className="space-y-3">
                {matches.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {m.program.university_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {m.score}% Match
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        {m.program.name} (
                        {m.program.original_degree || m.program.level})
                      </h4>
                      <ul className="text-xs text-slate-500 list-disc list-inside space-y-0.5">
                        {m.reasons.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleStartCompose(m.program)}
                      className="px-4 py-2 rounded-lg bg-[#4f3fd0] text-white text-xs font-semibold hover:bg-[#4034a8] shrink-0"
                    >
                      Draft Inquiry
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. READ-ONLY STUDENT PROFILE TAB */}
          {activeStudentTab === "profile" && isEditingProfile && (
            <OnboardingView
              profile={profile}
              mode="edit"
              onCancel={() => setIsEditingProfile(false)}
              onSaved={(saved) => {
                setProfile(saved);
                setCurrentUser((u: any) => (u ? { ...u, full_name: saved.full_name, student_profile: saved } : u));
                setIsEditingProfile(false);
                showNotify("Profile updated.");
              }}
            />
          )}
          {activeStudentTab === "profile" && !isEditingProfile && (
            <StudentProfile
              profile={profile}
              onEdit={() => setIsEditingProfile(true)}
              documents={documents}
              onUploadDoc={handleUploadDoc}
              onDeleteDoc={handleDeleteDoc}
              onNotify={showNotify}
            />
          )}

          {/* 9. SETTINGS TAB */}
          {activeStudentTab === "settings" && (
            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4 max-w-2xl">
              <h3 className="text-base font-bold text-slate-900">
                Account & Delivery Preferences
              </h3>
              <p className="text-xs text-slate-500">
                Configured according to your active {queueData.plan_name}{" "}
                subscription.
              </p>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                  <span>Daily Sending Cap:</span>
                  <strong className="text-slate-900">
                    {queueData.daily_cap} emails/day
                  </strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                  <span>Monthly Sending Cap:</span>
                  <strong className="text-slate-900">
                    {queueData.monthly_cap} emails/month
                  </strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                  <span>Recipient Local Delivery Window:</span>
                  <strong className="text-slate-900">
                    08:00 – 17:00 Local Time
                  </strong>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                  <span>Polite Delivery Jitter:</span>
                  <strong className="text-slate-900">
                    60–240 seconds randomized gap
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Student App Footer */}
          <footer className="mt-12 pt-6 pb-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <BrandIcon size="xs" />
              <span className="font-semibold text-slate-700">AdminPath</span>
              <span className="text-slate-300">•</span>
              <span>Global University Admissions & Outreach</span>
            </div>
            <div className="text-slate-400">
              © {new Date().getFullYear()} AdminPath. All rights reserved.
            </div>
          </footer>
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

      {/* PROGRAMME DETAILS MODAL */}
      <ProgramDetailsModal
        program={selectedDetailProg}
        onClose={() => setSelectedDetailProg(null)}
        onSendEmail={(prog) => {
          setSelectedDetailProg(null);
          handleOpenEmailModal(prog);
        }}
      />

      {/* EMAIL COMPOSER MODAL (DISCOVER IN-PLACE MODAL) */}
      <EmailComposerModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        program={emailModalProgram}
        studentProfile={profile}
        userEmail={currentUser?.email || "scholar@admitpath.app"}
        contacts={contacts}
        documents={documents}
        isGmailConnected={settings.gmail_connected === 1}
        gmailEmail={settings.gmail_email}
        token={sessionToken}
        onEmailSentSuccess={(result) => {
          showNotify(`Admissions inquiry sent to ${result.recipient_email}!`);
          if (result.remaining_daily_quota !== undefined) {
            setQueueData((prev: any) => ({
              ...prev,
              remaining_daily_quota: result.remaining_daily_quota,
              sent_today: (prev.sent_today || 0) + 1,
            }));
          }
          fetchAllData(sessionToken || undefined);
        }}
        onOpenGmailSettings={() => {
          setIsEmailModalOpen(false);
          navigate("/gmail");
        }}
        onNotify={showNotify}
      />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
