import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, ExternalLink, ChevronDown, ChevronUp, X, ShieldAlert, Smartphone, FileCode, Clock, AlertTriangle, CheckCircle, XCircle, Play, Pause, Loader2 } from 'lucide-react';
import { CampaignLead, Campaign, SendStatus } from '../types';
import { fetchCampaigns, calculateResearchStats, streamAllCampaignLeads } from '../services/dataService';
import ReactDOM from 'react-dom';
import LeadScoreBar from './LeadScoreBar';

const BATCH_SIZES = [10, 25, 50, 100, 250, 500];
const PAGE_SIZE = 50;

const LeadDatabase: React.FC = () => {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'score' | 'company' | 'date' | 'status'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<CampaignLead | null>(null);
  const [page, setPage] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [batchSize, setBatchSize] = useState(50);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const allCampaigns = await fetchCampaigns();
    setCampaigns(allCampaigns);
    setLoading(false);
    await streamAllCampaignLeads((partialLeads) => setLeads(partialLeads));
  };





  const campaignMap = useMemo(() => {
    const m: Record<string, string> = {};
    campaigns.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [campaigns]);


  const filtered = useMemo(() => {
    let result = leads;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.email.toLowerCase().includes(term) ||
        l.companyName.toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.state.toLowerCase().includes(term) ||
        l.website.toLowerCase().includes(term)
      );
    }
    if (scoreFilter !== 'all') {
      const [min, max] = scoreFilter.split('-').map(Number);
      result = result.filter(l => l.websiteScore >= min && l.websiteScore <= max);
    }
    if (statusFilter !== 'all') result = result.filter(l => l.sendStatus === statusFilter);
    if (campaignFilter !== 'all') result = result.filter(l => l.campaignId === campaignFilter);
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'score') cmp = a.websiteScore - b.websiteScore;
      else if (sortField === 'company') cmp = (a.companyName || '').localeCompare(b.companyName || '');
      else if (sortField === 'date') cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      else if (sortField === 'status') cmp = a.sendStatus.localeCompare(b.sendStatus);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [leads, searchTerm, scoreFilter, statusFilter, campaignFilter, sortField, sortDir]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-reveal">
        <div className="w-12 h-12 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#64748B] font-serif italic text-lg">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-reveal">
      {/* 1. Header */}
      <header>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#0B3060] tracking-tight">Leads</h1>
        <p className="text-[#64748B] mt-1 font-medium text-sm">
          {leads.length.toLocaleString()} total leads across {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: leads.length.toLocaleString(), color: 'text-[#0B3060]' },
          { label: 'Hot Leads', value: leads.filter(l => l.engagementScore >= 10).length.toLocaleString(), color: 'text-emerald-600' },
          { label: 'Researched', value: (stats.total - stats.pending).toLocaleString(), color: 'text-blue-600' },
          { label: 'Hot (9-10)', value: leads.filter(l => l.websiteScore >= 9).length.toLocaleString(), color: 'text-emerald-600' },
          { label: 'Valid Emails', value: leads.filter(l => l.emailValid).length.toLocaleString(), color: 'text-purple-600' },
          { label: 'Avg Engagement', value: (leads.reduce((sum, l) => sum + (l.engagementScore || 0), 0) / (leads.length || 1)).toFixed(1), color: 'text-[#FF9F1C]' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* 3. Research Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <select value={researchCampaignId} onChange={e => setResearchCampaignId(e.target.value)}
              className="text-xs bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none font-medium text-[#1A1A2E]">
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({leads.filter(l => l.campaignId === c.id && l.websiteStatus === 'pending').length} pending)</option>
              ))}
            </select>
            <select value={batchSize} onChange={e => setBatchSize(Number(e.target.value))}
              className="text-xs bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg px-2 py-2 outline-none font-medium text-[#1A1A2E] w-28">
              {BATCH_SIZES.map(s => <option key={s} value={s}>{s} per batch</option>)}
            </select>
            {!running ? (
              <button onClick={startResearch} disabled={!researchCampaignId}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0B3060] text-white rounded-lg text-xs font-bold hover:bg-[#0a2850] transition-all disabled:opacity-50">
                <Play size={12} /> Research
              </button>
            ) : (
              <button onClick={research.stopResearch}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all">
                <Pause size={12} /> Stop
              </button>
            )}
            <button onClick={verifyEmails} disabled={verifying || running || !researchCampaignId}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50">
              {verifying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              {verifying ? 'Verifying...' : 'Verify Emails'}
            </button>
          </div>
          {leads.some(l => l.emailStatus) && (
            <div className="flex gap-3 flex-shrink-0">
              <span className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span className="text-emerald-700 font-semibold">{leads.filter(l => l.emailValid).length} valid</span></span>
              <span className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span className="text-red-600 font-semibold">{leads.filter(l => l.emailStatus && !l.emailValid).length} bad</span></span>
              <span className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span><span className="text-gray-500">{leads.filter(l => !l.emailStatus).length} unchecked</span></span>
            </div>
          )}
        </div>
        {running && (
          <div className="mt-2">
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-[#FF9F1C] h-full rounded-full transition-all duration-500 relative" style={{ width: `${Math.max(progress, 1)}%` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">{stats.pending} remaining · {progress.toFixed(0)}% complete</p>
          </div>
        )}
      </div>

      {/* 4. Score Distribution Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { range: '10-10', label: 'No Website', count: leads.filter(l => l.websiteScore === 10).length, color: 'bg-emerald-500', desc: 'Biggest opportunity' },
          { range: '8-9', label: 'Major Issues', count: leads.filter(l => l.websiteScore >= 8 && l.websiteScore <= 9).length, color: 'bg-emerald-400', desc: 'Website broken/down' },
          { range: '6-7', label: 'Needs Work', count: leads.filter(l => l.websiteScore >= 6 && l.websiteScore <= 7).length, color: 'bg-amber-400', desc: 'Multiple SEO issues' },
          { range: '4-5', label: 'Decent', count: leads.filter(l => l.websiteScore >= 4 && l.websiteScore <= 5).length, color: 'bg-blue-400', desc: 'Missing city pages' },
          { range: '1-3', label: 'Good Site', count: leads.filter(l => l.websiteScore >= 1 && l.websiteScore <= 3).length, color: 'bg-gray-400', desc: 'Already optimized' },
          { range: '0-0', label: 'Pending', count: leads.filter(l => l.websiteScore === 0 && l.websiteStatus === 'pending').length, color: 'bg-gray-200', desc: 'Not researched' },
        ].map(d => (
          <button key={d.range}
            onClick={() => { setScoreFilter(scoreFilter === d.range ? 'all' : d.range); setPage(0); }}
            className={`p-3 rounded-xl text-left transition-all ${scoreFilter === d.range ? 'ring-2 ring-[#0B3060] bg-[#0B3060]/5' : 'bg-white border border-[#E2E8F0] hover:bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${d.color}`}></span>
              <span className="text-lg font-bold text-[#0B3060]">{d.count}</span>
            </div>
            <p className="text-[10px] font-bold text-[#64748B] mt-1">{d.label}</p>
            <p className="text-[9px] text-[#94A3B8]">{d.desc}</p>
          </button>
        ))}
      </div>

      {/* 5. Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#0B3060]/10">
          <Search size={16} className="text-[#94A3B8]" />
          <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            placeholder="Search by company, email, city, website..."
            className="bg-transparent border-none outline-none text-sm font-medium w-full text-[#1A1A2E] placeholder-[#94A3B8]" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="p-0.5 hover:bg-[#F7F8FA] rounded"><X size={14} className="text-[#94A3B8]" /></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="text-xs bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 outline-none font-medium text-[#1A1A2E]">
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option><option value="sent">Sent</option><option value="opened">Opened</option>
            <option value="clicked">Clicked</option><option value="replied">Replied</option><option value="bounced">Bounced</option>
          </select>
          <select value={campaignFilter} onChange={e => { setCampaignFilter(e.target.value); setPage(0); }}
            className="text-xs bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5 outline-none font-medium text-[#1A1A2E] max-w-[180px]">
            <option value="all">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {scoreFilter !== 'all' && (
            <button onClick={() => setScoreFilter('all')} className="text-xs px-3 py-2.5 bg-[#0B3060] text-white rounded-lg font-bold flex items-center gap-1">
              Score: {scoreFilter} <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-[#64748B] font-medium">
        {filtered.length === leads.length ? `${filtered.length.toLocaleString()} leads` : `${filtered.length.toLocaleString()} of ${leads.length.toLocaleString()} leads`}
      </p>

      {/* 6. Leads Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F7F8FA]">
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold cursor-pointer hover:text-[#0B3060]" onClick={() => toggleSort('company')}>
                  <span className="flex items-center gap-1">Company <SortIcon field="company" /></span>
                </th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Email</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Location</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold cursor-pointer hover:text-[#0B3060]" onClick={() => toggleSort('company')}>
                  <span className="flex items-center gap-1">Company <SortIcon field="company" /></span>
                </th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Website</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Email</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold cursor-pointer hover:text-[#0B3060]" onClick={() => toggleSort('status')}>
                  <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                </th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Campaign</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(lead => (
                <tr key={lead.id} className="border-b border-[#E2E8F0]/50 hover:bg-[#F7F8FA] cursor-pointer transition-all"
                  onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}>
                  <td className="py-2.5 px-3"><p className="font-semibold text-[#1A1A2E]">{lead.companyName || '—'}</p></td>
                  <td className="py-2.5 px-3 text-[#475569]">{lead.email}</td>
                  <td className="py-2.5 px-3 text-[#64748B]">{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="py-2.5 px-3">
                    {lead.website ? <span className="text-[#64748B] truncate block max-w-[140px]">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                      : <span className="text-[#CBD5E1]">None</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {lead.emailStatus ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${lead.emailValid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {lead.emailValid ? 'Valid' : 'Invalid'}
                      </span>
                    ) : <span className="text-[10px] text-[#CBD5E1]">—</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      lead.sendStatus === SendStatus.SENT ? 'bg-blue-50 text-blue-600' :
                      lead.sendStatus === SendStatus.OPENED ? 'bg-emerald-50 text-emerald-600' :
                      lead.sendStatus === SendStatus.CLICKED ? 'bg-purple-50 text-purple-600' :
                      lead.sendStatus === SendStatus.REPLIED ? 'bg-[#FF9F1C]/10 text-[#FF9F1C]' :
                      lead.sendStatus === SendStatus.BOUNCED ? 'bg-red-50 text-red-600' :
                      'bg-gray-50 text-[#94A3B8]'
                    }`}>{lead.sendStatus}</span>
                  </td>
                  <td className="py-2.5 px-3"><span className="text-[10px] text-[#94A3B8] truncate block max-w-[120px]">{campaignMap[lead.campaignId] || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#94A3B8]">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F7F8FA] text-[#64748B] hover:bg-[#E2E8F0] disabled:opacity-40 transition-all">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F7F8FA] text-[#64748B] hover:bg-[#E2E8F0] disabled:opacity-40 transition-all">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Lead Detail Modal */}
      {selectedLead && ReactDOM.createPortal(
        (() => {
          const a: any = typeof selectedLead.websiteAnalysis === 'object' && selectedLead.websiteAnalysis ? selectedLead.websiteAnalysis : {};
          const seoIssues: string[] = Array.isArray(a.seoIssues) ? a.seoIssues : [];
          const keyFindings: string[] = Array.isArray(a.keyFindings) ? a.keyFindings : [];
          const techStack: string[] = Array.isArray(a.techStack) ? a.techStack : [];
          return (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="bg-[#0B3060] text-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-serif font-bold">{selectedLead.companyName || 'Unknown Business'}</h2>
                      <p className="text-sm text-white/60 mt-1">{selectedLead.email}
                        {selectedLead.emailStatus && (
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${selectedLead.emailValid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                            {selectedLead.emailValid ? '✓ Verified' : '✗ Invalid'}
                          </span>
                        )}
                      </p>
                      {(selectedLead.emailVerification as any)?.mx_records?.length > 0 && (
                        <p className="text-white/40 text-[10px] mt-1">MX: {(selectedLead.emailVerification as any).mx_records.map((r: any) => r.exchange).join(', ')}</p>
                      )}
                      {selectedLead.city && <p className="text-sm text-white/40 mt-0.5">{selectedLead.city}{selectedLead.state ? `, ${selectedLead.state}` : ''}</p>}
                    </div>
                    <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                    <div>Engagement Score: <span className="font-bold text-white">{selectedLead.engagementScore}</span></div>
                    <div>Sent: <span className="font-bold text-white">{selectedLead.sentAt ? new Date(selectedLead.sentAt).toLocaleDateString() : 'No'}</span></div>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  {/* Website URL */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Globe size={16} className="text-[#64748B] flex-shrink-0" />
                    {selectedLead.website ? (
                      <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1">
                        {selectedLead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} <ExternalLink size={12} />
                      </a>
                    ) : <span className="text-sm text-red-500 font-medium">No website found</span>}
                  </div>

                  {/* Quick info grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Campaign</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1 truncate">{campaignMap[selectedLead.campaignId] || '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Send Status</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1 capitalize">{selectedLead.sendStatus}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Engagement</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1">{selectedLead.engagementScore}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Research</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1 capitalize">{selectedLead.websiteStatus}</p>
                    </div>
                  </div>


                  {/* Personalized Email */}
                  {selectedLead.personalizedSubject && (
                    <div className="p-4 bg-[#0B3060]/5 border border-[#0B3060]/10 rounded-xl">
                      <h4 className="text-xs font-bold text-[#0B3060] uppercase tracking-wider mb-2">Personalized Email</h4>
                      <p className="text-sm font-semibold text-[#0B3060] mb-2">{selectedLead.personalizedSubject}</p>
                      <div className="text-xs text-[#64748B] leading-relaxed whitespace-pre-wrap">{selectedLead.personalizedBody?.replace(/<[^>]*>/g, '') || ''}</div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0]">
                    {selectedLead.sentAt && <div className="text-center"><p className="text-[10px] text-[#94A3B8] uppercase">Sent</p><p className="text-xs font-medium text-[#0B3060]">{new Date(selectedLead.sentAt).toLocaleDateString()}</p></div>}
                    {selectedLead.openedAt && <div className="text-center"><p className="text-[10px] text-[#94A3B8] uppercase">Opened</p><p className="text-xs font-medium text-[#0B3060]">{new Date(selectedLead.openedAt).toLocaleDateString()}</p></div>}
                    {selectedLead.clickedAt && <div className="text-center"><p className="text-[10px] text-[#94A3B8] uppercase">Clicked</p><p className="text-xs font-medium text-[#0B3060]">{new Date(selectedLead.clickedAt).toLocaleDateString()}</p></div>}
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default LeadDatabase;
