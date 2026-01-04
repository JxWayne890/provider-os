
import React, { useState } from 'react';
import { Search, Plus, Filter, Mail, Linkedin, Sparkles, MoreHorizontal, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Lead, DealStage } from '../types';
import { qualifyLead } from '../services/geminiService';
import { createStripePaymentLink } from '../services/sheetsService';

interface LeadsManagerProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
}

const LeadsManager: React.FC<LeadsManagerProps> = ({ leads, onUpdateLead }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isQualifying, setIsQualifying] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState<string | null>(null);

  const filteredLeads = leads.filter(l =>
    l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAIQualify = async (lead: Lead) => {
    setIsQualifying(lead.id);
    try {
      const info = `${lead.firstName} ${lead.lastName} from ${lead.company}. Role: ${lead.role}. Tech Stack: ${lead.techStack}. Pain: ${lead.painSignals}`;
      const results = await qualifyLead(info);

      const updatedLead = {
        ...lead,
        leadScore: results.score,
        qualificationStatus: results.status as any,
        outreachEmailDraft: results.emailDraft,
        outreachLinkedInDraft: results.linkedinDraft,
        nextAction: results.nextAction
      };

      setIsQualifying(null);
      setIsSyncing(lead.id);

      await onUpdateLead(updatedLead);

    } catch (err) {
      console.error("AI Qualification failed", err);
      setIsQualifying(null);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleCreatePaymentLink = async (lead: Lead) => {
    const amountStr = window.prompt(`Enter amount for ${lead.company} ($):`, "1500");
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return;

    setIsGeneratingLink(lead.id);
    try {
      const link = await createStripePaymentLink(lead.id, lead.company, amount);
      if (link) {
        onUpdateLead({ ...lead, stripePaymentLink: link });
        window.alert(`Payment Link Generated!\n\n${link}`);
      }
    } catch (err) {
      console.error("Failed to generate link", err);
    } finally {
      setIsGeneratingLink(null);
    }
  };

  return (
    <div className="space-y-10 animate-reveal pb-20">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
        <div>
          <h2 className="text-5xl font-serif font-bold text-[#1D1D1F] tracking-tight">Leads Engine</h2>
          <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-xs">Automated sourcing and qualification intelligence</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-white border border-black/5 text-[#1D1D1F] px-6 py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-[#F5F5F7] transition-all flex items-center gap-2">
            <Plus size={18} /> Import Data
          </button>
          <button className="luminous-button-gold px-8 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-[#B8860B]/20 flex items-center gap-2">
            <Sparkles size={18} /> Run Lead Engine
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="luminous-card bg-white/70 p-4 border-black/5 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
          <input
            type="text"
            placeholder="Search leads, companies, or roles..."
            className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-3 pl-12 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10 focus:border-[#B8860B]/20 transition-all text-[#1D1D1F]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-5 py-3 bg-white border border-black/5 rounded-2xl text-xs font-bold text-[#1D1D1F] flex items-center gap-2 hover:bg-[#F5F5F7] transition-all shadow-sm">
          <Filter size={14} /> Stage
        </button>
        <button className="px-5 py-3 bg-white border border-black/5 rounded-2xl text-xs font-bold text-[#1D1D1F] flex items-center gap-2 hover:bg-[#F5F5F7] transition-all shadow-sm">
          <Filter size={14} /> Score
        </button>
      </div>

      {/* Leads Table */}
      <div className="luminous-card bg-white overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#F5F5F7] bg-[#F5F5F7]/30">
              <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Contact / Identity</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Priority Score</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Audit Status</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Current Stage</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Intelligence</th>
              <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] text-right">Drafting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F5F7]">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-[#F5F5F7]/50 group transition-colors cursor-pointer">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[18px] bg-[#E8E8E8] border border-black/5 flex items-center justify-center text-[#1D1D1F] font-serif font-bold text-lg shadow-sm">
                      {lead.firstName[0]}{lead.lastName[0]}
                    </div>
                    <div>
                      <div className="font-bold text-[#1D1D1F]">{lead.firstName} {lead.lastName}</div>
                      <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-tighter">{lead.company} • {lead.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-16 bg-[#F5F5F7] h-1.5 rounded-full overflow-hidden border border-black/5">
                      <div
                        className={`h-full rounded-full ${lead.leadScore > 75 ? 'bg-[#1D9D60]' : lead.leadScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${lead.leadScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold font-mono text-[#1D1D1F]">{lead.leadScore}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${lead.qualificationStatus === 'Qualified' ? 'bg-[#1D9D60]/10 text-[#1D9D60] border-[#1D9D60]/20' :
                    lead.qualificationStatus === 'Unqualified' ? 'bg-[#E8E8E8] text-[#86868B] border-black/5' :
                      'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    {lead.qualificationStatus}
                  </span>
                </td>
                <td className="px-8 py-5 text-xs font-bold text-[#6E6E73]">{lead.dealStage}</td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 text-[#1D1D1F] font-medium text-sm">
                    <ChevronRight size={14} className="text-[#B8860B]" />
                    {lead.nextAction}
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAIQualify(lead); }}
                      disabled={isQualifying === lead.id || isSyncing === lead.id}
                      className="p-2.5 bg-[#B8860B]/10 text-[#B8860B] hover:bg-[#B8860B]/20 rounded-xl transition-all disabled:opacity-50 shadow-sm border border-[#B8860B]/10"
                      title={isSyncing === lead.id ? "Syncing to Sheets..." : "AI Intelligence"}
                    >
                      {isSyncing === lead.id ? (
                        <CheckCircle2 size={18} className="animate-pulse text-[#1D9D60]" />
                      ) : (
                        <Sparkles size={18} className={isQualifying === lead.id ? 'animate-spin' : ''} />
                      )}
                    </button>
                    {lead.outreachEmailDraft && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCreatePaymentLink(lead); }}
                          disabled={isGeneratingLink === lead.id}
                          className="p-2.5 bg-[#0066CC]/10 text-[#0066CC] hover:bg-[#0066CC]/20 rounded-xl transition-all border border-[#0066CC]/10"
                          title="Generate Payment Link"
                        >
                          <Plus size={18} className={isGeneratingLink === lead.id ? 'animate-spin' : ''} />
                        </button>
                        <button className="p-2.5 bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all border border-black/5" title="Email Draft">
                          <Mail size={18} />
                        </button>
                        <button className="p-2.5 bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all border border-black/5" title="LinkedIn Draft">
                          <Linkedin size={18} />
                        </button>
                      </>
                    )}
                    <button className="p-2.5 bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all border border-black/5">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredLeads.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-[#86868B]">
          <Search size={48} className="mb-6 opacity-20" />
          <p className="font-serif italic text-lg">No prospects match the current filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default LeadsManager;
