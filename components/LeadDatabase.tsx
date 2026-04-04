import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, ExternalLink, ChevronDown, ChevronUp, X, ShieldAlert, Smartphone, FileCode, Clock, AlertTriangle, CheckCircle, XCircle, Play, Pause, Loader2, Filter, ArrowUpDown } from 'lucide-react';
import { CampaignLead, Campaign, SendStatus } from '../types';
import { fetchCampaigns, calculateResearchStats, fetchAllLeads, triggerDeepVerifyBatch, triggerDeepVerifySingle } from '../services/dataService';
import ReactDOM from 'react-dom';
import LeadScoreBar from './LeadScoreBar';
import { useResearch } from './ResearchContext';

const BATCH_SIZES = [10, 25, 50, 100, 250, 500, 750, 1000, 1250, 1500, -1];
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
  const [deepVerifying, setDeepVerifying] = useState(false);
  const [deepVerifyFeed, setDeepVerifyFeed] = useState<Array<{company: string; status: string; website?: string; email?: string; review?: boolean}>>([]);
  const [deepVerifyExpanded, setDeepVerifyExpanded] = useState(false);
  const [singleVerifying, setSingleVerifying] = useState(false);
  const [deepVerifyMsg, setDeepVerifyMsg] = useState<string | null>(null);
  const [pillExpanded, setPillExpanded] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [researchCampaignId, setResearchCampaignId] = useState<string>('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const research = useResearch();
  const running = research.isRunning;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const allCampaigns = await fetchCampaigns();
    setCampaigns(allCampaigns);
    // Always fetch complete dataset, set state once — no flickering
    const allLeads = await fetchAllLeads();
    setLeads(allLeads);
    setLoading(false);
  };

  // Auto-select campaign with most pending leads
  useEffect(() => {
    if (campaigns.length > 0 && !researchCampaignId) {
      const best = campaigns.reduce((b, c) => {
        const p = leads.filter(l => l.campaignId === c.id && l.websiteStatus === 'pending').length;
        const bp = leads.filter(l => l.campaignId === b.id && l.websiteStatus === 'pending').length;
        return p > bp ? c : b;
      }, campaigns[0]);
      setResearchCampaignId(best.id);
    }
  }, [campaigns, leads, researchCampaignId]);

  // Auto-refresh while research runs
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => loadData(), 3000);
    return () => clearInterval(iv);
  }, [running]);

  const startResearch = () => {
    console.log('[LeadDatabase] startResearch called, batchSize:', batchSize, 'running:', running, 'pending:', stats.pending);
    void research.startLeadsResearch(batchSize === -1 ? 99999 : batchSize)
      .then(() => {
        console.log('[LeadDatabase] startLeadsResearch completed');
      })
      .catch((err) => {
        console.error('[LeadDatabase] startResearch error:', err);
      });
  };

  const verifyEmails = async () => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('relay_auth_token') || '';
      const relayUrl = (import.meta as any).env?.VITE_RELAY_URL || 'https://api.theprovidersystem.com';
      const resp = await fetch(relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'verify_leads_batch', batch_size: 500 }),
      });
      const data = await resp.json();
      if (data.success) {
        setTimeout(() => loadData(), 3000);
        setTimeout(() => { loadData(); setVerifying(false); }, 8000);
      } else setVerifying(false);
    } catch { setVerifying(false); }
  };

  const deepVerify = async (mode: 'websites' | 'emails' = 'websites') => {
    setDeepVerifying(true);
    setDeepVerifyMsg(null);
    try {
      const data = await triggerDeepVerifyBatch(20, mode);
      if (data.success) {
        const count = data.verifying || data.verified || 0;
        if (count === 0) {
          setDeepVerifyMsg('No leads pending deep verification');
          setDeepVerifying(false);
          setTimeout(() => setDeepVerifyMsg(null), 5000);
          return;
        }
        setDeepVerifyMsg('Deep verifying ' + count + ' leads via Perplexity AI...');
        // Poll for updates while deep verify runs in background
        const poll = setInterval(async () => {
          await loadData();
        }, 5000);
        setTimeout(() => {
          clearInterval(poll);
          loadData();
          setDeepVerifying(false);
          setDeepVerifyMsg('Deep verification batch complete!');
          setTimeout(() => setDeepVerifyMsg(null), 5000);
        }, 60000);
      } else {
        setDeepVerifyMsg('Deep verify failed: ' + (data.error || data.message || 'Unknown error'));
        setDeepVerifying(false);
        setTimeout(() => setDeepVerifyMsg(null), 8000);
      }
    } catch (err: any) {
      setDeepVerifyMsg('Deep verify error: ' + (err.message || 'Request failed'));
      setDeepVerifying(false);
      setTimeout(() => setDeepVerifyMsg(null), 8000);
    }
  };

  const deepVerifySingle = async (leadId: string) => {
    setSingleVerifying(true);
    try {
      const result = await triggerDeepVerifySingle(leadId);
      console.log('[DeepVerify] Single result:', result);
      // Refresh leads and update selected lead
      const allLeads = await fetchAllLeads();
      setLeads(allLeads);
      const updated = allLeads.find(l => l.id === leadId);
      if (updated) setSelectedLead(updated);
    } catch (err) {
      console.error('Deep verify single error:', err);
    }
    setSingleVerifying(false);
  };

  const campaignMap = useMemo(() => {
    const m: Record<string, string> = {};
    campaigns.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [campaigns]);

  const stats = useMemo(() => calculateResearchStats(leads), [leads]);
  const progress = stats.total > 0 ? ((stats.total - stats.pending) / stats.total) * 100 : 0;

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

  const activeFilterCount = [scoreFilter !== 'all', statusFilter !== 'all', campaignFilter !== 'all'].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-reveal">
        <div className="w-14 h-14 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#64748B] font-serif italic text-lg">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-reveal">
      {/* 1. Header */}
      <header>
        <h1 className="text-2xl md:text-4xl font-serif font-bold text-[#0B3060] tracking-tight">Research Lab</h1>
        <p className="text-[#64748B] mt-1 font-medium text-sm">
          {leads.length.toLocaleString()} leads across {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* 2. KPI Cards - Horizontal scroll on mobile */}
      <div className="mobile-scroll-row md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-3">
        {[
          { label: 'Total Leads', value: leads.length.toLocaleString(), color: 'text-[#0B3060]' },
          { label: 'Hot Leads', value: leads.filter(l => l.engagementScore >= 10).length.toLocaleString(), color: 'text-emerald-600' },
          { label: 'Researched', value: (stats.total - stats.pending).toLocaleString(), color: 'text-blue-600' },
          { label: 'Hot (9-10)', value: leads.filter(l => l.websiteScore >= 9).length.toLocaleString(), color: 'text-emerald-600' },
          { label: 'Valid Emails', value: leads.filter(l => l.emailValid).length.toLocaleString(), color: 'text-purple-600' },
          { label: 'Avg Score', value: (leads.reduce((sum, l) => sum + (l.engagementScore || 0), 0) / (leads.length || 1)).toFixed(1), color: 'text-[#FF9F1C]' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 min-w-[130px] md:min-w-0">
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* 3. Research Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Row 1: Status + Progress */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#0B3060]">{stats.pending.toLocaleString()} pending</span>
            <span className="text-xs text-[#94A3B8]">{progress.toFixed(0)}% complete</span>
          </div>
          {(running || progress > 0) && (
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-[#FF9F1C] h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(progress, 1)}%` }} />
            </div>
          )}

          {/* Row 2: Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={batchSize} onChange={e => setBatchSize(Number(e.target.value))}
              className="text-xs bg-[#F7F8FA] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none font-medium text-[#1A1A2E]">
              {BATCH_SIZES.map(s => <option key={s} value={s}>{s === -1 ? 'Entire List' : `${s} per batch`}</option>)}
            </select>
            {!running ? (
              <button onClick={startResearch} disabled={stats.pending === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0B3060] text-white rounded-lg text-xs font-bold hover:bg-[#0a2850] transition-all disabled:opacity-50">
                <Play size={14} /> Research
              </button>
            ) : (
              <button onClick={research.stopResearch}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all">
                <Pause size={14} /> Stop
              </button>
            )}
            <button onClick={verifyEmails} disabled={verifying || running}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50">
              {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {verifying ? 'Verifying...' : 'Verify Emails'}
            </button>
            <button onClick={() => deepVerify('websites')} disabled={deepVerifying || running}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all disabled:opacity-50">
              {deepVerifying ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {deepVerifying ? `Verifying (${deepVerifyFeed.length})...` : 'Deep Verify'}
            </button>
            {/* Email stats inline */}
            {leads.some(l => l.emailStatus) && (
              <div className="flex gap-3 ml-auto">
                <span className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span className="text-emerald-700 font-semibold">{leads.filter(l => l.emailValid).length} valid</span></span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span className="text-red-600 font-semibold">{leads.filter(l => l.emailStatus && !l.emailValid).length} bad</span></span>
                <span className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span><span className="text-gray-500">{leads.filter(l => !l.emailStatus).length} unchecked</span></span>
              </div>
            )}
          </div>
          {/* Deep Verify Status Message */}
          {deepVerifyMsg && (
            <div className={`mt-2 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
              deepVerifyMsg.includes('error') || deepVerifyMsg.includes('failed') 
                ? 'bg-red-50 text-red-700 border border-red-100' 
                : deepVerifyMsg.includes('complete') 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-purple-50 text-purple-700 border border-purple-100'
            }`}>
              {deepVerifying && <Loader2 size={14} className="animate-spin" />}
              {deepVerifyMsg}
            </div>
          )}
        </div>
      </div>

      {/* 4. Score Distribution Cards - Horizontal scroll on mobile */}
      <div className="mobile-scroll-row md:grid md:grid-cols-6 md:gap-2">
        {[
          { range: '10-10', label: 'No Website', count: leads.filter(l => l.websiteScore === 10).length, color: 'bg-emerald-500', desc: 'Biggest opportunity' },
          { range: '8-9', label: 'Major Issues', count: leads.filter(l => l.websiteScore >= 8 && l.websiteScore <= 9).length, color: 'bg-emerald-400', desc: 'Website broken' },
          { range: '6-7', label: 'Needs Work', count: leads.filter(l => l.websiteScore >= 6 && l.websiteScore <= 7).length, color: 'bg-amber-400', desc: 'SEO issues' },
          { range: '4-5', label: 'Decent', count: leads.filter(l => l.websiteScore >= 4 && l.websiteScore <= 5).length, color: 'bg-blue-400', desc: 'Missing pages' },
          { range: '1-3', label: 'Good Site', count: leads.filter(l => l.websiteScore >= 1 && l.websiteScore <= 3).length, color: 'bg-gray-400', desc: 'Optimized' },
          { range: '0-0', label: 'Pending', count: leads.filter(l => l.websiteScore === 0 && l.websiteStatus === 'pending').length, color: 'bg-gray-200', desc: 'Not researched' },
        ].map(d => (
          <button key={d.range}
            onClick={() => { setScoreFilter(scoreFilter === d.range ? 'all' : d.range); setPage(0); }}
            className={`p-3 rounded-2xl text-left transition-all min-w-[120px] md:min-w-0 ${scoreFilter === d.range ? 'ring-2 ring-[#0B3060] bg-[#0B3060]/5' : 'bg-white border border-[#E2E8F0] hover:bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${d.color}`}></span>
              <span className="text-xl font-bold text-[#0B3060]">{d.count}</span>
            </div>
            <p className="text-[11px] font-bold text-[#64748B] mt-1">{d.label}</p>
            <p className="text-[10px] text-[#94A3B8]">{d.desc}</p>
          </button>
        ))}
      </div>

      {/* 5. Search + Filters */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#0B3060]/10">
          <Search size={18} className="text-[#94A3B8] flex-shrink-0" />
          <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            placeholder="Search company, email, city..."
            className="bg-transparent border-none outline-none text-[15px] font-medium w-full text-[#1A1A2E] placeholder-[#94A3B8]" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="p-1.5 rounded-lg hover:bg-[#F7F8FA]"><X size={16} className="text-[#94A3B8]" /></button>}
        </div>

        {/* Mobile filter toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${showMobileFilters ? 'bg-[#0B3060] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B]'}`}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FF9F1C] text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>

          {/* Sort button (mobile) */}
          <button
            onClick={() => toggleSort(sortField === 'score' ? 'company' : 'score')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-white border border-[#E2E8F0] text-[#64748B] md:hidden"
          >
            <ArrowUpDown size={16} />
            {sortField === 'score' ? 'Score' : sortField === 'company' ? 'Name' : sortField}
          </button>

          {/* Active filter pills */}
          {scoreFilter !== 'all' && (
            <button onClick={() => setScoreFilter('all')} className="flex items-center gap-1 px-3 py-2 bg-[#0B3060] text-white rounded-lg text-xs font-bold">
              Score: {scoreFilter} <X size={12} />
            </button>
          )}

          <span className="text-xs text-[#94A3B8] font-medium ml-auto">
            {filtered.length.toLocaleString()} lead{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Expandable filter panel */}
        {showMobileFilters && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3 animate-reveal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Status</label>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                  className="w-full text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none font-medium text-[#1A1A2E]">
                  <option value="all">All Statuses</option>
                  <option value="queued">Queued</option><option value="sent">Sent</option><option value="opened">Opened</option>
                  <option value="clicked">Clicked</option><option value="replied">Replied</option><option value="bounced">Bounced</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Campaign</label>
                <select value={campaignFilter} onChange={e => { setCampaignFilter(e.target.value); setPage(0); }}
                  className="w-full text-sm bg-[#F7F8FA] border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none font-medium text-[#1A1A2E]">
                  <option value="all">All Campaigns</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setStatusFilter('all'); setCampaignFilter('all'); setScoreFilter('all'); }}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#94A3B8] bg-[#F7F8FA] border border-[#E2E8F0]">
                Clear All
              </button>
              <button onClick={() => setShowMobileFilters(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B3060]">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Leads Table (Desktop) */}
      <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F7F8FA]">
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold cursor-pointer hover:text-[#0B3060]" onClick={() => toggleSort('company')}>
                  <span className="flex items-center gap-1">Company <SortIcon field="company" /></span>
                </th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Email</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Location</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold cursor-pointer hover:text-[#0B3060]" onClick={() => toggleSort('score')}>
                  <span className="flex items-center gap-1">Score <SortIcon field="score" /></span>
                </th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Website</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Email Valid</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Research</th>
                <th className="text-left py-3 px-3 text-[#64748B] font-semibold">Verified</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(lead => (
                <tr key={lead.id} className="border-b border-[#E2E8F0]/50 hover:bg-[#F7F8FA] cursor-pointer transition-all"
                  onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}>
                  <td className="py-2.5 px-3"><p className="font-semibold text-[#1A1A2E]">{lead.companyName || '—'}</p></td>
                  <td className="py-2.5 px-3 text-[#475569] truncate max-w-[180px]">{lead.email}</td>
                  <td className="py-2.5 px-3 text-[#64748B]">{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="py-2.5 px-3"><LeadScoreBar score={lead.websiteScore} showLabel /></td>
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
                      lead.websiteStatus === 'crawled' ? 'bg-emerald-50 text-emerald-600' :
                      lead.websiteStatus === 'no_website' ? 'bg-red-50 text-red-500' :
                      lead.websiteStatus === 'error' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-50 text-[#94A3B8]'
                    }`}>{lead.websiteStatus === 'pending' ? 'Pending' : lead.websiteStatus === 'crawled' ? 'Done' : lead.websiteStatus === 'no_website' ? 'No Site' : lead.websiteStatus}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    {lead.deepVerifyStatus ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        lead.deepVerifyStatus === 'website_found' ? 'bg-purple-50 text-purple-600' :
                        lead.deepVerifyStatus === 'verified' ? 'bg-blue-50 text-blue-600' :
                        lead.deepVerifyStatus === 'email_updated' ? 'bg-purple-50 text-purple-600' :
                        lead.deepVerifyStatus === 'no_change' ? 'bg-gray-50 text-gray-500' :
                        lead.deepVerifyStatus === 'error' ? 'bg-red-50 text-red-500' :
                        'bg-gray-50 text-[#94A3B8]'
                      }`}>{lead.deepVerifyStatus === 'website_found' ? 'Found!' :
                           lead.deepVerifyStatus === 'verified' ? 'Confirmed' :
                           lead.deepVerifyStatus === 'email_updated' ? 'Email Found' :
                           lead.deepVerifyStatus === 'no_change' ? 'No Change' :
                           lead.deepVerifyStatus === 'pending' ? '...' :
                           lead.deepVerifyStatus}</span>
                    ) : <span className="text-[10px] text-[#CBD5E1]">—</span>}
                  </td>
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

      {/* 6b. Leads Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {paged.map(lead => (
          <div
            key={lead.id}
            className="mobile-lead-card active:scale-[0.98]"
            onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
          >
            {/* Top row: Company + Score */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-[#1A1A2E] truncate">{lead.companyName || 'Unknown'}</p>
                <p className="text-xs text-[#94A3B8] truncate mt-0.5">{lead.email}</p>
                {(lead.city || lead.state) && (
                  <p className="text-[11px] text-[#CBD5E1] mt-0.5">{[lead.city, lead.state].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <div className="flex-shrink-0">
                <LeadScoreBar score={lead.websiteScore} showLabel />
              </div>
            </div>

            {/* Status chips row */}
            <div className="flex flex-wrap gap-2">
              {/* Research status */}
              <span className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${
                lead.websiteStatus === 'crawled' ? 'bg-emerald-50 text-emerald-600' :
                lead.websiteStatus === 'no_website' ? 'bg-red-50 text-red-500' :
                lead.websiteStatus === 'error' ? 'bg-amber-50 text-amber-600' :
                'bg-gray-50 text-[#94A3B8]'
              }`}>
                {lead.websiteStatus === 'pending' ? 'Pending' : lead.websiteStatus === 'crawled' ? 'Researched' : lead.websiteStatus === 'no_website' ? 'No Site' : lead.websiteStatus}
              </span>

              {/* Email status */}
              {lead.emailStatus && (
                <span className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${lead.emailValid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {lead.emailValid ? 'Email Valid' : 'Email Invalid'}
                </span>
              )}

              {/* Website */}
              {lead.website && (
                <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-blue-50 text-blue-600 truncate max-w-[160px]">
                  {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </span>
              )}

              {/* Campaign */}
              {campaignMap[lead.campaignId] && (
                <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-[#F7F8FA] text-[#64748B]">
                  {campaignMap[lead.campaignId]}
                </span>
              )}
            </div>
          </div>
        ))}

        {paged.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-[#94A3B8]">
            <Search size={40} className="mb-4 opacity-30" />
            <p className="font-serif italic text-base">No leads match your filters</p>
          </div>
        )}
      </div>

      {/* Pagination (Mobile + Desktop) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 md:hidden">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-5 py-3 rounded-xl text-sm font-bold bg-white border border-[#E2E8F0] text-[#64748B] disabled:opacity-40 active:bg-[#F7F8FA] transition-all">
            Previous
          </button>
          <span className="text-sm font-bold text-[#64748B]">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-5 py-3 rounded-xl text-sm font-bold bg-[#0B3060] text-white disabled:opacity-40 active:bg-[#0a2850] transition-all">
            Next
          </button>
        </div>
      )}

      {/* 7. Lead Detail Modal - Mobile Fullscreen */}
      {selectedLead && ReactDOM.createPortal(
        (() => {
          const a: any = typeof selectedLead.websiteAnalysis === 'object' && selectedLead.websiteAnalysis ? selectedLead.websiteAnalysis : {};
          const seoIssues: string[] = Array.isArray(a.seoIssues) ? a.seoIssues : [];
          const keyFindings: string[] = Array.isArray(a.keyFindings) ? a.keyFindings : [];
          const techStack: string[] = Array.isArray(a.techStack) ? a.techStack : [];
          return (
            <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
              <div className="w-full md:max-w-2xl bg-white md:rounded-3xl rounded-t-[28px] shadow-2xl overflow-hidden max-h-[95vh] md:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Drag handle (mobile) */}
                <div className="md:hidden sticky top-0 bg-[#0B3060] pt-3 pb-0 flex justify-center">
                  <div className="w-10 h-1.5 bg-white/30 rounded-full"></div>
                </div>

                {/* Modal Header */}
                <div className="bg-[#0B3060] text-white p-5 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-serif font-bold truncate">{selectedLead.companyName || 'Unknown Business'}</h2>
                      <p className="text-sm text-white/60 mt-1 truncate">{selectedLead.email}
                        {selectedLead.emailStatus && (
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${selectedLead.emailValid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                            {selectedLead.emailValid ? 'Verified' : 'Invalid'}
                          </span>
                        )}
                      </p>
                      {(selectedLead.emailVerification as any)?.mx_records?.length > 0 && (
                        <p className="text-white/40 text-[10px] mt-1 truncate">MX: {(selectedLead.emailVerification as any).mx_records.map((r: any) => r.exchange).join(', ')}</p>
                      )}
                      {selectedLead.city && <p className="text-sm text-white/40 mt-0.5">{selectedLead.city}{selectedLead.state ? `, ${selectedLead.state}` : ''}</p>}
                    </div>
                    <button onClick={() => setSelectedLead(null)} className="p-3 hover:bg-white/10 rounded-xl transition-all flex-shrink-0 -mr-1">
                      <X size={22} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className={`text-3xl font-bold ${selectedLead.websiteScore >= 9 ? 'text-emerald-400' : selectedLead.websiteScore >= 7 ? 'text-amber-400' : selectedLead.websiteScore >= 5 ? 'text-blue-400' : 'text-gray-400'}`}>
                      {selectedLead.websiteScore}/10
                    </div>
                    <div className="text-sm text-white/60">
                      {selectedLead.websiteScore >= 9 ? 'Highest Priority' :
                       selectedLead.websiteScore >= 7 ? 'High Priority' :
                       selectedLead.websiteScore >= 5 ? 'Medium Priority' :
                       selectedLead.websiteScore >= 3 ? 'Lower Priority' : 'Low Priority'}
                    </div>
                  </div>
                </div>

                <div className="p-5 md:p-6 space-y-4">
                  {/* Website URL */}
                  <div className="flex items-center gap-3 p-4 bg-[#F7F8FA] rounded-2xl">
                    <Globe size={18} className="text-[#64748B] flex-shrink-0" />
                    {selectedLead.website ? (
                      <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1 font-medium">
                        {selectedLead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} <ExternalLink size={14} />
                      </a>
                    ) : <span className="text-sm text-red-500 font-medium">No website found</span>}
                  </div>

                  {/* Quick info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#F7F8FA] rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Campaign</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1 truncate">{campaignMap[selectedLead.campaignId] || '—'}</p>
                    </div>
                    <div className="p-3 bg-[#F7F8FA] rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Send Status</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1 capitalize">{selectedLead.sendStatus}</p>
                    </div>
                    <div className="p-3 bg-[#F7F8FA] rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Engagement</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1">{selectedLead.engagementScore}</p>
                    </div>
                    <div className="p-3 bg-[#F7F8FA] rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Research</p>
                      <p className="text-xs font-bold text-[#0B3060] mt-1 capitalize">{selectedLead.websiteStatus}</p>
                    </div>
                  </div>

                  {/* Assessment */}
                  {a.overallAssessment && (
                    <div className="p-4 bg-[#FF9F1C]/5 border border-[#FF9F1C]/10 rounded-2xl">
                      <h4 className="text-xs font-bold text-[#FF9F1C] uppercase tracking-wider mb-1">Assessment</h4>
                      <p className="text-sm text-[#0B3060] leading-relaxed">{a.overallAssessment}</p>
                    </div>
                  )}

                  {/* Deep Verification Results */}
                  {selectedLead.deepVerifyStatus && (
                    <div className={`p-4 border rounded-xl ${selectedLead.needsReview ? 'bg-amber-50/50 border-amber-200' : 'bg-purple-50/50 border-purple-100'}`}>
                      <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Search size={14} /> Deep Verification — {selectedLead.deepVerifyStatus}
                      </h4>
                      {selectedLead.verifiedWebsite && (
                        <p className="text-sm text-[#0B3060] mb-1">
                          Found website: <a href={selectedLead.verifiedWebsite.startsWith('http') ? selectedLead.verifiedWebsite : 'https://' + selectedLead.verifiedWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedLead.verifiedWebsite}</a>
                        </p>
                      )}
                      {selectedLead.verifiedEmail && selectedLead.verifiedEmail.toLowerCase() !== selectedLead.email.toLowerCase() && (
                        <p className="text-sm text-[#0B3060] mb-1">
                          Found email: <span className="font-semibold">{selectedLead.verifiedEmail}</span>
                          <span className="text-[10px] text-amber-600 ml-2">(CSV had: {selectedLead.email})</span>
                        </p>
                      )}
                      {selectedLead.needsReview && (
                        <p className="text-xs text-amber-700 mt-2 font-medium">Needs review: {selectedLead.reviewReason}</p>
                      )}
                      {(selectedLead.perplexityVerification as any)?.notes && (
                        <p className="text-xs text-[#64748B] mt-1">{(selectedLead.perplexityVerification as any).notes}</p>
                      )}
                    </div>
                  )}

                  {/* SSL / Mobile / Schema / Speed */}
                  {(a.hasWebsite || a.isReachable) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'SSL', value: a.hasSSL ? 'Secure' : 'Not Secure', ok: a.hasSSL, icon: ShieldAlert },
                        { label: 'Mobile', value: a.isMobileResponsive ? 'Responsive' : 'Not Responsive', ok: a.isMobileResponsive, icon: Smartphone },
                        { label: 'Schema', value: a.hasSchemaMarkup ? 'Has Schema' : 'No Schema', ok: a.hasSchemaMarkup, icon: FileCode },
                        { label: 'Speed', value: a.loadTimeMs ? `${(a.loadTimeMs / 1000).toFixed(1)}s` : 'N/A', ok: (a.loadTimeMs || 0) < 3000, icon: Clock },
                      ].map(stat => (
                        <div key={stat.label} className="p-3 bg-[#F7F8FA] rounded-2xl text-center">
                          <stat.icon size={18} className={`mx-auto mb-1 ${stat.ok ? 'text-emerald-500' : 'text-red-400'}`} />
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">{stat.label}</p>
                          <p className={`text-xs font-bold ${stat.ok ? 'text-emerald-600' : 'text-red-500'}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tech Stack + City Pages */}
                  {(a.hasWebsite || a.isReachable) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 bg-[#F7F8FA] rounded-2xl">
                        <h4 className="text-xs font-bold text-[#64748B] uppercase mb-2">Tech Stack</h4>
                        {techStack.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">{techStack.map((t: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-[#0B3060]">{t}</span>
                          ))}</div>
                        ) : <p className="text-xs text-[#94A3B8]">Unknown</p>}
                      </div>
                      <div className="p-4 bg-[#F7F8FA] rounded-2xl">
                        <h4 className="text-xs font-bold text-[#64748B] uppercase mb-2">City/Service Pages</h4>
                        <p className={`text-sm font-bold ${a.cityServicePages ? 'text-emerald-600' : 'text-red-500'}`}>{a.cityServicePages ? 'Found' : 'Not detected'}</p>
                        <p className="text-[11px] text-[#94A3B8] mt-1">Est. {a.estimatedPageCount || '?'} pages</p>
                      </div>
                    </div>
                  )}

                  {/* SEO Issues */}
                  {seoIssues.length > 0 && (
                    <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                      <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle size={14} /> SEO Issues ({seoIssues.length})</h4>
                      <ul className="space-y-2">{seoIssues.map((issue: string, i: number) => (
                        <li key={i} className="text-sm text-[#0B3060] flex items-start gap-2"><XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />{issue}</li>
                      ))}</ul>
                    </div>
                  )}

                  {/* Deep Verify Button (for leads without website or with errors) */}
                  {(selectedLead.websiteStatus === 'no_website' || selectedLead.websiteStatus === 'error') && !selectedLead.deepVerifyStatus && (
                    <button onClick={() => deepVerifySingle(selectedLead.id)} disabled={singleVerifying}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all disabled:opacity-50">
                      {singleVerifying ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      {singleVerifying ? 'Searching with Perplexity AI...' : 'Deep Verify with Perplexity AI'}
                    </button>
                  )}

                  {/* Key Findings */}
                  {keyFindings.length > 0 && (
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Key Findings</h4>
                      <ul className="space-y-2">{keyFindings.map((f: string, i: number) => (
                        <li key={i} className="text-sm text-[#0B3060] flex items-start gap-2"><CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />{f}</li>
                      ))}</ul>
                    </div>
                  )}

                  {/* Personalized Email */}
                  {selectedLead.personalizedSubject && (
                    <div className="p-4 bg-[#0B3060]/5 border border-[#0B3060]/10 rounded-2xl">
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

                  {/* Bottom safe area spacer on mobile */}
                  <div className="h-4 md:hidden"></div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Floating Research Pill */}
      {(research.isRunning || research.isComplete) && ReactDOM.createPortal(
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[998]">
          {!pillExpanded ? (
            <button onClick={() => setPillExpanded(true)}
              className="bg-[#0B3060] text-white rounded-2xl shadow-2xl border border-white/10 px-4 py-3 flex items-center gap-3 active:scale-[0.97] transition-all cursor-pointer">
              {research.isRunning ? (
                <Loader2 size={18} className="animate-spin text-[#FF9F1C]" />
              ) : (
                <CheckCircle size={18} className="text-emerald-400" />
              )}
              <span className="text-sm font-bold">
                {research.isRunning ? `${research.researched.toLocaleString()}/${research.totalLeads.toLocaleString()}` : 'Done!'}
              </span>
              {research.isRunning && (
                <div className="w-16 bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#FF9F1C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${research.totalLeads > 0 ? (research.researched / research.totalLeads * 100) : 0}%` }} />
                </div>
              )}
            </button>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-[calc(100vw-32px)] max-w-[380px] overflow-hidden">
              <div className="bg-[#0B3060] text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {research.isRunning ? <Loader2 size={16} className="animate-spin text-[#FF9F1C]" /> : <CheckCircle size={16} className="text-emerald-400" />}
                  <span className="text-sm font-bold">{research.isRunning ? 'Researching' : 'Complete'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {research.isRunning && (
                    <button onClick={(e) => { e.stopPropagation(); research.stopResearch(); }}
                      className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-[11px] font-bold transition-all">Stop</button>
                  )}
                  <button onClick={() => setPillExpanded(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all"><ChevronDown size={16} /></button>
                </div>
              </div>
              <div className="px-4 py-3 border-b border-[#E2E8F0]">
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2">
                  <div className="bg-[#FF9F1C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${research.totalLeads > 0 ? (research.researched / research.totalLeads * 100) : 0}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-[#64748B]">
                  <span>{research.researched.toLocaleString()} researched</span>
                  <span>{research.pending.toLocaleString()} remaining</span>
                </div>
              </div>
              <div className="px-4 py-3 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-[#0B3060]">{research.avgScore.toFixed(1)}</p>
                  <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Avg Score</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{research.crawled.toLocaleString()}</p>
                  <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Crawled</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-500">{research.broken.toLocaleString()}</p>
                  <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Errors</p>
                </div>
              </div>
              <div className="px-4 pb-3 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">No Website</span><span className="font-bold text-emerald-600">{research.noWebsite}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">Crawled</span><span className="font-bold text-blue-600">{research.crawled}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#64748B]">Errors</span><span className="font-bold text-red-500">{research.broken}</span></div>
                <div className="flex justify-between text-xs border-t border-[#E2E8F0] pt-1.5 mt-1.5">
                  <span className="text-[#64748B] font-semibold">Total</span>
                  <span className="font-bold text-[#0B3060]">{research.researched.toLocaleString()}</span>
                </div>
              </div>
              {research.isComplete && (
                <div className="px-4 pb-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-emerald-700">All done!</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">{research.researched.toLocaleString()} leads processed</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeadDatabase;
