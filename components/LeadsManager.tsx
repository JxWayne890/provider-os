import React, { useState } from 'react';
import { Search, Plus, Filter, Mail, Linkedin, Sparkles, MoreHorizontal, ChevronRight, CheckCircle2, RefreshCw, ArrowUpRight } from 'lucide-react';
import { Lead } from '../types';
import { qualifyLead } from '../services/geminiService';
import { createStripePaymentLink, createStripeProduct, listStripeProducts } from '../services/sheetsService';

interface LeadsManagerProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  onRequestLink?: (lead: Lead) => void;
}

const LeadsManager: React.FC<LeadsManagerProps> = ({ leads, onUpdateLead, onRequestLink }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isQualifying, setIsQualifying] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState<string | null>(null);

  // Dynamic Offer Lab States
  const [simPrice, setSimPrice] = useState(2500);
  const [simBundle, setSimBundle] = useState(['Strategy', 'Execution']);
  const [activeSimulator, setActiveSimulator] = useState<Lead | null>(null);

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

  // Calculation logic for simulator
  const calculateOdds = (lead: Lead) => {
    return Math.min(95, 40 + (lead.leadScore / 5) - (simPrice / 500) + (simBundle.length * 5));
  };

  return (
    <div className="space-y-10 animate-reveal pb-20">
      <div className="flex flex-col md:flex-row gap-6 justify-end items-center">
        {/* Bulky buttons removed per user request - Actions now in Top Nav (+) Menu */}
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
      <div className="luminous-card bg-white overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
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
              <tr key={lead.id} className="hover:bg-[#F5F5F7]/50 group transition-colors cursor-pointer" onClick={() => setActiveSimulator(lead)}>
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
                    {(lead.outreachEmailDraft || lead.qualificationStatus === 'Qualified') && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveSimulator(lead); }}
                          className="p-2.5 bg-[#B8860B]/10 text-[#B8860B] hover:bg-[#B8860B]/20 rounded-xl transition-all border border-[#B8860B]/10"
                          title="AI Offer Simulator"
                        >
                          <RefreshCw size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRequestLink?.(lead); }}
                          className="p-2.5 bg-[#0066CC]/10 text-[#0066CC] hover:bg-[#0066CC]/20 rounded-xl transition-all border border-[#0066CC]/10"
                          title="Hyper-Link Engine"
                        >
                          <Plus size={18} />
                        </button>
                        {lead.outreachEmailDraft && (
                          <>
                            <button className="p-2.5 bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all border border-black/5" title="Email Draft">
                              <Mail size={18} />
                            </button>
                            <button className="p-2.5 bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all border border-black/5" title="LinkedIn Draft">
                              <Linkedin size={18} />
                            </button>
                          </>
                        )}
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

      {/* Dynamic Offer Lab Modal */}
      {activeSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-reveal">
          <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl border border-black/5 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-[#F5F5F7] flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} className="text-[#B8860B]" />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold text-[#1D1D1F]">AI Offer Simulator</h3>
                  <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest">Optimizing conversion for {activeSimulator.company}</p>
                </div>
              </div>
              <button onClick={() => setActiveSimulator(null)} className="p-2 hover:bg-[#F5F5F7] rounded-xl transition-all"><Plus size={24} className="rotate-45 text-[#86868B]" /></button>
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12 overflow-y-auto">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-[#1D1D1F] uppercase tracking-widest">Target Price Point</label>
                    <span className="text-2xl font-serif font-bold text-[#B8860B]">${simPrice.toLocaleString()}</span>
                  </div>
                  <input
                    type="range" min="500" max="10000" step="500"
                    value={simPrice} onChange={(e) => setSimPrice(parseInt(e.target.value))}
                    className="w-full accent-[#B8860B] h-1.5 bg-[#F5F5F7] rounded-full appearance-none cursor-pointer"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#1D1D1F] uppercase tracking-widest">Bundle Strategy</label>
                  <div className="flex flex-wrap gap-2">
                    {['Strategy', 'Execution', 'Audit', 'Recurring Care'].map(item => (
                      <button key={item} onClick={() => setSimBundle(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}
                        className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${simBundle.includes(item) ? 'bg-black text-white' : 'bg-[#F5F5F7] text-[#86868B]'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-[#F5F5F7] rounded-3xl border border-black/5">
                  <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest mb-2">Lead Context</p>
                  <p className="text-sm font-serif italic text-[#1D1D1F]">"{activeSimulator.painSignals}"</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-8 bg-black/5 rounded-[40px] p-8 border border-black/5">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-black/5" />
                    <circle cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray={540} strokeDashoffset={540 - (540 * calculateOdds(activeSimulator)) / 100} className="text-[#B8860B] transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-serif font-bold text-[#1D1D1F]">{Math.round(calculateOdds(activeSimulator))}%</span>
                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Success Probability</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest mb-1">Projected Deal Value</p>
                  <p className="text-3xl font-serif font-bold text-[#1D1D1F]">${(simPrice * (calculateOdds(activeSimulator) / 100)).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-[#F5F5F7] flex gap-4">
              <button
                onClick={() => onRequestLink?.(activeSimulator)}
                className="flex-1 py-4 bg-black text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#1D1D1F] transition-all"
              >
                <ArrowUpRight size={16} /> Deploy Personalized Link
              </button>
              <button
                className="px-8 py-4 bg-white border border-black/5 text-[#1D1D1F] rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#F5F5F7] transition-all"
              >
                Save Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsManager;
