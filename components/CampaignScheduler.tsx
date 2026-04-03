import React from 'react';
import { Shield, AlertTriangle, Play, Pause, RotateCcw } from 'lucide-react';
import { Campaign, CampaignStatus, CampaignStats } from '../types';

interface CampaignSchedulerProps {
  campaign: Campaign;
  stats: CampaignStats;
  onUpdate: (updates: Partial<Campaign>) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}

function getWarmupDayLabel(day: number): string {
  if (day <= 3) return `Day ${day} — 20/day`;
  if (day <= 7) return `Day ${day} — 50/day`;
  if (day <= 14) return `Day ${day} — 100/day`;
  if (day <= 21) return `Day ${day} — 200/day`;
  return `Day ${day} — 500/day`;
}

function getWarmupLimit(day: number): number {
  if (day <= 3) return 20;
  if (day <= 7) return 50;
  if (day <= 14) return 100;
  if (day <= 21) return 200;
  return 500;
}

function getNextIncrease(day: number): string {
  if (day <= 3) return `${4 - day} days`;
  if (day <= 7) return `${8 - day} days`;
  if (day <= 14) return `${15 - day} days`;
  if (day <= 21) return `${22 - day} days`;
  return 'At max capacity';
}

const CampaignScheduler: React.FC<CampaignSchedulerProps> = ({
  campaign, stats, onUpdate, onStart, onPause, onResume,
}) => {
  const warmupLimit = campaign.warmupEnabled ? getWarmupLimit(campaign.warmupDay) : campaign.dailyLimit;
  const effectiveLimit = Math.min(campaign.dailyLimit, warmupLimit);
  const bounceRateHigh = stats.bounceRate > 3;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">Daily Send Limit</label>
          <input
            type="number" min={1} max={500}
            value={campaign.dailyLimit}
            onChange={e => onUpdate({ dailyLimit: parseInt(e.target.value) || 50 })}
            className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5"
          />
          {campaign.warmupEnabled && (
            <p className="text-[10px] text-[#94A3B8] mt-1">Effective: {effectiveLimit}/day (warmup)</p>
          )}
        </div>
        <div>
          <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">Send Time</label>
          <input
            type="time"
            value={campaign.sendTime}
            onChange={e => onUpdate({ sendTime: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-[#E2E8F0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox" checked={campaign.weekdaysOnly}
            onChange={e => onUpdate({ weekdaysOnly: e.target.checked })}
            className="w-4 h-4 rounded accent-[#0B3060]"
          />
          <span className="text-xs font-medium text-[#475569]">Weekdays Only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox" checked={campaign.warmupEnabled}
            onChange={e => onUpdate({ warmupEnabled: e.target.checked })}
            className="w-4 h-4 rounded accent-[#0B3060]"
          />
          <span className="text-xs font-medium text-[#475569]">Warmup Mode</span>
        </label>
      </div>

      {/* Warmup Progress */}
      {campaign.warmupEnabled && (
        <div className="bg-[#FF9F1C]/5 border border-[#FF9F1C]/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#FF9F1C]">Warmup Progress</span>
            <span className="text-xs text-[#64748B]">{getWarmupDayLabel(campaign.warmupDay)}</span>
          </div>
          <div className="w-full bg-[#FF9F1C]/10 rounded-full h-2 mb-2">
            <div
              className="bg-[#FF9F1C] rounded-full h-2 transition-all"
              style={{ width: `${Math.min((campaign.warmupDay / 28) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-[#64748B]">
            Next increase in {getNextIncrease(campaign.warmupDay)} · Sending {effectiveLimit}/day
          </p>
        </div>
      )}

      {/* Safety Indicators */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`rounded-xl p-3 text-center ${bounceRateHigh ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Bounce Rate</p>
          <p className={`text-lg font-bold ${bounceRateHigh ? 'text-red-600' : 'text-[#0B3060]'}`}>
            {stats.bounceRate.toFixed(1)}%
          </p>
          {bounceRateHigh && <AlertTriangle size={12} className="text-red-500 mx-auto mt-1" />}
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Sent</p>
          <p className="text-lg font-bold text-[#0B3060]">{stats.sent}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Suppressed</p>
          <p className="text-lg font-bold text-[#0B3060]">{stats.suppressed}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {campaign.status === CampaignStatus.DRAFT && (
          <button
            onClick={onStart}
            disabled={stats.totalLeads === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} /> Start Campaign
          </button>
        )}
        {campaign.status === CampaignStatus.ACTIVE && (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-all"
          >
            <Pause size={16} /> Pause
          </button>
        )}
        {campaign.status === CampaignStatus.PAUSED && (
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0B3060] text-white rounded-xl font-semibold text-sm hover:bg-[#0a2850] transition-all"
          >
            <RotateCcw size={16} /> Resume
          </button>
        )}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
          <Shield size={14} className="text-emerald-600" />
          <span className="text-xs font-medium text-[#475569]">
            {campaign.status === CampaignStatus.ACTIVE ? 'Active' :
             campaign.status === CampaignStatus.PAUSED ? 'Paused' :
             campaign.status === CampaignStatus.COMPLETED ? 'Completed' : 'Draft'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CampaignScheduler;
