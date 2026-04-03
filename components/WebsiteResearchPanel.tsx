import ReactDOM from "react-dom";
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, Play, Pause, AlertTriangle, CheckCircle, XCircle, Loader2, CheckSquare, Square, Filter, Globe, ExternalLink, X, ShieldAlert, Smartphone, FileCode, Clock, Layers, MapPin } from 'lucide-react';
import { CampaignLead, ResearchStats } from '../types';
import { calculateResearchStats } from '../services/dataService';
import { useResearch } from './ResearchContext';
import LeadScoreBar from './LeadScoreBar';

interface WebsiteResearchPanelProps {
  campaignId: string;
  campaignName: string;
  leads: CampaignLead[];
  onRefresh: () => void;
}

const BATCH_SIZES = [10, 25, 50, 100, 250, 500];

const WebsiteResearchPanel: React.FC<WebsiteResearchPanelProps> = ({ campaignId, campaignName, leads, onRefresh }) => {
  const research = useResearch();
  const running = research.isRunning && research.campaignId === campaignId;
  const runningOther = research.isRunning && research.campaignId !== null && research.campaignId !== campaignId;

  const [stats, setStats] = useState<ResearchStats>(() => calculateResearchStats(leads));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSize, setBatchSize] = useState(25);
  const [filterView, setFilterView] = useState<'all' | 'pending' | 'done'>('all');
  const [scoreFilter, setScoreFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLead, setExpandedLead] = useState<CampaignLead | null>(null);
  const [verifying, setVerifying] = useState(false);

  const verifyEmails = async () => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('relay_auth_token') || '';
      const resp = await fetch('https://provider-os-production.up.railway.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'verify_emails_batch', campaign_id: campaignId, batch_size: 500 }),
      });
      const data = await resp.json();
      if (data.success) {
        setTimeout(() => onRefresh(), 3000);
        setTimeout(() => { onRefresh(); setVerifying(false); }, 8000);
      } else {
        setVerifying(false);
      }
    } catch {
      setVerifying(false);
    }
  };

  useEffect(() => {
    setStats(calculateResearchStats(leads));
  }, [leads]);

  // Auto-refresh while research is running for this campaign
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => onRefresh(), 3000);
    return () => clearInterval(iv);
  }, [running, onRefresh]);

  const visibleLeads = leads.filter(l => {
    if (scoreFilter) {
      const [lo, hi] = scoreFilter.split('-').map(Number);
      if (l.websiteScore < lo || l.websiteScore > hi) return false;
    }
    if (filterView === 'pending' && l.websiteStatus !== 'pending') return false;
    if (filterView === 'done' && l.websiteStatus === 'pending') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return l.email.toLowerCase().includes(term) ||
        l.companyName.toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.state.toLowerCase().includes(term);
    }
    return true;
  });

  const pendingLeads = leads.filter(l => l.websiteStatus === 'pending');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const pendingVisible = visibleLeads.filter(l => l.websiteStatus === 'pending');
    if (pendingVisible.every(l => selectedIds.has(l.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingVisible.forEach(l => next.delete(l.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingVisible.forEach(l => next.add(l.id));
        return next;
      });
    }
  };

  const startResearch = () => {
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    research.startResearch(campaignId, campaignName, batchSize, targetIds);
    if (targetIds) setSelectedIds(new Set());
  };

  const stopResearch = () => {
    research.stopResearch();
  };

  const researched = stats.total - stats.pending;
  const progress = stats.total > 0 ? (researched / stats.total) * 100 : 0;

  const chartData = Object.entries(stats.scoreDistribution).map(([range, count]) => ({
    range, count,
    fill: range === '9-10' ? '#10B981' : range === '7-8' ? '#FF9F1C' : range === '5-6' ? '#F59E0B' : range === '3-4' ? '#60A5FA' : '#D1D5DB',
  }));

  const allVisiblePendingSelected = visibleLeads.filter(l => l.websiteStatus === 'pending').length > 0 &&
    visibleLeads.filter(l => l.websiteStatus === 'pending').every(l => selectedIds.has(l.id));

  return (
    <div className="space-y-5">

      {/* Cross-campaign notice */}
      {runningOther && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-amber-500" />
          <p className="text-xs text-amber-700 font-medium">Research is running on <span className="font-bold">{research.campaignName}</span></p>
        </div>
      )}

      {/* Progress + Controls */}
      <div className="luminous-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0B3060]">Website Research</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Researched {researched.toLocaleString()} / {stats.total.toLocaleString()} leads
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Batch size selector */}
            <select
              value={batchSize}
              onChange={e => setBatchSize(Number(e.target.value))}
              disabled={running || runningOther}
              className="text-xs bg-gray-50 border border-[#E2E8F0] rounded-lg px-2 py-1.5 outline-none"
            >
              {BATCH_SIZES.map(s => (
                <option key={s} value={s}>{s} at a time</option>
              ))}
            </select>

            {!running ? (
              <button
                onClick={() => startResearch()}
                disabled={(selectedIds.size === 0 && stats.pending === 0) || runningOther}
                className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-xl text-xs font-bold hover:bg-[#0a2850] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                {selectedIds.size > 0 ? `Research ${selectedIds.size} Selected` : `Research All (${stats.pending})`}
              </button>
            ) : (
              <button
                onClick={stopResearch}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all"
              >
                <Pause size={14} /> Stop
              </button>
            )}
            <button
              onClick={verifyEmails}
              disabled={verifying || running}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {verifying ? 'Verifying...' : 'Verify Emails'}
            </button>
          </div>
        </div>

        {/* Email verification summary */}
        {leads.some(l => l.emailStatus) && (
          <div className="flex gap-3 mb-2">
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-700 font-semibold">{leads.filter(l => l.emailValid).length} valid</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-red-600 font-semibold">{leads.filter(l => l.emailStatus && !l.emailValid).length} invalid</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-blue-600 font-semibold">{leads.filter(l => l.emailVerification?.is_free_provider).length} free provider</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
              <span className="text-gray-500">{leads.filter(l => !l.emailStatus).length} unchecked</span>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
          <div
            className="bg-[#FF9F1C] h-full rounded-full transition-all duration-500 relative"
            style={{ width: `${Math.max(progress, 1)}%` }}
          >
            {running && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-[#94A3B8]">
          <span>{progress.toFixed(0)}% complete</span>
          <span>{stats.pending} remaining</span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'No Website', value: stats.noWebsite, icon: XCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Broken', value: stats.errors, icon: AlertTriangle, color: 'text-[#FF9F1C]', bg: 'bg-[#FF9F1C]/10' },
          { label: 'Crawled', value: stats.crawled, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending', value: stats.pending, icon: Loader2, color: 'text-gray-500', bg: 'bg-gray-50' },
          { label: 'Avg Score', value: stats.avgScore.toFixed(1), icon: Search, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#E2E8F0] rounded-xl p-3 text-center">
            <card.icon size={16} className={`${card.color} mx-auto mb-1.5`} />
            <p className="text-lg font-bold text-[#0B3060]">{card.value}</p>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{card.label}</p>
          </div>
        ))}
      </div>


      {/* Live Activity Feed */}
      {(running || leads.some(l => l.websiteStatus === 'crawling' || (l.websiteStatus === 'crawled' && l.websiteScore > 0))) && (
        <div className="luminous-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-[#0B3060]">Live Research Feed</h3>
            <span className="text-[10px] text-[#94A3B8] ml-auto">{leads.filter(l => l.websiteStatus === 'crawling').length} crawling now</span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {leads
              .filter(l => l.websiteStatus !== 'pending')
              .sort((a, b) => (b.researchCompletedAt || '').localeCompare(a.researchCompletedAt || ''))
              .slice(0, 20)
              .map(l => (
                <div key={l.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-gray-50/50 text-xs">
                  {l.websiteStatus === 'crawling' ? (
                    <Loader2 size={12} className="text-[#FF9F1C] animate-spin flex-shrink-0" />
                  ) : l.websiteStatus === 'crawled' ? (
                    <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                  ) : l.websiteStatus === 'no_website' ? (
                    <XCircle size={12} className="text-red-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                  )}
                  <span className="font-medium text-[#0B3060] truncate w-40">{l.companyName}</span>
                  <span className="text-[#94A3B8] truncate flex-1">{l.website || 'no website'}</span>
                  {l.websiteScore > 0 && (
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      l.websiteScore >= 9 ? 'bg-emerald-100 text-emerald-700' :
                      l.websiteScore >= 7 ? 'bg-amber-100 text-amber-700' :
                      l.websiteScore >= 5 ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{l.websiteScore}/10</span>
                  )}
                  {l.websiteStatus === 'crawling' && (
                    <span className="text-[#FF9F1C] font-medium animate-pulse">Crawling...</span>
                  )}
                  {l.websiteAnalysis && (l.websiteAnalysis as any).overallAssessment && (
                    <span className="text-[10px] text-[#64748B] truncate max-w-[200px]">{(l.websiteAnalysis as any).overallAssessment}</span>
                  )}
                </div>
              ))}
            {leads.filter(l => l.websiteStatus !== 'pending').length === 0 && (
              <p className="text-xs text-[#94A3B8] text-center py-4">Waiting for first results...</p>
            )}
          </div>
        </div>
      )}

      {/* Score distribution */}
      {researched > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B3060]">Score Distribution</h3>
            <span className="text-xs text-[#64748B]">{researched.toLocaleString()} researched / {stats.total.toLocaleString()} total</span>
          </div>

          {/* Score tier cards — all info visible, no hover needed */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {chartData.map(d => {
              const pct = stats.total > 0 ? ((d.count / stats.total) * 100).toFixed(1) : '0';
              const isActive = scoreFilter === d.range;
              return (
                <div key={d.range}
                  onClick={() => { setScoreFilter(isActive ? null : d.range); setFilterView('done'); }}
                  className={`bg-white border-2 rounded-xl p-4 relative overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    isActive ? 'border-[#0B3060] shadow-md ring-2 ring-[#0B3060]/10' : 'border-[#E2E8F0]'
                  }`}>
                  {/* Color accent bar at top */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: d.fill }} />

                  {/* Score range + count */}
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: d.fill }} />
                      <span className="text-lg font-bold text-[#0B3060]">{d.range}</span>
                    </div>
                    <span className="text-2xl font-extrabold text-[#0B3060]">{d.count.toLocaleString()}</span>
                  </div>

                  {/* Visual bar showing proportion */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="h-2 rounded-full transition-all duration-500" style={{ width: pct + '%', background: d.fill }} />
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mb-3">{pct}% of all leads</p>

                  {/* Label */}
                  <p className="text-xs font-bold text-[#0B3060] mb-1">{d.label || ''}</p>

                  {/* Why this score */}
                  <p className="text-[11px] text-[#64748B] leading-relaxed mb-2">{d.why || ''}</p>

                  {/* Action recommendation */}
                  {d.action && (
                    <div className="bg-[#F7F8FA] rounded-lg p-2 mt-auto">
                      <p className="text-[10px] text-[#0B3060] font-medium leading-relaxed">{d.action}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lead selection list */}
      <div className="luminous-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#0B3060]">
              {scoreFilter ? `Score ${scoreFilter} Leads` : 'Select Leads to Research'}
            </h3>
            {scoreFilter && (
              <button onClick={() => setScoreFilter(null)} className="text-[10px] bg-[#0B3060] text-white px-2 py-0.5 rounded-full hover:bg-[#0a2850] transition-all flex items-center gap-1">
                Clear filter ×
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <span className="text-xs text-[#FF9F1C] font-semibold">{selectedIds.size} selected</span>
          )}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-[#E2E8F0] rounded-lg px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, city..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs outline-none w-full"
            />
          </div>
          <div className="flex gap-1">
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'pending' as const, label: 'Pending' },
              { id: 'done' as const, label: 'Researched' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterView(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  filterView === f.id ? 'bg-[#0B3060] text-white' : 'bg-gray-50 text-[#64748B]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Select all + list */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-[#E2E8F0] text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
            <button onClick={selectAllVisible} className="flex-shrink-0">
              {allVisiblePendingSelected && visibleLeads.filter(l => l.websiteStatus === 'pending').length > 0 ? (
                <CheckSquare size={14} className="text-[#FF9F1C]" />
              ) : (
                <Square size={14} className="text-gray-300" />
              )}
            </button>
            <span className="flex-1">Lead</span>
            <span className="w-28">Website</span>
            <span className="w-16 text-right">Score</span>
            <span className="w-16 text-right">Status</span>
            <span className="w-14 text-right">Email</span>
          </div>

          {/* Rows */}
          <div className="max-h-72 overflow-y-auto">
            {visibleLeads.slice(0, 200).map(lead => {
              const isPending = lead.websiteStatus === 'pending';
              const isSelected = selectedIds.has(lead.id);
              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    if (isPending) toggleSelect(lead.id);
                    else if (lead.websiteStatus === 'crawled' || lead.websiteStatus === 'no_website' || lead.websiteStatus === 'error') setExpandedLead(lead);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 border-b border-[#E2E8F0]/50 text-xs transition-all cursor-pointer hover:bg-gray-50/50 ${
                    isSelected ? 'bg-[#FF9F1C]/5' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isPending ? (
                      isSelected ? (
                        <CheckSquare size={14} className="text-[#FF9F1C]" />
                      ) : (
                        <Square size={14} className="text-gray-300" />
                      )
                    ) : (
                      <CheckCircle size={14} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0B3060] font-medium truncate">{lead.companyName || lead.email}</p>
                    <p className="text-[10px] text-[#94A3B8] truncate">{lead.email}</p>
                  </div>
                  <div className="w-28 truncate text-[#64748B]">
                    {lead.website ? (
                      <span className="text-[10px]">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    ) : (
                      <span className="text-[10px] text-[#ccc]">None</span>
                    )}
                  </div>
                  <div className="w-16 text-right">
                    <LeadScoreBar score={lead.websiteScore} />
                  </div>
                  <div className="w-16 text-right">
                    <span className={`text-[10px] font-semibold ${
                      lead.websiteStatus === 'crawled' ? 'text-emerald-600' :
                      lead.websiteStatus === 'no_website' ? 'text-red-500' :
                      lead.websiteStatus === 'error' ? 'text-red-400' :
                      lead.websiteStatus === 'crawling' ? 'text-amber-500' :
                      'text-gray-400'
                    }`}>
                      {lead.websiteStatus === 'pending' ? 'Pending' :
                       lead.websiteStatus === 'crawled' ? 'Done' :
                       lead.websiteStatus === 'no_website' ? 'No Site' :
                       lead.websiteStatus === 'crawling' ? 'Crawling' :
                       'Error'}
                    </span>
                  </div>
                  <div className="w-14 text-right">
                    {lead.emailStatus ? (
                      <span className={`text-[10px] font-semibold ${
                        lead.emailValid ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {lead.emailValid ? '✓ Valid' : '✗ Bad'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {visibleLeads.length > 200 && (
            <p className="text-[10px] text-[#94A3B8] text-center py-2">Showing first 200 of {visibleLeads.length}</p>
          )}
        </div>
      </div>


      {/* Detail Modal */}
      {expandedLead && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setExpandedLead(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-[#0B3060] text-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{expandedLead.companyName || expandedLead.email}</h3>
                  <p className="text-white/60 text-sm">{expandedLead.email}
                    {expandedLead.emailStatus && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        expandedLead.emailValid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {expandedLead.emailValid ? '✓ Verified' : '✗ Invalid'} — {expandedLead.emailVerification?.reason || expandedLead.emailStatus}
                      </span>
                    )}
                  </p>
                  {expandedLead.emailVerification?.mx_records && expandedLead.emailVerification.mx_records.length > 0 && (
                    <p className="text-white/40 text-[10px] mt-1">
                      MX: {expandedLead.emailVerification.mx_records.map((r: any) => r.exchange).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <LeadScoreBar score={expandedLead.websiteScore} showLabel />
                  <button onClick={() => setExpandedLead(null)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={16} /></button>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-[#94A3B8]">Location:</span> <span className="font-medium text-[#1A1A2E]">{[expandedLead.city, expandedLead.state].filter(Boolean).join(', ') || '—'}</span></div>
                <div><span className="text-[#94A3B8]">Website:</span> <span className="font-medium text-[#1A1A2E]">{expandedLead.website || 'None'}</span></div>
                <div><span className="text-[#94A3B8]">Status:</span> <span className="font-medium text-[#1A1A2E]">{expandedLead.websiteStatus}</span></div>
                <div><span className="text-[#94A3B8]">Score:</span> <span className="font-medium text-[#1A1A2E]">{expandedLead.websiteScore}/10</span></div>
              </div>
              {expandedLead.websiteAnalysis && 'overallAssessment' in expandedLead.websiteAnalysis && (
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-1">Analysis</p>
                  <p className="text-sm text-[#475569]">{(expandedLead.websiteAnalysis as any).overallAssessment}</p>
                  {((expandedLead.websiteAnalysis as any).keyFindings || []).map((f: string, i: number) => (
                    <p key={i} className="text-xs text-[#64748B] mt-1">• {f}</p>
                  ))}
                  {((expandedLead.websiteAnalysis as any).seoIssues || []).length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold text-red-500 uppercase mb-1">SEO Issues</p>
                      {((expandedLead.websiteAnalysis as any).seoIssues || []).map((s: string, i: number) => (
                        <p key={i} className="text-xs text-red-500">• {s}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Score legend */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">Score Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
          {[
            { range: '9-10', desc: 'No website / unreachable — highest priority', color: 'text-emerald-600' },
            { range: '7-8', desc: 'Major issues (no SSL, no SEO, old template)', color: 'text-[#FF9F1C]' },
            { range: '5-6', desc: 'Decent but missing city/service pages', color: 'text-amber-600' },
            { range: '3-4', desc: 'Okay website, missing AEO/schema', color: 'text-blue-500' },
            { range: '1-2', desc: 'Good website already — lower priority', color: 'text-gray-400' },
          ].map(item => (
            <div key={item.range} className="flex items-center gap-2">
              <span className={`font-bold ${item.color} w-8`}>{item.range}</span>
              <span className="text-[#64748B]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WebsiteResearchPanel;
