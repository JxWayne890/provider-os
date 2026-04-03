import React, { useState, useEffect } from 'react';
import { Mail, BarChart3 } from 'lucide-react';
import CampaignList from './CampaignList';
import OutreachAnalytics from './OutreachAnalytics';

type OutreachTab = 'campaigns' | 'analytics';

const OutreachManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OutreachTab>('campaigns');

  // Read campaign ID from hash for auto-navigation from floating pill
  const [autoCampaignId, setAutoCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/campaign=([^&]+)/);
    if (match) {
      setAutoCampaignId(match[1]);
      // Clean the hash to just #outreach
      window.location.hash = 'outreach';
    }
  }, []);

  return (
    <div className="space-y-6 animate-reveal">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#0B3060] tracking-tight">Outreach</h1>
          <p className="text-[#64748B] mt-1 font-medium text-sm">Cold email campaigns & analytics</p>
        </div>
      </header>

      <div className="flex gap-1 bg-[#F7F8FA] rounded-xl p-1 w-fit border border-[#E2E8F0]">
        {[
          { id: 'campaigns' as OutreachTab, label: 'Campaigns', icon: Mail },
          { id: 'analytics' as OutreachTab, label: 'Analytics', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#0B3060] shadow-sm'
                : 'text-[#64748B] hover:text-[#0B3060]'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'campaigns' && <CampaignList autoOpenCampaignId={autoCampaignId} />}
      {activeTab === 'analytics' && <OutreachAnalytics />}
    </div>
  );
};

export default OutreachManager;
