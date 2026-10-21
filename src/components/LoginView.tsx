import React, { useEffect, useState } from "react";
import {
  Lock,
  Mail,
  ArrowRight,
  Shield,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import BrandIcon from "./BrandIcon";
import Pip from "./Pip";

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_expired: "The Google sign-in took too long. Please try again.",
  google_unverified: "That Google account has no verified email address.",
  google_conflict: "This email is already linked to a different Google account.",
  google_not_configured: "Google sign-in is not set up on the server yet.",
  google_failed: "Google sign-in failed. Please try again.",
  suspended: "Your account has been suspended. Please contact support.",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

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
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    return code ? GOOGLE_ERRORS[code] || GOOGLE_ERRORS.google_failed : null;
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setIsGoogleLoading(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const handleGoogle = () => {
    setIsGoogleLoading(true);
    window.location.assign("/api/auth/google/start");
  };

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

      onLoginSuccess("cookie", data.user);
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
        <div className="flex justify-center mb-1">
          <Pip size={84} />
        </div>
        <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white shadow-xs border border-slate-200 mb-3">
          <BrandIcon size="lg" />
        </div>
        <h2 className="font-serif-editorial text-3xl font-bold tracking-tight text-slate-900">
          Sign in or create your account
        </h2>
        <p className="mt-2 text-xs text-slate-600 max-w-sm mx-auto">
          New here? Continue with Google and we will set up your free workspace
          in under a minute.
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

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? <RotateCw className="h-4 w-4 animate-spin" /> : <GoogleMark />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or sign in with email
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
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
              className="w-full py-2.5 px-4 rounded-lg bg-[#4f3fd0] hover:bg-[#4034a8] text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
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
          <span>We only get your name and email from Google. Gmail sending is a separate, optional step.</span>
        </div>
      </div>
    </div>
  );
}
