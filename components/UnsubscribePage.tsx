import React, { useState } from 'react';

const RELAY_URL = 'http://localhost:3001';
const RELAY_AUTH_TOKEN = import.meta.env.VITE_RELAY_AUTH_TOKEN || '';

interface UnsubscribePageProps {
  campaignLeadId: string;
  email: string;
}

const UnsubscribePage: React.FC<UnsubscribePageProps> = ({ campaignLeadId, email }) => {
  const [status, setStatus] = useState<'confirm' | 'processing' | 'done' | 'error'>('confirm');

  const handleUnsubscribe = async () => {
    setStatus('processing');
    try {
      const response = await fetch(RELAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RELAY_AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          action: 'unsubscribe',
          email: decodeURIComponent(email),
          campaign_lead_id: campaignLeadId,
        }),
      });
      if (!response.ok) throw new Error('Failed to unsubscribe');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 bg-[#0B3060] rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-serif text-xl font-bold">P</span>
        </div>

        {status === 'confirm' && (
          <>
            <h1 className="text-2xl font-serif font-bold text-[#0B3060] mb-3">
              Unsubscribe
            </h1>
            <p className="text-[#64748B] mb-2 text-sm">
              Are you sure you want to unsubscribe?
            </p>
            <p className="text-[#94A3B8] mb-8 text-xs">
              {decodeURIComponent(email)}
            </p>
            <button
              onClick={handleUnsubscribe}
              className="w-full py-3 bg-[#0B3060] text-white rounded-xl font-semibold text-sm hover:bg-[#0a2850] transition-all active:scale-[0.98]"
            >
              Confirm Unsubscribe
            </button>
            <p className="mt-4 text-xs text-[#94A3B8]">
              You will no longer receive emails from The Provider System.
            </p>
          </>
        )}

        {status === 'processing' && (
          <>
            <div className="w-10 h-10 border-3 border-[#FF9F1C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#64748B] font-medium">Processing...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#0B3060] mb-3">
              You have been unsubscribed
            </h1>
            <p className="text-[#64748B] text-sm">
              Thank you for your time. You will no longer receive emails from us.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-2xl font-serif font-bold text-[#0B3060] mb-3">
              Something went wrong
            </h1>
            <p className="text-[#64748B] text-sm mb-6">
              Please try again or contact us directly.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="px-6 py-3 bg-[#0B3060] text-white rounded-xl font-semibold text-sm hover:bg-[#0a2850] transition-all"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;
