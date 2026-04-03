import React, { useState, useEffect } from 'react';
import { CreditCard, Briefcase, FileText, ExternalLink, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface PortalData {
  client: any;
  payments: any[];
  projects: any[];
  contracts: any[];
}

const ClientPortal: React.FC<{ clientId: string }> = ({ clientId }) => {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [clientRes, paymentsRes, projectsRes, contractsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase.from('payments').select('*').eq('client_id', clientId),
          supabase.from('projects').select('*').eq('client_id', clientId),
          supabase.from('contracts').select('*').eq('client_id', clientId),
        ]);
        setData({
          client: clientRes.data,
          payments: paymentsRes.data || [],
          projects: projectsRes.data || [],
          contracts: contractsRes.data || [],
        });
      } catch (err) { console.error('Portal load error:', err); }
      finally { setLoading(false); }
    };
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF9F1C] border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-[#64748B] font-serif italic">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-serif font-bold text-[#1A1A2E] mb-2">Portal Not Found</p>
          <p className="text-[#64748B]">This client portal link is not valid.</p>
        </div>
      </div>
    );
  }

  const client = data.client;
  const statusIcon = (status: string) => {
    if (status === 'Paid' || status === 'paid') return <CheckCircle size={16} className="text-emerald-500" />;
    if (status === 'Past Due') return <AlertTriangle size={16} className="text-red-500" />;
    return <Clock size={16} className="text-amber-500" />;
  };

  const projectStatusColor = (status: string) => {
    switch (status) {
      case 'Finished': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Blocked': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9F1C] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF9F1C]/20">
              <span className="text-white font-serif text-2xl font-bold">P</span>
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[#1A1A2E]">ProviderOS</h1>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-bold">Client Portal</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Client Info */}
        <div className="luminous-card bg-white/80 p-8">
          <h2 className="text-3xl font-serif font-bold text-[#1A1A2E] mb-1">{client.company_name || client.primary_contact}</h2>
          <p className="text-sm text-[#64748B]">{client.email} {client.phone ? `• ${client.phone}` : ''}</p>
          <div className="mt-4 flex gap-4">
            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">{client.status}</span>
            {client.service_package && <span className="px-4 py-1.5 bg-[#FF9F1C]/10 text-[#FF9F1C] rounded-full text-xs font-bold border border-[#FF9F1C]/20">{client.service_package}</span>}
          </div>
        </div>

        {/* Invoices */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-[#FF9F1C]" />
            <h3 className="text-xl font-serif font-bold text-[#1A1A2E]">Invoices & Payments</h3>
          </div>
          {data.payments.length > 0 ? (
            <div className="space-y-3">
              {data.payments.map((p: any) => (
                <div key={p.id} className="luminous-card bg-white/80 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(p.status)}
                    <div>
                      <p className="text-sm font-bold text-[#1A1A2E]">{p.notes || p.type || 'Payment'}</p>
                      <p className="text-xs text-[#64748B]">{p.due_date ? new Date(p.due_date).toLocaleDateString() : ''} • {p.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-serif font-bold text-[#1A1A2E]">${Number(p.amount).toLocaleString()}</span>
                    {p.stripe_link && (
                      <a href={p.stripe_link} target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#1A1A2E] text-white text-xs font-bold rounded-xl hover:bg-[#0a2850] transition-all flex items-center gap-1">
                        {p.status === 'Paid' ? 'Receipt' : 'Pay Now'} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#64748B] font-serif italic text-center py-8">No invoices yet</p>
          )}
        </div>

        {/* Projects */}
        {data.projects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={20} className="text-[#FF9F1C]" />
              <h3 className="text-xl font-serif font-bold text-[#1A1A2E]">Projects</h3>
            </div>
            <div className="space-y-3">
              {data.projects.map((p: any) => (
                <div key={p.id} className="luminous-card bg-white/80 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-serif font-bold text-[#1A1A2E]">{p.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${projectStatusColor(p.status)}`}>{p.status}</span>
                  </div>
                  {p.scope_summary && <p className="text-sm text-[#64748B] mb-2">{p.scope_summary}</p>}
                  <div className="flex gap-6 text-xs text-[#64748B]">
                    {p.current_milestone && <span>Milestone: <span className="font-bold text-[#1A1A2E]">{p.current_milestone}</span></span>}
                    {p.next_deliverable && <span>Next: <span className="font-bold text-[#1A1A2E]">{p.next_deliverable}</span></span>}
                    {p.due_date && <span>Due: <span className="font-bold text-[#1A1A2E]">{new Date(p.due_date).toLocaleDateString()}</span></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contracts */}
        {data.contracts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-[#FF9F1C]" />
              <h3 className="text-xl font-serif font-bold text-[#1A1A2E]">Contracts</h3>
            </div>
            <div className="space-y-3">
              {data.contracts.map((c: any) => (
                <div key={c.id} className="luminous-card bg-white/80 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">{c.title}</p>
                    <p className="text-xs text-[#64748B]">{c.status} • {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    c.status === 'Signed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center py-8 text-xs text-[#64748B]">
          Powered by ProviderOS
        </footer>
      </div>
    </div>
  );
};

export default ClientPortal;
