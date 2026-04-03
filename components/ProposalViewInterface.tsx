import React, { useState, useEffect } from 'react';
import { Check, Loader2, FileText } from 'lucide-react';
import { supabase } from '../services/supabase';

const ProposalViewInterface: React.FC<{ proposalId: string }> = ({ proposalId }) => {
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
      setProposal(data);
      if (data?.status === 'Accepted') setAccepted(true);
      setLoading(false);
    };
    load();
  }, [proposalId]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const now = new Date().toISOString();
      // Update proposal status
      await supabase.from('proposals').update({ status: 'Accepted', accepted_at: now }).eq('id', proposalId);

      // Auto-create contract
      const lineItems = typeof proposal.line_items === 'string' ? JSON.parse(proposal.line_items) : (proposal.line_items || []);
      const contractContent = `Accepted Proposal: ${proposal.title}\n\nLine Items:\n${lineItems.map((i: any) => `- ${i.description}: $${i.price}`).join('\n')}\n\nTotal: $${proposal.total}\n\nTerms: ${proposal.terms}`;
      await supabase.from('contracts').upsert({
        id: `contract-from-prop-${proposalId}`,
        client_id: proposal.client_id,
        recipient_name: '',
        recipient_email: '',
        title: `Contract: ${proposal.title}`,
        content: contractContent,
        status: 'Signed',
        created_at: now,
        signed_at: now,
      });

      // Auto-create invoice record
      await supabase.from('payments').upsert({
        id: `inv-from-prop-${proposalId}`,
        client_id: proposal.client_id,
        stripe_customer_id: '',
        stripe_id: '',
        amount: proposal.total,
        currency: 'usd',
        type: 'Invoice',
        status: 'Past Due',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stripe_link: '',
        notes: `From proposal: ${proposal.title}`,
      });

      setAccepted(true);
    } catch (err) { console.error('Accept error:', err); }
    finally { setAccepting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FF9F1C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <p className="text-2xl font-serif font-bold text-[#1A1A2E]">Proposal not found</p>
      </div>
    );
  }

  const lineItems = typeof proposal.line_items === 'string' ? JSON.parse(proposal.line_items) : (proposal.line_items || []);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF9F1C] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF9F1C]/20">
            <span className="text-white font-serif text-2xl font-bold">P</span>
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A1A2E]">ProviderOS</h1>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-bold">Proposal</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="luminous-card bg-white/80 p-8">
          <h2 className="text-3xl font-serif font-bold text-[#1A1A2E] mb-2">{proposal.title}</h2>
          {proposal.expires_at && (
            <p className="text-xs text-[#64748B]">Valid until {new Date(proposal.expires_at).toLocaleDateString()}</p>
          )}
        </div>

        <div className="luminous-card bg-white/80 p-8">
          <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-6">Scope of Work</h3>
          <div className="space-y-4">
            {lineItems.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-[#E2E8F0]/50 last:border-0">
                <span className="text-sm font-medium text-[#1A1A2E]">{item.description}</span>
                <span className="text-lg font-serif font-bold text-[#1A1A2E]">${Number(item.price).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t-2 border-[#1A1A2E] flex justify-between items-center">
            <span className="text-sm font-bold text-[#64748B] uppercase tracking-wide">Total</span>
            <span className="text-4xl font-serif font-bold text-[#1A1A2E]">${Number(proposal.total).toLocaleString()}</span>
          </div>
        </div>

        {proposal.terms && (
          <div className="luminous-card bg-white/80 p-8">
            <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-3">Terms & Conditions</h3>
            <p className="text-sm text-[#64748B] whitespace-pre-wrap">{proposal.terms}</p>
          </div>
        )}

        <div className="text-center py-4">
          {accepted ? (
            <div className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
              <Check size={20} />
              <span className="text-lg font-bold">Proposal Accepted</span>
            </div>
          ) : (
            <button onClick={handleAccept} disabled={accepting}
              className="inline-flex items-center gap-2 px-10 py-4 bg-[#FF9F1C] text-white text-lg font-bold rounded-2xl hover:bg-[#A07608] transition-all shadow-xl shadow-[#FF9F1C]/20 disabled:opacity-50">
              {accepting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              Accept Proposal
            </button>
          )}
        </div>

        <footer className="text-center py-8 text-xs text-[#64748B]">Powered by ProviderOS</footer>
      </div>
    </div>
  );
};

export default ProposalViewInterface;
