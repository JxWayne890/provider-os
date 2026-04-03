import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Pause, Eye, Edit3, Check, X } from 'lucide-react';
import { CampaignLead, PersonalizationStats } from '../types';
import { triggerPersonalizeBatch, calculatePersonalizationStats, upsertCampaignLead } from '../services/dataService';
import LeadScoreBar from './LeadScoreBar';

interface PersonalizationPanelProps {
  campaignId: string;
  leads: CampaignLead[];
  onRefresh: () => void;
}

const PersonalizationPanel: React.FC<PersonalizationPanelProps> = ({ campaignId, leads, onRefresh }) => {
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<PersonalizationStats>(() => calculatePersonalizationStats(leads));
  const [previewLead, setPreviewLead] = useState<CampaignLead | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [filterScore, setFilterScore] = useState<string>('all');
  const stopRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setStats(calculatePersonalizationStats(leads));
  }, [leads]);

  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startPersonalization = async () => {
    setRunning(true);
    stopRef.current = false;
    intervalRef.current = setInterval(() => { onRefresh(); }, 5000);

    while (!stopRef.current) {
      try {
        const result = await triggerPersonalizeBatch(campaignId, 25);
        if (!result.success || result.personalized === 0) break;
        onRefresh();
      } catch (err) {
        console.warn('Personalization batch error:', err);
        break;
      }
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    onRefresh();
  };

  const stopPersonalization = () => {
    stopRef.current = true;
  };

  const handleSaveEdit = async () => {
    if (!previewLead) return;
    const updated = {
      ...previewLead,
      personalizedSubject: editSubject,
      personalizedBody: editBody,
      personalizationStatus: 'done' as const,
    };
    await upsertCampaignLead(updated);
    setEditing(false);
    setPreviewLead(updated);
    onRefresh();
  };

  const openPreview = (lead: CampaignLead) => {
    setPreviewLead(lead);
    setEditSubject(lead.personalizedSubject || '');
    setEditBody(lead.personalizedBody || '');
    setEditing(false);
  };

  // Eligible = researched leads
  const eligible = leads.filter(l => l.websiteStatus !== 'pending');
  const progress = eligible.length > 0 ? (stats.done / eligible.length) * 100 : 0;

  // Filter for the list view
  const filteredLeads = leads.filter(l => {
    if (l.personalizationStatus !== 'done') return false;
    if (filterScore === 'all') return true;
    const [min, max] = filterScore.split('-').map(Number);
    return l.websiteScore >= min && l.websiteScore <= max;
  });

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="luminous-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0B3060] flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF9F1C]" /> AI Personalization
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Personalized {stats.done.toLocaleString()} / {eligible.length.toLocaleString()} researched leads
            </p>
          </div>
          {!running ? (
            <button
              onClick={startPersonalization}
              disabled={stats.pending === 0 || eligible.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF9F1C] text-white rounded-xl text-xs font-bold hover:bg-[#e8900a] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FF9F1C]/20"
            >
              <Sparkles size={14} /> Start AI Personalization
            </button>
          ) : (
            <button
              onClick={stopPersonalization}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all"
            >
              <Pause size={14} /> Pause
            </button>
          )}
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#FF9F1C] to-[#DAA520] h-full rounded-full transition-all duration-500 relative"
            style={{ width: `${Math.max(progress, 1)}%` }}
          >
            {running && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-[#94A3B8]">
          <span>{progress.toFixed(0)}% complete</span>
          {stats.errors > 0 && <span className="text-red-500">{stats.errors} errors</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{stats.done}</p>
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Personalized</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#0B3060]">{stats.pending}</p>
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Pending</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-red-600">{stats.errors}</p>
          <p className="text-[10px] font-bold text-red-500 uppercase">Errors</p>
        </div>
      </div>

      {/* Preview modal */}
      {previewLead && (
        <div className="luminous-card rounded-xl p-5 border-2 border-[#FF9F1C]/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-[#0B3060]">{previewLead.companyName || previewLead.email}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <LeadScoreBar score={previewLead.websiteScore} showLabel />
                <span className="text-[10px] text-[#94A3B8]">{previewLead.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
                  <Edit3 size={14} className="text-[#64748B]" />
                </button>
              ) : (
                <>
                  <button onClick={handleSaveEdit} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Save">
                    <Check size={14} className="text-emerald-600" />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Cancel">
                    <X size={14} className="text-red-500" />
                  </button>
                </>
              )}
              <button onClick={() => setPreviewLead(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={14} />
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Subject</label>
                <input
                  type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#FF9F1C]/20 mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Body</label>
                <textarea
                  value={editBody} onChange={e => setEditBody(e.target.value)} rows={8}
                  className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-[#FF9F1C]/20 resize-y mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <p className="text-[10px] text-[#94A3B8] mb-1">Subject:</p>
              <p className="text-sm font-semibold text-[#0B3060] mb-3">{previewLead.personalizedSubject || '(no subject)'}</p>
              <p className="text-[10px] text-[#94A3B8] mb-1">Body:</p>
              <div
                className="prose prose-sm max-w-none text-[#475569] text-sm"
                dangerouslySetInnerHTML={{ __html: previewLead.personalizedBody || '(no body)' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Personalized leads list */}
      {stats.done > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Personalized Emails</h4>
            <div className="flex gap-1">
              {['all', '9-10', '7-8', '5-6', '1-4'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterScore(f)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    filterScore === f ? 'bg-[#0B3060] text-white' : 'bg-gray-50 text-[#64748B] hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? 'All' : `Score ${f}`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {filteredLeads.slice(0, 50).map(lead => (
              <div
                key={lead.id}
                onClick={() => openPreview(lead)}
                className="flex items-center justify-between py-2 px-3 bg-white border border-[#E2E8F0]/50 rounded-xl hover:border-[#FF9F1C]/20 cursor-pointer transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#0B3060] truncate">{lead.companyName || lead.email}</p>
                  <p className="text-[10px] text-[#94A3B8] truncate">{lead.personalizedSubject}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <LeadScoreBar score={lead.websiteScore} />
                  <Eye size={12} className="text-[#94A3B8]" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PersonalizationPanel;
