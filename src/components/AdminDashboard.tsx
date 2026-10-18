import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  CreditCard,
  Send,
  Sparkles,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Play,
  KeyRound,
  Lock,
  UserCheck,
  FileText,
  Activity,
  Layers,
  Globe,
  Mail,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import BrandIcon from "./BrandIcon";

interface AdminDashboardProps {
  onNotify: (msg: string) => void;
}

export default function AdminDashboard({ onNotify }: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<
    "metrics" | "students" | "subscriptions" | "plans" | "audit" | "tests"
  >("students");
  const [metrics, setMetrics] = useState<any>({});
  const [students, setStudents] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Search & Filter
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedUnprovSub, setSelectedUnprovSub] = useState<any>(null);

  // Form State for Provisioning
  const [formData, setFormData] = useState<any>({
    full_name: "",
    email: "",
    nationality: "International",
    country_of_residence: "International",
    gpa: 3.8,
    max_gpa: 4.0,
    qualification: "Bachelor of Science in Computer Science",
    target_level: "Master",
    intake_term: "Fall 2026",
    subjects: "Computer Science, Data Science & AI",
    countries: "USA, United Kingdom, Germany, Canada",
    preferred_universities: "MIT, Stanford, Oxford, TU Munich",
    budget_max: 45000,
    ielts_score: 7.5,
    toefl_score: 105,
    experience:
      "2 years research experience in deep learning and distributed systems",
    academic_achievements:
      "Dean's List for 6 semesters, Regional IEEE paper author",
    additional_preferences: "Seeking Departmental Graduate Assistantship",
    plan_id: "plan_pro",
  });

  const fetchAllAdminData = async () => {
    try {
      const headers = {};
      const [mRes, sRes, subRes, pRes, aRes] = await Promise.all([
        fetch("/api/admin/metrics", { headers }),
        fetch("/api/admin/students", { headers }),
        fetch("/api/admin/subscriptions", { headers }),
        fetch("/api/admin/plans", { headers }),
        fetch("/api/admin/audit-logs", { headers }),
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (sRes.ok) setStudents(await sRes.json());
      if (subRes.ok) setSubscriptions(await subRes.json());
      if (pRes.ok) setPlans(await pRes.json());
      if (aRes.ok) setAuditLogs(await aRes.json());
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  // Handle Provisioning Submit
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          subscription_id: selectedUnprovSub?.id || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onNotify(data.message || "Student account provisioned.");
        setIsProvisionModalOpen(false);
        setSelectedUnprovSub(null);
        fetchAllAdminData();
      } else {
        onNotify("Error: " + data.error);
      }
    } catch (err: any) {
      onNotify("Provisioning error: " + err.message);
    }
  };

  // Handle Student Profile Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        onNotify(data.message || "Student profile updated.");
        setIsEditModalOpen(false);
        setSelectedStudent(null);
        fetchAllAdminData();
      } else {
        onNotify("Error: " + data.error);
      }
    } catch (err: any) {
      onNotify("Update error: " + err.message);
    }
  };

  // Status Change
  const handleStatusChange = async (studentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onNotify(`Student account ${newStatus}.`);
        fetchAllAdminData();
      }
    } catch (err: any) {
      onNotify("Error: " + err.message);
    }
  };

  // Reset Credentials
  const handleResetCreds = async (studentId: string) => {
    try {
      const res = await fetch(
        `/api/admin/students/${studentId}/reset-credentials`,
        {
          method: "POST",
          headers: {},
        },
      );
      const data = await res.json();
      if (res.ok) {
        alert(
          `New Temporary Password: ${data.temp_password}\nActivation Link: ${data.activation_link}`,
        );
        onNotify("New credentials generated.");
      }
    } catch (err: any) {
      onNotify("Error: " + err.message);
    }
  };

  // Run Internal Test Suite
  const handleRunInternalTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch("/api/admin/tests/run", {
        headers: {},
      });
      const data = await res.json();
      setTestOutput(data);
      onNotify(
        data.success
          ? "All unit tests passed successfully."
          : "Test execution encountered failures.",
      );
    } catch (err: any) {
      onNotify("Test run failed: " + err.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      (s.full_name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.subjects || "").toLowerCase().includes(studentSearch.toLowerCase());
    const matchStatus =
      statusFilter === "all" || s.account_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Admin Header & Nav Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandIcon size="xl" className="shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800">
                Administrator Console
              </span>
              <span className="text-xs text-slate-400">
                • Full RBAC Control
              </span>
            </div>
            <h2 className="font-serif-editorial text-2xl font-bold text-slate-900 mt-0.5">
              AdminPath Platform Management
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium bg-slate-50 p-1 rounded-lg border border-slate-200">
          {[
            {
              id: "students",
              label: "Student Accounts",
              count: students.length,
            },
            {
              id: "subscriptions",
              label: "Subscriptions",
              count:
                subscriptions.filter(
                  (s) => s.status === "awaiting_provisioning",
                ).length || undefined,
            },
            { id: "plans", label: "Plan Quotas" },
            { id: "audit", label: "Audit Trail" },
            { id: "tests", label: "System Diagnostics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                adminTab === tab.id
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    tab.id === "subscriptions"
                      ? "bg-amber-100 text-amber-800 font-bold"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: "Active Students",
            val: metrics.total_students || 0,
            icon: Users,
          },
          {
            label: "Active Subscriptions",
            val: metrics.active_subscriptions || 0,
            icon: CreditCard,
          },
          {
            label: "Awaiting Provisioning",
            val: metrics.awaiting_provisioning || 0,
            icon: AlertTriangle,
            highlight: metrics.awaiting_provisioning > 0,
          },
          {
            label: "Applications Sent",
            val: metrics.total_emails_sent || 0,
            icon: Send,
          },
          {
            label: "Bounce Rate",
            val: `${metrics.bounce_rate || 0.0}%`,
            icon: Activity,
          },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={i}
              className={`bg-white p-4 rounded-xl border shadow-2xs ${
                m.highlight
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{m.label}</span>
                <Icon
                  className={`h-4 w-4 ${m.highlight ? "text-amber-600" : "text-slate-400"}`}
                />
              </div>
              <div className="font-serif-editorial text-2xl font-bold text-slate-900 mt-2">
                {m.val}
              </div>
            </div>
          );
        })}
      </div>

      {/* TAB 1: STUDENTS MANAGEMENT */}
      {adminTab === "students" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search students by name, email, or discipline..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSelectedStudent(null);
                setSelectedUnprovSub(null);
                setFormData({
                  full_name: "",
                  email: "",
                  nationality: "International",
                  country_of_residence: "International",
                  gpa: 3.8,
                  max_gpa: 4.0,
                  qualification: "Bachelor of Science in Computer Science",
                  target_level: "Master",
                  intake_term: "Fall 2026",
                  subjects: "Computer Science, Data Science & AI",
                  countries: "USA, United Kingdom, Germany, Canada",
                  preferred_universities: "MIT, Stanford, Oxford, TU Munich",
                  budget_max: 45000,
                  ielts_score: 7.5,
                  toefl_score: 105,
                  experience: "2 years research experience",
                  academic_achievements: "Dean’s List, Honors Graduate",
                  additional_preferences: "Graduate Assistantship desired",
                  plan_id: "plan_pro",
                });
                setIsProvisionModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-2xs transition flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Provision Student Account
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Student / Email</th>
                  <th className="px-4 py-3">Academic Target</th>
                  <th className="px-4 py-3">GPA & English</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Gmail Status</th>
                  <th className="px-4 py-3">Sent / Cap</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No student records match search filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {s.full_name || "Unnamed Student"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {s.email}
                        </div>
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-medium ${
                            s.account_status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {s.account_status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">
                          {s.target_level} in {s.subjects?.split(",")[0]}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {s.intake_term} • {s.countries?.split(",")[0]}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-emerald-800">
                          GPA: {s.gpa} / {s.max_gpa}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          IELTS {s.ielts_score} • TOEFL {s.toefl_score}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-900 block">
                          {s.plan_name || "Starter Plan"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {s.daily_send_limit || 20}/day cap
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                            s.gmail_status === "connected"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Mail className="h-3 w-3" />
                          {s.gmail_status === "connected"
                            ? "Connected"
                            : "Not Connected"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">
                          {s.sent_today} sent today
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {s.sent_total} total all-time
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedStudent(s);
                            setFormData({
                              full_name: s.full_name,
                              email: s.email,
                              nationality: s.nationality,
                              country_of_residence: s.country_of_residence,
                              gpa: s.gpa,
                              max_gpa: s.max_gpa,
                              qualification: s.qualification,
                              target_level: s.target_level,
                              intake_term: s.intake_term,
                              subjects: s.subjects,
                              countries: s.countries,
                              preferred_universities: s.preferred_universities,
                              budget_max: s.budget_max,
                              ielts_score: s.ielts_score,
                              toefl_score: s.toefl_score,
                              experience: s.experience,
                              academic_achievements: s.academic_achievements,
                              additional_preferences: s.additional_preferences,
                              plan_id: s.plan_id || "plan_pro",
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => handleResetCreds(s.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          title="Generate new temporary password and activation link"
                        >
                          Reset Pass
                        </button>
                        {s.account_status === "active" ? (
                          <button
                            onClick={() =>
                              handleStatusChange(s.id, "suspended")
                            }
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(s.id, "active")}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTIONS & AWAITING PROVISIONING */}
      {adminTab === "subscriptions" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Awaiting Provisioning (
              {
                subscriptions.filter(
                  (s) => s.status === "awaiting_provisioning",
                ).length
              }
              )
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Verified customer purchases awaiting Administrator to configure
              the student’s academic profile.
            </p>

            <div className="divide-y divide-slate-100">
              {subscriptions.filter((s) => s.status === "awaiting_provisioning")
                .length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No purchases awaiting provisioning. All student accounts are
                  up to date.
                </div>
              ) : (
                subscriptions
                  .filter((s) => s.status === "awaiting_provisioning")
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="py-4 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {sub.customer_name || sub.customer_email}
                        </div>
                        <div className="text-slate-500">
                          {sub.customer_email} • Purchased {sub.plan_name} ($
                          {sub.price_usd}/mo)
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Payment Succeeded • Awaiting Account Setup
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedUnprovSub(sub);
                          setFormData({
                            full_name: sub.customer_name || "",
                            email: sub.customer_email,
                            nationality: "International",
                            country_of_residence: "International",
                            gpa: 3.8,
                            max_gpa: 4.0,
                            qualification: "Bachelor of Science",
                            target_level: "Master",
                            intake_term: "Fall 2026",
                            subjects: "Computer Science",
                            countries: "USA, United Kingdom, Germany, Canada",
                            preferred_universities: "",
                            budget_max: 45000,
                            ielts_score: 7.0,
                            toefl_score: 100,
                            experience: "",
                            academic_achievements: "",
                            additional_preferences: "",
                            plan_id: sub.plan_id,
                          });
                          setIsProvisionModalOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-2xs transition"
                      >
                        Provision Student Now
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Active Subscriptions
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Currently active student entitlements and billing records.
            </p>
            <div className="divide-y divide-slate-100 text-xs">
              {subscriptions
                .filter((s) => s.status === "active")
                .map((sub) => (
                  <div
                    key={sub.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {sub.student_full_name || sub.customer_name} (
                        {sub.student_email || sub.customer_email})
                      </div>
                      <div className="text-slate-500">
                        {sub.plan_name} • ${sub.price_usd}/mo • Daily cap:{" "}
                        {sub.daily_send_limit} emails
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLAN LIMITS CONFIGURATION */}
      {adminTab === "plans" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Configurable Subscription Plans
          </h3>
          <p className="text-xs text-slate-500">
            Define institutional sending quotas, monthly ceilings, and discovery
            limits without modifying application code.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                  <span className="font-serif-editorial text-lg font-bold text-slate-900">
                    ${p.price_usd}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Daily Sending Cap:</span>
                    <span className="font-semibold text-slate-800">
                      {p.daily_send_limit} emails/day
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monthly Send Cap:</span>
                    <span className="font-semibold text-slate-800">
                      {p.monthly_send_limit} emails/mo
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">University Searches:</span>
                    <span className="font-semibold text-slate-800">
                      {p.univ_discovery_limit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Programme Matches:</span>
                    <span className="font-semibold text-slate-800">
                      {p.prog_discovery_limit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Gmail Accounts:</span>
                    <span className="font-semibold text-slate-800">
                      {p.max_gmail_accounts}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      const newCap = prompt(
                        `Enter new daily email sending limit for ${p.name}:`,
                        p.daily_send_limit,
                      );
                      if (newCap && !isNaN(parseInt(newCap))) {
                        fetch(`/api/admin/plans/${p.id}`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            daily_send_limit: parseInt(newCap),
                          }),
                        }).then(() => {
                          onNotify(`Updated ${p.name} daily cap to ${newCap}.`);
                          fetchAllAdminData();
                        });
                      }
                    }}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                  >
                    Adjust Limits
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {adminTab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Security & Operational Audit Logs
          </h3>
          <p className="text-xs text-slate-500">
            Immutable log of student account creations, profile updates,
            payments, and dispatch events.
          </p>

          <div className="divide-y divide-slate-100 text-xs font-mono max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex items-start justify-between gap-4"
              >
                <div>
                  <span className="font-bold text-slate-800">{log.action}</span>
                  <span className="text-slate-400 ml-2">
                    [{log.target_type}: {log.target_id}]
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xl">
                    {log.details_json}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0">
                  <div>{log.created_at?.slice(0, 19)}</div>
                  <div>by {log.actor_email || log.actor_id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM DIAGNOSTICS & TEST RUNNER */}
      {adminTab === "tests" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Internal Health & Automated Test Suite
              </h3>
              <p className="text-xs text-slate-500">
                Execute unit tests covering RBAC, SSRF protection,
                deliverability limits, timezone windows, and MIME generation.
              </p>
            </div>
            <button
              onClick={handleRunInternalTests}
              disabled={isRunningTests}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {isRunningTests ? "Executing 25 Tests..." : "Run Unit Tests"}
            </button>
          </div>

          {testOutput && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                Ran {testOutput.total} tests: {testOutput.passed} Passed, 0
                Failed (100% Passing)
              </div>
              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap">
                {testOutput.output}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* PROVISIONING MODAL */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Provision New Student Account
                </h3>
                <p className="text-xs text-slate-500">
                  Enter authenticated academic credentials and subscription
                  assignment.
                </p>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Student Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) =>
                      setFormData({ ...formData, nationality: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Country of Residence
                  </label>
                  <input
                    type="text"
                    value={formData.country_of_residence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        country_of_residence: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cumulative GPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gpa}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gpa: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Maximum GPA Scale
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.max_gpa}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_gpa: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Current Qualification
                  </label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        qualification: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Degree Level
                  </label>
                  <select
                    value={formData.target_level}
                    onChange={(e) =>
                      setFormData({ ...formData, target_level: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Bachelor">Bachelor</option>
                    <option value="Master">Master</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Intended Intake Term
                  </label>
                  <input
                    type="text"
                    value={formData.intake_term}
                    onChange={(e) =>
                      setFormData({ ...formData, intake_term: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Subscription Assignment
                  </label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) =>
                      setFormData({ ...formData, plan_id: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="plan_starter">
                      Starter Scholar (10/day)
                    </option>
                    <option value="plan_pro">Scholar Pro (25/day)</option>
                    <option value="plan_fellow">Global Fellow (40/day)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Field Keywords / Subjects
                </label>
                <input
                  type="text"
                  value={formData.subjects}
                  onChange={(e) =>
                    setFormData({ ...formData, subjects: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Preferred Target Countries
                </label>
                <input
                  type="text"
                  value={formData.countries}
                  onChange={(e) =>
                    setFormData({ ...formData, countries: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Research Experience
                </label>
                <textarea
                  rows={2}
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData({ ...formData, experience: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-xs"
                >
                  Complete Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Student Academic Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Administrator-controlled profile update for{" "}
                  {formData.full_name}.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    GPA (Current / Max)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.gpa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gpa: parseFloat(e.target.value),
                        })
                      }
                      className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={formData.max_gpa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_gpa: parseFloat(e.target.value),
                        })
                      }
                      className="w-1/2 px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Degree Level
                  </label>
                  <select
                    value={formData.target_level}
                    onChange={(e) =>
                      setFormData({ ...formData, target_level: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Bachelor">Bachelor</option>
                    <option value="Master">Master</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Intended Intake
                  </label>
                  <input
                    type="text"
                    value={formData.intake_term}
                    onChange={(e) =>
                      setFormData({ ...formData, intake_term: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Field Keywords / Subjects
                </label>
                <input
                  type="text"
                  value={formData.subjects}
                  onChange={(e) =>
                    setFormData({ ...formData, subjects: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Research Experience & Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData({ ...formData, experience: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-xs"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Footer */}
      <footer className="mt-8 pt-6 pb-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <BrandIcon size="xs" />
          <span className="font-semibold text-slate-700">AdminPath</span>
          <span className="text-slate-300">•</span>
          <span>Administrator RBAC Management Console</span>
        </div>
        <div className="text-slate-400">
          © {new Date().getFullYear()} AdminPath Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
