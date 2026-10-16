import React, { useState } from "react";
import {
  Lock,
  Mail,
  ArrowRight,
  Shield,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import BrandIcon from "./BrandIcon";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: any) => void;
  onBackToPublic?: () => void;
}

export default function LoginView({
  onLoginSuccess,
  onBackToPublic,
}: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      // Store session token in localStorage
      if (data.token) {
        localStorage.setItem("adminpath_token", data.token);
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Login failed. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand & Title Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white shadow-xs border border-slate-200 mb-3">
          <BrandIcon size="lg" />
        </div>
        <h2 className="font-serif-editorial text-3xl font-bold tracking-tight text-slate-900">
          Sign In to AdminPath
        </h2>
        <p className="mt-2 text-xs text-slate-600 max-w-sm mx-auto">
          Access your personal university admissions workspace, verified program
          discoveries, and deliverability-safe outreach.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-8 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.edu"
                  required
                  autoComplete="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Sign In to Workspace <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {onBackToPublic && (
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={onBackToPublic}
                className="text-xs text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
              >
                Return to Public Website
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-700" />
          <span>PBKDF2-HMAC-SHA256 • Server-Side Session Invalidation</span>
        </div>
      </div>
    </div>
  );
}
