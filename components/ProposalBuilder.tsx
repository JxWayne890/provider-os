import React, { useState } from 'react';
import { X, Plus, Trash2, Send, Loader2 } from 'lucide-react';
import { Proposal, Client } from '../types';
import { upsertProposal, sendEmail } from '../services/dataService';

interface ProposalBuilderProps {
  proposals: Proposal[];
  clients: Client[];
  onUpdate: () => void;
}

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({ proposals, clients, onUpdate }) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [lineItems, setLineItems] = useState<{ description: string; price: number }[]>([{ description: '', price: 0 }]);
  const [terms, setTerms] = useState('Payment due within 14 days of acceptance. Scope limited to items listed above.');
  const [expiresAt, setExpiresAt] = useState('');

  const total = lineItems.reduce((s, i) => s + (Number(i.price) || 0), 0);

  const resetForm = () => {
    setClientId(''); setTitle(''); setTerms('Payment due within 14 days of acceptance.');
    setLineItems([{ description: '', price: 0 }]); setExpiresAt(''); setEditingProposal(null);
  };

  const openEdit = (p: Proposal) => {
    setEditingProposal(p); setClientId(p.clientId); setTitle(p.title);
    setLineItems(p.lineItems.length ? p.lineItems : [{ description: '', price: 0 }]);
    setTerms(p.terms); setExpiresAt(p.expiresAt); setShowBuilder(true);
  };

  const handleSave = async (sendNow = false) => {
    setSaving(true);
    try {
      const id = editingProposal?.id || `prop-${Date.now()}`;
      const proposal: Proposal = {
        id, clientId, title, lineItems: lineItems.filter(i => i.description), total, terms,
        status: sendNow ? 'Sent' : 'Draft', expiresAt, createdAt: editingProposal?.createdAt || new Date().toISOString(),
        proposalUrl: `${window.location.origin}?mode=proposal&id=${id}`,
      };
      await upsertProposal(proposal);
      if (sendNow) {
        const client = clients.find(c => c.id === clientId);
        if (client?.email) {
          const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#1A1A2E;">Proposal: ${title}</h2><p>Hi ${client.primaryContact || client.companyName},</p><p>Please review the attached proposal.</p><a href="${proposal.proposalUrl}" style="display:inline-block;background:#1A1A2E;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">View Proposal</a><p style="color:#888;font-size:12px;margin-top:20px;">Total: $${total.toLocaleString()}</p></div>`;
          await sendEmail(client.email, `Proposal: ${title}`, html);
        }
      }
      onUpdate(); setShowBuilder(false); resetForm();
    } catch (err) { console.error('Save proposal error:', err); }
    finally { setSaving(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Sent': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Declined': case 'Expired': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-[#64748B] bg-gray-50 border-gray-200';
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/30 focus:border-[#FF9F1C] transition-all";

  return (
    <div className="space-y-8">
      <button data-proposal-new className="hidden" onClick={() => setShowBuilder(true)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map(p => {
          const client = clients.find(c => c.id === p.clientId);
          return (
            <div key={p.id} className="luminous-card bg-white/80 p-6 space-y-4 group cursor-pointer" onClick={() => openEdit(p)}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#1A1A2E] group-hover:text-[#FF9F1C] transition-colors">{p.title}</h3>
                  <p className="text-xs text-[#64748B] font-medium">{client?.companyName || 'No client'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(p.status)}`}>{p.status}</span>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">{p.lineItems.length} line items</p>
                <p className="text-2xl font-serif font-bold text-[#1A1A2E]">${p.total.toLocaleString()}</p>
              </div>
              {p.expiresAt && (
                <p className="text-[10px] text-[#64748B]">Expires: {new Date(p.expiresAt).toLocaleDateString()}</p>
              )}
            </div>
          );
        })}
      </div>

      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold">{editingProposal ? 'Edit Proposal' : 'New Proposal'}</h2>
              <button onClick={() => { setShowBuilder(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Client</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Expires</label>
                  <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Proposal Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Website Redesign Proposal" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Line Items</label>
                <div className="space-y-3">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <input value={item.description} onChange={e => { const n = [...lineItems]; n[i].description = e.target.value; setLineItems(n); }}
                        placeholder="Service description" className={inputClass + ' flex-1'} />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-3 text-sm text-[#64748B]">$</span>
                        <input type="number" value={item.price || ''} onChange={e => { const n = [...lineItems]; n[i].price = Number(e.target.value); setLineItems(n); }}
                          placeholder="0" className={inputClass + ' pl-7'} />
                      </div>
                      {lineItems.length > 1 && (
                        <button onClick={() => setLineItems(lineItems.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setLineItems([...lineItems, { description: '', price: 0 }])}
                    className="flex items-center gap-1 text-xs font-bold text-[#FF9F1C] hover:underline"><Plus size={14} /> Add Line Item</button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-[#64748B]">TOTAL</span>
                <span className="text-3xl font-serif font-bold text-[#1A1A2E]">${total.toLocaleString()}</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Terms & Conditions</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} className={inputClass + ' resize-none'} />
              </div>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button onClick={() => handleSave(false)} disabled={saving || !title}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50">
                Save Draft
              </button>
              <button onClick={() => handleSave(true)} disabled={saving || !title || !clientId}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A2E] text-white text-sm font-bold rounded-xl hover:bg-[#0a2850] transition-all disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalBuilder;
