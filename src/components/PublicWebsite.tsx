import React, { useState } from "react";
import {
  Compass,
  GraduationCap,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Mail,
  Send,
  Zap,
  Lock,
  Globe,
  Clock,
  HelpCircle,
  FileCheck,
  Building2,
  Users,
  X,
  CreditCard,
} from "lucide-react";

interface PublicWebsiteProps {
  onSignInClick: () => void;
  onSelectPlan: (planId: string) => void;
}

export default function PublicWebsite({
  onSignInClick,
  onSelectPlan,
}: PublicWebsiteProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [selectedPlanModal, setSelectedPlanModal] = useState<any>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<
    "terms" | "privacy" | "contact" | null
  >(null);

  const plans = [
    {
      id: "plan_starter",
      name: "Starter Scholar",
      badge: "Self-Starter",
      price: billingCycle === "monthly" ? 29 : 24,
      desc: "Ideal for prospective students exploring admissions requirements and initiating targeted inquiries.",
      dailyCap: 10,
      monthlyCap: 150,
      features: [
        "10 Personalized application emails / day",
        "150 Monthly application dispatch cap",
        "50 University catalog searches",
        "100 Verified programme discoveries",
        "1 Connected student Gmail account",
        "RFC 2822 dual-part MIME protection",
        "Standard admissions email support",
      ],
    },
    {
      id: "plan_pro",
      name: "Scholar Pro",
      badge: "Most Popular",
      popular: true,
      price: billingCycle === "monthly" ? 69 : 55,
      desc: "The comprehensive suite for active university applicants seeking maximum admissions engagement.",
      dailyCap: 25,
      monthlyCap: 400,
      features: [
        "25 Personalized application emails / day",
        "400 Monthly application dispatch cap",
        "200 University catalog searches",
        "500 Verified academic programme matches",
        "1 Connected student Gmail account",
        "AI Curriculum-Matched Research Hooks",
        "Recipient Timezone Window Protection (08:00–17:00)",
        "Full Document Vault (CV & Transcripts)",
        "Priority departmental inquiry assistance",
      ],
    },
    {
      id: "plan_fellow",
      name: "Global Fellow",
      badge: "Maximum Deliverability",
      price: billingCycle === "monthly" ? 149 : 119,
      desc: "High-intensity admissions campaigns with direct assistance and maximum safe email deliverability.",
      dailyCap: 40,
      monthlyCap: 800,
      features: [
        "40 Personalized application emails / day (Safe Cap)",
        "800 Monthly application dispatch cap",
        "Unlimited global university discoveries",
        "800 AI Bespoke Application Drafts",
        "2 Connected student Gmail accounts",
        "Automated bounce circuit breaker (<5%)",
        "Custom faculty research & lab alignment",
        "Dedicated admissions consultant review SLA",
      ],
    },
  ];

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !selectedPlanModal) return;
    setIsCheckingOut(true);

    try {
      // 1. Create checkout session
      const checkoutRes = await fetch("/api/public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlanModal.id,
          customer_email: customerEmail,
          customer_name: customerName,
          billing_interval: billingCycle,
        }),
      });
      const checkoutData = await checkoutRes.json();

      // 2. Simulate verified Stripe payment webhook delivery
      const webhookRes = await fetch("/api/webhooks/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=1730000000,v1=simulated_valid_hmac_signature",
        },
        body: JSON.stringify({
          event_id: "evt_stripe_" + Date.now(),
          event_type: "checkout.session.completed",
          data: {
            customer_email: customerEmail,
            customer_name: customerName,
            plan_id: selectedPlanModal.id,
            amount_cents: selectedPlanModal.price * 100,
            payment_id:
              "ch_verified_" + Math.random().toString(36).substring(2, 9),
          },
        }),
      });
      const webhookData = await webhookRes.json();

      setCheckoutSuccess({
        plan: selectedPlanModal,
        email: customerEmail,
        subscription_id: webhookData.subscription_id,
        status: webhookData.status,
      });
    } catch (err: any) {
      alert("Checkout error: " + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-emerald-700 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-serif-editorial text-2xl font-bold tracking-tight text-slate-900">
                AdminPath
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                SaaS Admissions Engine
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-emerald-700 transition">
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-emerald-700 transition"
            >
              How It Works
            </a>
            <a href="#pricing" className="hover:text-emerald-700 transition">
              Pricing
            </a>
            <button
              onClick={() => setActiveLegalModal("privacy")}
              className="hover:text-emerald-700 transition"
            >
              Compliance
            </button>
            <button
              onClick={() => setActiveLegalModal("contact")}
              className="hover:text-emerald-700 transition"
            >
              Support
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignInClick}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Sign In
            </button>
            <a
              href="#pricing"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-xs transition"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-200 bg-linear-to-b from-white via-slate-50 to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Empowering Global Scholars & University Admissions
          </div>

          <h1 className="font-serif-editorial text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
            Discover Worldwide Programmes & Connect with Admissions from Your
            Own Gmail
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            AdminPath combines verified university catalogues, AI-crafted
            research alignment, and deliverability-safe outreach. Managed
            seamlessly by administrators, powered for individual students.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#pricing"
              className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-sm flex items-center justify-center gap-2 transition"
            >
              Subscribe for Student <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={onSignInClick}
              className="w-full sm:w-auto px-6 py-3.5 text-base font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              Access Student or Admin Portal
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            {[
              {
                label: "Universities Indexed",
                val: "1,200+",
                sub: "Across 16 countries",
              },
              {
                label: "Verified Contacts",
                val: "100% Public",
                sub: "Admissions desks & faculty",
              },
              {
                label: "Deliverability Protection",
                val: "08:00–17:00",
                sub: "Recipient local timezone",
              },
              {
                label: "Mailbox Isolation",
                val: "Private OAuth",
                sub: "Sent through student account",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs"
              >
                <div className="font-serif-editorial text-2xl font-bold text-slate-900">
                  {stat.val}
                </div>
                <div className="text-xs font-semibold text-emerald-800 mt-0.5">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-20 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
              Workflow
            </h2>
            <p className="font-serif-editorial text-3xl sm:text-4xl font-bold text-slate-900">
              The 4-Step Student Application Journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Purchase Subscription",
                desc: "Select a monthly plan with tailored daily sending and discovery caps. Payment is verified and recorded.",
                icon: CreditCard,
              },
              {
                step: "02",
                title: "Admin Provisions Account",
                desc: "Your administrator configures the student profile (GPA, qualifications, target degree, research achievements).",
                icon: Users,
              },
              {
                step: "03",
                title: "Discover & Review AI Drafts",
                desc: "Explore matched global programmes. AI drafts bespoke academic inquiry emails tailored to the curriculum.",
                icon: Sparkles,
              },
              {
                step: "04",
                title: "Start Sending via Gmail",
                desc: "Connect your personal Google account. Click Start Sending to dispatch approved emails within daily quotas.",
                icon: Send,
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="relative bg-[#f8fafc] p-6 rounded-xl border border-slate-200"
                >
                  <div className="text-3xl font-serif-editorial font-bold text-slate-300 mb-3">
                    {item.step}
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section
        id="features"
        className="py-20 bg-[#f8fafc] border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
              Security & Deliverability
            </h2>
            <p className="font-serif-editorial text-3xl sm:text-4xl font-bold text-slate-900">
              Built for Institutional Trust & Integrity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Lock,
                title: "Strictly Read-Only Student Profiles",
                desc: "Academic records, GPA, nationality, and test scores are entered and managed solely by authorized administrators to prevent fraudulent credentials.",
              },
              {
                icon: Mail,
                title: "Direct Student Gmail OAuth",
                desc: "Applications dispatch directly through the student’s own Google account using least-privilege gmail.send scopes. Never shared, never spoofed.",
              },
              {
                icon: Clock,
                title: "Recipient Timezone Windows",
                desc: "Outreach is scheduled strictly between 08:00 and 17:00 recipient local time, ensuring applications arrive during standard office hours.",
              },
              {
                icon: Zap,
                title: "Daily & Monthly Quota Enforcement",
                desc: "Atomic queue reservation prevents burst spam. Send caps (10 to 40/day) maintain pristine sender domain reputation.",
              },
              {
                icon: Shield,
                title: "Polite Crawler & SSRF Protections",
                desc: "Program discovery respects robots.txt directives and defends against SSRF by blocking cloud metadata and private network subnets.",
              },
              {
                icon: FileCheck,
                title: "Encrypted Document Vault",
                desc: "CVs, transcripts, and statement of purpose documents (<20MB) are verified with strict MIME type validation and encrypted storage.",
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs"
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-20 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
              Subscription Plans
            </h2>
            <p className="font-serif-editorial text-3xl sm:text-4xl font-bold text-slate-900">
              Predictable, Transparent Pricing
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Each subscription covers full application management for one
              student account.
            </p>

            {/* Billing Interval Toggle */}
            <div className="mt-6 inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${billingCycle === "monthly" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${billingCycle === "annual" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Annual Billing (Save 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`relative bg-white rounded-2xl border p-8 flex flex-col justify-between transition-all ${
                  p.popular
                    ? "border-emerald-600 shadow-lg ring-1 ring-emerald-600"
                    : "border-slate-200 shadow-2xs hover:shadow-md"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-700 text-white text-[11px] font-semibold tracking-wide uppercase rounded-full shadow-xs">
                    Recommended Plan
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      {p.name}
                    </h3>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {p.badge}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 leading-relaxed min-h-[36px]">
                    {p.desc}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-serif-editorial text-slate-900">
                      ${p.price}
                    </span>
                    <span className="text-xs text-slate-500">/ month</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium mt-1">
                    Daily Cap: {p.dailyCap} emails • Monthly Cap: {p.monthlyCap}{" "}
                    emails
                  </div>

                  <hr className="my-6 border-slate-100" />

                  <ul className="space-y-3">
                    {p.features.map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-700"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => {
                      setSelectedPlanModal(p);
                      setCheckoutSuccess(null);
                    }}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition shadow-xs ${
                      p.popular
                        ? "bg-[#047857] text-white hover:bg-[#065f46]"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Select {p.name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-white/10 flex items-center justify-center text-white">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="font-serif-editorial text-xl font-bold text-white tracking-tight">
                AdminPath
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <button
                onClick={() => setActiveLegalModal("terms")}
                className="hover:text-white transition"
              >
                Terms of Service
              </button>
              <button
                onClick={() => setActiveLegalModal("privacy")}
                className="hover:text-white transition"
              >
                Privacy Policy (GDPR / CASL)
              </button>
              <button
                onClick={() => setActiveLegalModal("contact")}
                className="hover:text-white transition"
              >
                Contact Admissions Support
              </button>
              <button
                onClick={onSignInClick}
                className="hover:text-white transition"
              >
                Portal Sign In
              </button>
            </div>

            <div className="text-xs text-slate-500">
              © {new Date().getFullYear()} AdminPath SaaS Platform. All rights
              reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Subscribe for Student
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedPlanModal.name} (${selectedPlanModal.price}/mo)
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {checkoutSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Payment Confirmed & Verified!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Subscription{" "}
                  <strong>{checkoutSuccess.subscription_id}</strong> is
                  registered. Status:{" "}
                  <span className="text-emerald-700 font-semibold">
                    {checkoutSuccess.status}
                  </span>
                  .
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs text-slate-700 space-y-1">
                  <div>
                    <strong>Customer Email:</strong> {checkoutSuccess.email}
                  </div>
                  <div>
                    <strong>Assigned Plan:</strong> {checkoutSuccess.plan.name}
                  </div>
                  <div>
                    <strong>Status:</strong> Awaiting Administrator Student
                    Account Provisioning
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Your administrator will now create the academic profile. Once
                  completed, login credentials will be issued.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedPlanModal(null);
                      setCheckoutSuccess(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPlanModal(null);
                      onSignInClick();
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white"
                  >
                    Go to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Purchaser / Sponsor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Dr. Arthur Vance"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Student Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="student@example.edu"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    The subscription will be provisioned for this student
                    address.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-700" />
                    Verified Stripe Idempotent Payment
                  </div>
                  <div>
                    Amount to Charge:{" "}
                    <strong>${selectedPlanModal.price}.00 USD</strong> (
                    {billingCycle})
                  </div>
                  <div>
                    Daily sending limit: {selectedPlanModal.dailyCap} verified
                    inquiries/day
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanModal(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingOut}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-xs disabled:opacity-50"
                  >
                    {isCheckingOut
                      ? "Processing Payment..."
                      : `Confirm & Pay $${selectedPlanModal.price}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Legal & Compliance Modals */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {activeLegalModal === "terms"
                  ? "Terms of Service"
                  : activeLegalModal === "privacy"
                    ? "Privacy Policy & Compliance"
                    : "Admissions Support"}
              </h3>
              <button
                onClick={() => setActiveLegalModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 text-xs text-slate-700 space-y-3 leading-relaxed">
              {activeLegalModal === "terms" && (
                <>
                  <p>
                    <strong>1. Acceptance of Terms:</strong> By subscribing to
                    AdminPath, you agree to comply with all university
                    admissions regulations, institutional policies, and
                    communication standards.
                  </p>
                  <p>
                    <strong>
                      2. Academic Inquiries vs. Formal Admissions:
                    </strong>{" "}
                    AdminPath provides academic inquiry generation and
                    deliverability safeguards. Sending an inquiry email does NOT
                    constitute a formal university application submission when
                    an official admissions portal is mandated.
                  </p>
                  <p>
                    <strong>3. Mailbox Authorization:</strong> Each student
                    connects their own Gmail account via OAuth. AdminPath does
                    not harvest passwords and respects Gmail quota limitations.
                  </p>
                  <p>
                    <strong>4. Quotas & Fair Use:</strong> Daily and monthly
                    quotas are enforced strictly on the backend to prevent spam
                    and preserve institutional domain reputation.
                  </p>
                </>
              )}

              {activeLegalModal === "privacy" && (
                <>
                  <p>
                    <strong>GDPR / PECR / CASL Compliance:</strong> AdminPath
                    operates under strict data minimization standards. Student
                    documents and OAuth tokens are encrypted at rest using
                    AES-256-GCM.
                  </p>
                  <p>
                    <strong>Right to Access & Erasure:</strong> Students may
                    export all stored personal data in JSON format or trigger
                    one-click permanent erasure under GDPR Article 17.
                  </p>
                  <p>
                    <strong>Do-Not-Contact Suppression:</strong> Global and
                    per-student suppression lists prevent emailing any contact
                    who has opted out.
                  </p>
                </>
              )}

              {activeLegalModal === "contact" && (
                <>
                  <p>
                    Need assistance with student provisioning, subscription
                    changes, or university verification?
                  </p>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div>
                      <strong>Admissions Support:</strong> support@admitpath.app
                    </div>
                    <div>
                      <strong>Administrator Desk:</strong> admin@admitpath.app
                    </div>
                    <div>
                      <strong>Response Time:</strong> Within 1 business day for
                      active subscribers.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveLegalModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
