import React, { useState, useEffect } from 'react';
import {
  Mail,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Lock,
  Send,
  LogOut,
  ExternalLink,
  Info,
  KeyRound
} from 'lucide-react';

interface GmailTabProps {
  onNotify: (msg: string) => void;
}

export default function GmailTab({ onNotify }: GmailTabProps) {
  const [gmailStatus, setGmailStatus] = useState<any>({
    connected: false,
    email: null,
    scopes: 'https://www.googleapis.com/auth/gmail.send',
    connected_since: null,
    last_test_sent_at: null,
    status_label: 'Disconnected'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [customConnectEmail, setCustomConnectEmail] = useState('');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/gmail/status');
      if (res.ok) {
        const data = await res.json();
        setGmailStatus(data);
      }
    } catch (err) {
      console.error('Error fetching Gmail status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async (emailToUse?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gmail/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse || customConnectEmail || 'alex.scholar@gmail.com' })
      });
      const data = await res.json();
      if (res.ok) {
        onNotify(data.message || 'Gmail account connected successfully.');
        setIsConnectModalOpen(false);
        fetchStatus();
      } else {
        onNotify('Error: ' + data.error);
      }
    } catch (err: any) {
      onNotify('Connection error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Gmail account? You will not be able to send university applications until you reconnect.')) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/gmail/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        onNotify(data.message || 'Gmail account disconnected.');
        fetchStatus();
      }
    } catch (err: any) {
      onNotify('Disconnection error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/gmail/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        onNotify(data.message);
        fetchStatus();
      } else {
        onNotify('Test failed: ' + data.error);
      }
    } catch (err: any) {
      onNotify('Error: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="font-serif-editorial text-2xl font-bold text-slate-900">
          Gmail Account Integration
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Connect your personal Google account to send verified academic inquiry emails directly from your own inbox.
        </p>
      </div>

      {/* Main Connection Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              gmailStatus.connected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {gmailStatus.connected ? gmailStatus.email : 'No Gmail Account Connected'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                  gmailStatus.connected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {gmailStatus.connected ? 'Authorized & Active' : 'Disconnected'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {gmailStatus.connected
                  ? 'All approved university inquiries will be sent using this verified mailbox.'
                  : 'You must connect your Gmail account before Start Sending can dispatch applications.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gmailStatus.connected ? (
              <>
                <button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 text-slate-500" />
                  {isSendingTest ? 'Verifying...' : 'Send Test Ping'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsConnectModalOpen(true)}
                disabled={isLoading}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-2xs transition flex items-center gap-1.5"
              >
                <Mail className="h-4 w-4" />
                Connect Gmail Account
              </button>
            )}
          </div>
        </div>

        {/* OAuth Details & Metadata */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block">Least-Privilege Scopes</span>
            <span className="font-semibold text-slate-800 block mt-0.5 font-mono text-[11px] truncate" title={gmailStatus.scopes}>
              gmail.send, userinfo.email
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block">Token Encryption</span>
            <span className="font-semibold text-slate-800 block mt-0.5 flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-700" /> AES-256-GCM at rest
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-500 block">Last Test Verification</span>
            <span className="font-semibold text-slate-800 block mt-0.5">
              {gmailStatus.last_test_sent_at || 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Confidentiality Disclosures */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-emerald-700" />
          Sender Privacy & Delivery Safeguards
        </h4>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Shared Mailboxes:</strong> Applications are dispatched strictly through your personal student Google account. Universities see your authentic identity as the sender.
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Least-Privilege Protection:</strong> AdminPath only requests permission to compose and send approved messages. We never read your existing personal emails or download inbox folders.
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Automated Quota Limits:</strong> Dispatch is throttled to respect Gmail’s safe sending policies (10–40 emails/day), preventing spam triggers or account suspension.
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Mandatory Human Gate:</strong> No message is ever dispatched without your explicit draft review and approval.
            </span>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Authorize Google Account</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select or enter your Gmail address to initiate OAuth 2.0 connection.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Student Gmail Address</label>
                <input
                  type="email"
                  value={customConnectEmail}
                  onChange={(e) => setCustomConnectEmail(e.target.value)}
                  placeholder="alex.scholar@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">OAuth Permissions Requested:</div>
                <div>• https://www.googleapis.com/auth/gmail.send</div>
                <div>• https://www.googleapis.com/auth/userinfo.email</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConnect()}
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-xs"
                >
                  {isLoading ? 'Authorizing...' : 'Authorize Gmail'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
