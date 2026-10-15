import React, { useState } from 'react';
import {
  Send,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Mail,
  Clock,
  X
} from 'lucide-react';

interface StartSendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueData: any;
  gmailConnected: boolean;
  onDispatchComplete: () => void;
  onNotify: (msg: string) => void;
}

export default function StartSendingModal({
  isOpen,
  onClose,
  queueData,
  gmailConnected,
  onDispatchComplete,
  onNotify
}: StartSendingModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [resultSummary, setResultSummary] = useState<any>(null);

  if (!isOpen) return null;

  const pendingCount = (queueData.items || []).filter((i: any) => i.status === 'pending').length;
  const remainingQuota = queueData.remaining_daily_quota ?? Math.max(0, (queueData.daily_cap || 20) - (queueData.sent_today || 0));

  const handleExecuteSending = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/queue/start-sending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setResultSummary(data);
        onNotify(data.message || 'Applications dispatched.');
        onDispatchComplete();
      } else {
        alert('Sending error: ' + (data.error || 'Failed to dispatch applications.'));
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Start Sending Applications</h3>
              <p className="text-[11px] text-slate-500">Atomic dispatch with quota & delivery protection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {resultSummary ? (
          <div className="py-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Batch Dispatch Completed</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              {resultSummary.message}
            </p>

            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs">
              <div>
                <span className="text-slate-400 block">Sent</span>
                <span className="text-emerald-700 font-bold text-base">{resultSummary.sent}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Skipped/Paused</span>
                <span className="text-slate-700 font-bold text-base">{resultSummary.skipped}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Daily Quota Left</span>
                <span className="text-slate-900 font-bold text-base">{resultSummary.remaining_daily_quota}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => {
                  setResultSummary(null);
                  onClose();
                }}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46]"
              >
                Close Summary
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4 text-xs text-slate-700">
            {/* Quota & Safeguards Status Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Subscription Plan:</span>
                <span className="font-bold text-slate-900">{queueData.plan_name || 'Scholar Pro'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Daily Quota Allowance:</span>
                <span className="font-bold text-slate-900">{queueData.daily_cap || 25} emails / day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Available Today:</span>
                <span className="font-bold text-emerald-700">{remainingQuota} emails remaining</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Approved Inquiries in Queue:</span>
                <span className="font-bold text-slate-900">{pendingCount} ready</span>
              </div>
            </div>

            {/* Safeguards Notice */}
            <div className="space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Enforces 60–240s randomized gaps to prevent burst spam triggers.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Checks suppression list and 7-day follow-up pause per recipient.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Dispatches via your connected Gmail account using MIME multipart.</span>
              </div>
            </div>

            {!gmailConnected && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Gmail Disconnected</span>
                  You must connect your Google account in the <strong>Gmail Account</strong> tab before applications can be dispatched.
                </div>
              </div>
            )}

            {remainingQuota <= 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Daily Quota Reached</span>
                  Your daily limit of {queueData.daily_cap || 25} applications has been reached. Quota resets at 00:00 UTC.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSending}
                disabled={isSending || !gmailConnected || remainingQuota <= 0 || pendingCount === 0}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] shadow-2xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSending ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    Dispatching Inquiries...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Start Sending ({Math.min(pendingCount, remainingQuota)})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
