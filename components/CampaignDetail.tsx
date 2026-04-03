import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Mail, Settings as SettingsIcon, Upload, Search, Sparkles, ChevronRight } from 'lucide-react';
import { Campaign, CampaignLead, CampaignStats, CampaignStatus, SendStatus } from '../types';
import {
  fetchCampaignLeads, fetchCampaignStatsLight, upsertCampaign, bulkInsertCampaignLeads,
  calculateCampaignStats, sendCampaignBatch, fetchSuppressionList,
} from '../services/dataService';
import CSVImporter from './CSVImporter';
import EmailTemplateEditor from './EmailTemplateEditor';
import CampaignScheduler from './CampaignScheduler';
import PersonalizationPanel from './PersonalizationPanel';
import LeadScoreBar from './LeadScoreBar';

interface CampaignDetailProps {
  campaign: Campaign;
  onBack: () => void;
  onUpdate: (campaign: Campaign) => void;
}

const SECTIONS = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'personalize', label: 'AI Copy', icon: Sparkles },
  { id: 'template', label: 'Template', icon: Mail },
  { id: 'schedule', label: 'Schedule', icon: SettingsIcon },
] as const;

const CampaignDetail: React.FC<CampaignDetailProps> = ({ campaign, onBack, onUpdate }) => {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [stats, setStats] = useState<CampaignStats>({ totalLeads: 0, sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, failed: 0, suppressed: 0, openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('leads');
  const [suppressedEmails, setSuppressedEmails] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'score' | 'priority'>('default');
  const [sendingBatch, setSendingBatch] = useState(false);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { loadLeads(); loadSuppressed(); }, [campaign.id]);

  const loadLeads = async () => {
    // Load stats immediately via lightweight counts (instant)
    const lightStats = await fetchCampaignStatsLight(campaign.id);
    setStats(lightStats);

    // Only show spinner on initial load (when no leads loaded yet)
    const isInitial = leads.length === 0;
    if (isInitial) setLoading(true);
    const data = await fetchCampaignLeads(campaign.id);
    setLeads(data);
    setStats(calculateCampaignStats(data));
    if (isInitial) setLoading(false);
  };

  const loadSuppressed = async () => {
    const list = await fetchSuppressionList();
    setSuppressedEmails(new Set(list.map(s => s.email.toLowerCase())));
  };

  const handleCampaignUpdate = async (updates: Partial<Campaign>) => {
    const updated = { ...campaign, ...updates, updatedAt: new Date().toISOString() };
    await upsertCampaign(updated);
    onUpdate(updated);
  };

  const handleImport = async (newLeads: CampaignLead[]) => {
    await bulkInsertCampaignLeads(newLeads);
    await loadLeads();
  };

  const handleStart = async () => { await handleCampaignUpdate({ status: CampaignStatus.ACTIVE, warmupDay: campaign.warmupDay || 1 }); };
  const handlePause = async () => { await handleCampaignUpdate({ status: CampaignStatus.PAUSED }); };
  const handleResume = async () => { await handleCampaignUpdate({ status: CampaignStatus.ACTIVE }); };

  const handleSendBatch = async () => {
    setSendingBatch(true);
    try { await sendCampaignBatch(campaign.id, 10); await loadLeads(); }
    catch (err) { console.warn('Batch send failed:', err); }
    finally { setSendingBatch(false); }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const existingEmails = new Set(leads.map(l => l.email.toLowerCase()));
  let filteredLeads = filterStatus === 'all' ? leads : leads.filter(l => l.sendStatus === filterStatus);
  if (sortBy === 'score') filteredLeads = [...filteredLeads].sort((a, b) => b.websiteScore - a.websiteScore);
  else if (sortBy === 'priority') filteredLeads = [...filteredLeads].sort((a, b) => a.priorityRank - b.priorityRank);

  const sampleLead = leads.length > 0 ? leads[Math.floor(Math.random() * leads.length)] : undefined;
  const personalizedCount = leads.filter(l => l.personalizationStatus === 'done').length;

  return (
    <div className="animate-reveal">
      {/* Campaign Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#E2E8F0]">
            <ArrowLeft size={18} className="text-[#64748B]" />
          </button>
          <div className="flex-1">
            <input
              type="text" value={campaign.name}
              onChange={e => handleCampaignUpdate({ name: e.target.value })}
              className="text-2xl font-serif font-bold text-[#0B3060] bg-transparent outline-none w-full"
              placeholder="Campaign Name"
            />
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                campaign.status === CampaignStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                campaign.status === CampaignStatus.PAUSED ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                campaign.status === CampaignStatus.COMPLETED ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                'bg-gray-50 text-[#64748B] border border-[#E2E8F0]'
              }`}>{campaign.status}</span>
              <span className="text-xs text-[#94A3B8]">{leads.length} leads</span>
              <span className="text-xs text-[#94A3B8]">{personalizedCount} personalized</span>
              <span className="text-xs text-[#94A3B8]">{stats.sent} sent</span>
            </div>
          </div>
          {campaign.status === CampaignStatus.ACTIVE && (
            <button onClick={handleSendBatch} disabled={sendingBatch}
              className="px-4 py-2 bg-[#FF9F1C] text-white rounded-xl text-xs font-bold hover:bg-[#e8900a] transition-all disabled:opacity-50 shadow-sm">
              {sendingBatch ? 'Sending...' : 'Send Batch'}
            </button>
          )}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Open Rate', value: `${stats.openRate.toFixed(1)}%` },
            { label: 'Click Rate', value: `${stats.clickRate.toFixed(1)}%` },
            { label: 'Reply Rate', value: `${stats.replyRate.toFixed(1)}%` },
            { label: 'Bounce Rate', value: `${stats.bounceRate.toFixed(1)}%`, warn: stats.bounceRate > 3 },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center border ${s.warn ? 'bg-red-50 border-red-100' : 'bg-white border-[#E2E8F0]'}`}>
              <p className={`text-lg font-bold ${s.warn ? 'text-red-600' : 'text-[#0B3060]'}`}>{s.value}</p>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section Navigation — horizontal chips on mobile, sticky sidebar on desktop */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 lg:hidden">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => scrollToSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === s.id ? 'bg-[#0B3060] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0]'
            }`}>
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Desktop Section Nav */}
        <div className="hidden lg:block w-44 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => scrollToSection(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeSection === s.id
                    ? 'bg-[#0B3060] text-white'
                    : 'text-[#64748B] hover:bg-white hover:text-[#0B3060]'
                }`}>
                <s.icon size={14} /> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Sections */}
        <div className="flex-1 space-y-8 min-w-0">
          {/* Section: Leads */}
          <div ref={el => { sectionRefs.current['leads'] = el; }} className="scroll-mt-24">
            <h2 className="text-lg font-serif font-bold text-[#0B3060] mb-4 flex items-center gap-2">
              <Users size={18} /> Leads
            </h2>
            <div className="brand-card p-5 rounded-xl">
              <div className="flex flex-col md:flex-row gap-2 mb-4">
                <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
                  {['all', 'queued', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'suppressed'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                        filterStatus === s ? 'bg-[#0B3060] text-white' : 'bg-[#F7F8FA] text-[#64748B] hover:bg-gray-100'
                      }`}>
                      {s === 'all' ? `All (${leads.length})` : `${s} (${leads.filter(l => l.sendStatus === s).length})`}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {[{ id: 'default' as const, label: 'Default' }, { id: 'score' as const, label: 'By Score' }, { id: 'priority' as const, label: 'Priority' }].map(s => (
                    <button key={s.id} onClick={() => setSortBy(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        sortBy === s.id ? 'bg-[#FF9F1C] text-white' : 'bg-[#F7F8FA] text-[#64748B]'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading && leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-[#0B3060] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs text-[#94A3B8]">Loading {stats.totalLeads.toLocaleString()} leads...</p>
                </div>
              ) : filteredLeads.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Users size={32} className="text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-sm text-[#94A3B8]">{leads.length === 0 ? 'No leads yet — import a CSV below' : 'No leads match this filter'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="text-left py-2 px-2 text-[#94A3B8] font-medium">Email</th>
                        <th className="text-left py-2 px-2 text-[#94A3B8] font-medium">Company</th>
                        <th className="text-left py-2 px-2 text-[#94A3B8] font-medium">AI</th>
                        <th className="text-left py-2 px-2 text-[#94A3B8] font-medium">Status</th>
                        <th className="text-left py-2 px-2 text-[#94A3B8] font-medium">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.slice(0, 100).map(lead => (
                        <React.Fragment key={lead.id}>
                          <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F7F8FA] cursor-pointer" onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}>
                            <td className="py-2 px-2 text-[#1A1A2E] font-medium">{lead.email}</td>
                            <td className="py-2 px-2 text-[#475569]">{lead.companyName}</td>
                            <td className="py-2 px-2">
                              <span className={`text-[10px] font-semibold ${lead.personalizationStatus === 'done' ? 'text-[#FF9F1C]' : lead.personalizationStatus === 'generating' ? 'text-amber-500' : lead.personalizationStatus === 'error' ? 'text-red-400' : 'text-[#CBD5E1]'}`}>
                                {lead.personalizationStatus === 'done' ? 'Ready' : lead.personalizationStatus === 'generating' ? '...' : lead.personalizationStatus === 'error' ? 'Err' : '—'}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                lead.sendStatus === SendStatus.SENT ? 'bg-blue-50 text-blue-600' :
                                lead.sendStatus === SendStatus.OPENED ? 'bg-emerald-50 text-emerald-600' :
                                lead.sendStatus === SendStatus.CLICKED ? 'bg-purple-50 text-purple-600' :
                                lead.sendStatus === SendStatus.REPLIED ? 'bg-[#FF9F1C]/10 text-[#FF9F1C]' :
                                lead.sendStatus === SendStatus.BOUNCED ? 'bg-red-50 text-red-600' :
                                lead.sendStatus === SendStatus.FAILED ? 'bg-red-50 text-red-600' :
                                'bg-gray-50 text-[#94A3B8]'
                              }`}>{lead.sendStatus}</span>
                            </td>
                            <td className="py-2 px-2 text-[#94A3B8]">{lead.sentAt ? new Date(lead.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                          </tr>
                          {expandedLead === lead.id && (
                            <tr><td colSpan={7} className="p-3 bg-[#F7F8FA]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">Lead Details</p>
                                  <div className="space-y-1 text-xs text-[#475569]">
                                    <p>City: {lead.city || '—'}</p>
                                    <p>State: {lead.state || '—'}</p>
                                    <p>Website: {lead.website || '—'}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">Personalized Email</p>
                                  {lead.personalizedSubject ? (
                                    <div className="text-xs">
                                      <p className="font-semibold text-[#0B3060] mb-1">{lead.personalizedSubject}</p>
                                      <div className="text-[#64748B] max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: lead.personalizedBody || '' }} />
                                    </div>
                                  ) : <p className="text-xs text-[#94A3B8]">Not yet personalized</p>}
                                </div>
                              </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  {filteredLeads.length > 100 && <p className="text-xs text-[#94A3B8] text-center py-2">Showing first 100 of {filteredLeads.length}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Section: Import */}
          <div ref={el => { sectionRefs.current['import'] = el; }} className="scroll-mt-24">
            <h2 className="text-lg font-serif font-bold text-[#0B3060] mb-4 flex items-center gap-2">
              <Upload size={18} /> Import Leads
            </h2>
            <div className="brand-card p-5 rounded-xl">
              <CSVImporter campaignId={campaign.id} onImport={handleImport} existingEmails={existingEmails} suppressedEmails={suppressedEmails} />
            </div>
          </div>


          {/* Section: Personalize */}
          <div ref={el => { sectionRefs.current['personalize'] = el; }} className="scroll-mt-24">
            <h2 className="text-lg font-serif font-bold text-[#0B3060] mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-[#FF9F1C]" /> AI Personalization
            </h2>
            <PersonalizationPanel campaignId={campaign.id} leads={leads} onRefresh={loadLeads} />
          </div>

          {/* Section: Template */}
          <div ref={el => { sectionRefs.current['template'] = el; }} className="scroll-mt-24">
            <h2 className="text-lg font-serif font-bold text-[#0B3060] mb-4 flex items-center gap-2">
              <Mail size={18} /> Email Template
            </h2>
            <div className="brand-card p-5 rounded-xl">
              <EmailTemplateEditor
                subjectTemplate={campaign.subjectTemplate} bodyTemplate={campaign.bodyTemplate}
                onSubjectChange={subject => handleCampaignUpdate({ subjectTemplate: subject })}
                onBodyChange={body => handleCampaignUpdate({ bodyTemplate: body })}
                sampleLead={sampleLead}
              />
            </div>
          </div>

          {/* Section: Schedule */}
          <div ref={el => { sectionRefs.current['schedule'] = el; }} className="scroll-mt-24">
            <h2 className="text-lg font-serif font-bold text-[#0B3060] mb-4 flex items-center gap-2">
              <SettingsIcon size={18} /> Schedule & Send
            </h2>
            <div className="brand-card p-5 rounded-xl">
              <CampaignScheduler campaign={campaign} stats={stats} onUpdate={handleCampaignUpdate} onStart={handleStart} onPause={handlePause} onResume={handleResume} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
