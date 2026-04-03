import React, { useState, useEffect } from 'react';
import { Plus, Mail, Users, TrendingUp, MoreHorizontal, Trash2 } from 'lucide-react';
import { Campaign, CampaignLead, CampaignStats, CampaignStatus } from '../types';
import {
  fetchCampaigns, fetchCampaignStatsLight, upsertCampaign, deleteCampaign,
  calculateCampaignStats,
} from '../services/dataService';
import CampaignDetail from './CampaignDetail';

const CampaignList: React.FC<{ autoOpenCampaignId?: string | null }> = ({ autoOpenCampaignId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignStats, setCampaignStats] = useState<Record<string, CampaignStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Auto-open campaign from URL parameter (e.g. floating pill navigation)
  useEffect(() => {
    if (autoOpenCampaignId && campaigns.length > 0) {
      const target = campaigns.find(c => c.id === autoOpenCampaignId);
      if (target) setSelectedCampaign(target);
    }
  }, [autoOpenCampaignId, campaigns]);

  const loadCampaigns = async () => {
    setLoading(true);
    const camps = await fetchCampaigns();
    setCampaigns(camps);

    // Load stats via lightweight count queries (no full lead download)
    const statsMap: Record<string, CampaignStats> = {};
    await Promise.all(
      camps.map(async c => {
        statsMap[c.id] = await fetchCampaignStatsLight(c.id);
      })
    );
    setCampaignStats(statsMap);
    setLoading(false);
  };

  const handleCreateCampaign = async () => {
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      name: 'New Campaign',
      subjectTemplate: '',
      bodyTemplate: '',
      fromName: 'John W Johnson',
      fromEmail: 'john@go.theprovidersystem.com',
      status: CampaignStatus.DRAFT,
      dailyLimit: 50,
      sendTime: '09:00',
      weekdaysOnly: true,
      warmupEnabled: true,
      warmupDay: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertCampaign(newCampaign);
    setCampaigns(prev => [newCampaign, ...prev]);
    setSelectedCampaign(newCampaign);
  };

  const handleDeleteCampaign = async (id: string) => {
    await deleteCampaign(id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setMenuOpen(null);
  };

  const handleUpdateCampaign = (updated: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedCampaign(updated);
  };

  if (selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => { setSelectedCampaign(null); loadCampaigns(); }}
        onUpdate={handleUpdateCampaign}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-[#FF9F1C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-reveal">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#0B3060]">Campaigns</h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3060] text-white rounded-xl text-xs font-bold hover:bg-[#0a2850] transition-all active:scale-[0.98]"
        >
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20">
          <Mail size={40} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-bold text-[#0B3060] mb-2">No campaigns yet</h3>
          <p className="text-sm text-[#94A3B8] mb-6">Create your first cold email campaign to get started.</p>
          <button
            onClick={handleCreateCampaign}
            className="px-6 py-3 luminous-button-gold rounded-xl text-sm font-bold"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const stats = campaignStats[campaign.id];
            const progress = stats ? (stats.totalLeads > 0 ? (stats.sent / stats.totalLeads) * 100 : 0) : 0;

            return (
              <div
                key={campaign.id}
                className="luminous-card rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      campaign.status === CampaignStatus.ACTIVE ? 'bg-emerald-500 animate-pulse' :
                      campaign.status === CampaignStatus.PAUSED ? 'bg-amber-500' :
                      campaign.status === CampaignStatus.COMPLETED ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`} />
                    <h3 className="text-sm font-bold text-[#0B3060]">{campaign.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      campaign.status === CampaignStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' :
                      campaign.status === CampaignStatus.PAUSED ? 'bg-amber-50 text-amber-600' :
                      campaign.status === CampaignStatus.COMPLETED ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{campaign.status}</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === campaign.id ? null : campaign.id); }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuOpen === campaign.id && (
                      <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-1 z-10 w-36">
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteCampaign(campaign.id); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {stats && stats.totalLeads > 0 && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-[#0B3060] rounded-full h-1.5 transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 text-[10px] text-[#94A3B8]">
                  <span className="flex items-center gap-1"><Users size={10} /> {stats?.totalLeads || 0} leads</span>
                  <span className="flex items-center gap-1"><Mail size={10} /> {stats?.sent || 0} sent</span>
                  {stats && stats.sent > 0 && (
                    <>
                      <span className="flex items-center gap-1"><TrendingUp size={10} /> {stats.openRate.toFixed(0)}% open</span>
                      <span>{stats.clickRate.toFixed(0)}% click</span>
                    </>
                  )}
                  {campaign.warmupEnabled && (
                    <span className="ml-auto text-[#FF9F1C] font-semibold">Day {campaign.warmupDay} warmup</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignList;
