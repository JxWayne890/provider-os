import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Mail, MousePointer, MessageSquare, AlertTriangle, Star, Eye } from 'lucide-react';
import { Campaign, CampaignLead, CampaignStats, TrackingEvent, SendStatus } from '../types';
import { fetchCampaigns, fetchCampaignLeads, fetchRecentTrackingEvents, calculateCampaignStats } from '../services/dataService';

const OutreachAnalytics: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allLeads, setAllLeads] = useState<CampaignLead[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const camps = await fetchCampaigns();
      setCampaigns(camps);

      // Load leads for all campaigns
      const leadPromises = camps.map(c => fetchCampaignLeads(c.id));
      const leadArrays = await Promise.all(leadPromises);
      const flat = leadArrays.flat();
      setAllLeads(flat);

      const recentEvents = await fetchRecentTrackingEvents(50);
      setEvents(recentEvents);
    } catch (err) {
      console.warn('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-[#FF9F1C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const globalStats = calculateCampaignStats(allLeads);
  const hotLeads = allLeads.filter(l => l.engagementScore > 10).sort((a, b) => b.engagementScore - a.engagementScore);

  // Build daily send chart data
  const dailySends: Record<string, { date: string; sent: number; opened: number; clicked: number }> = {};
  for (const lead of allLeads) {
    if (lead.sentAt) {
      const day = lead.sentAt.split('T')[0];
      if (!dailySends[day]) dailySends[day] = { date: day, sent: 0, opened: 0, clicked: 0 };
      dailySends[day].sent++;
      if (lead.openedAt) dailySends[day].opened++;
      if (lead.clickedAt) dailySends[day].clicked++;
    }
  }
  const chartData = Object.values(dailySends).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  return (
    <div className="space-y-6 animate-reveal">
      {/* Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Sent', value: globalStats.sent, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Open Rate', value: `${globalStats.openRate.toFixed(1)}%`, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Click Rate', value: `${globalStats.clickRate.toFixed(1)}%`, icon: MousePointer, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Reply Rate', value: `${globalStats.replyRate.toFixed(1)}%`, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Bounce Rate', value: `${globalStats.bounceRate.toFixed(1)}%`, icon: AlertTriangle, color: globalStats.bounceRate > 3 ? 'text-red-600' : 'text-gray-600', bg: globalStats.bounceRate > 3 ? 'bg-red-50' : 'bg-gray-50' },
          { label: 'Hot Leads', value: hotLeads.length, icon: Star, color: 'text-[#FF9F1C]', bg: 'bg-[#FF9F1C]/10' },
        ].map(card => (
          <div key={card.label} className="luminous-card p-4 rounded-xl">
            <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center mb-2`}>
              <card.icon size={16} className={card.color} />
            </div>
            <p className="text-xl font-bold text-[#0B3060]">{card.value}</p>
            <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Send Chart */}
      {chartData.length > 0 && (
        <div className="luminous-card p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-[#0B3060] mb-4">Daily Sends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B3060" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#0B3060" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="openedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF9F1C" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#FF9F1C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="sent" stroke="#0B3060" fill="url(#sentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="opened" stroke="#FF9F1C" fill="url(#openedGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Engagement Funnel */}
      <div className="luminous-card p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-[#0B3060] mb-4">Engagement Funnel</h3>
        <div className="space-y-2">
          {[
            { label: 'Sent', value: globalStats.sent, color: 'bg-[#0B3060]' },
            { label: 'Opened', value: globalStats.opened, color: 'bg-blue-500' },
            { label: 'Clicked', value: globalStats.clicked, color: 'bg-[#FF9F1C]' },
            { label: 'Replied', value: globalStats.replied, color: 'bg-emerald-500' },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#64748B] w-16">{step.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  className={`${step.color} h-full rounded-full flex items-center justify-end pr-2 transition-all`}
                  style={{ width: `${globalStats.sent > 0 ? Math.max((step.value / globalStats.sent) * 100, 2) : 0}%` }}
                >
                  <span className="text-[10px] font-bold text-white">{step.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Leads */}
        <div className="luminous-card p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-[#0B3060] mb-4 flex items-center gap-2">
            <Star size={14} className="text-[#FF9F1C]" /> Hot Leads
          </h3>
          {hotLeads.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-4 text-center">No hot leads yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {hotLeads.slice(0, 20).map(lead => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#0B3060]">{lead.companyName || lead.email}</p>
                    <p className="text-[10px] text-[#94A3B8]">{lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#FF9F1C]">Score: {lead.engagementScore}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      lead.sendStatus === SendStatus.CLICKED ? 'bg-purple-50 text-purple-600' :
                      lead.sendStatus === SendStatus.REPLIED ? 'bg-emerald-50 text-emerald-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>{lead.sendStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="luminous-card p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-[#0B3060] mb-4">Recent Activity</h3>
          {events.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map(event => (
                <div key={event.id} className="flex items-center gap-3 py-2 border-b border-[#E2E8F0]/50 last:border-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    event.eventType === 'open' ? 'bg-blue-50' :
                    event.eventType === 'click' ? 'bg-purple-50' :
                    'bg-red-50'
                  }`}>
                    {event.eventType === 'open' ? <Eye size={12} className="text-blue-600" /> :
                     event.eventType === 'click' ? <MousePointer size={12} className="text-purple-600" /> :
                     <AlertTriangle size={12} className="text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#0B3060] capitalize">{event.eventType}</p>
                    {event.linkUrl && <p className="text-[10px] text-[#94A3B8] truncate">{event.linkUrl}</p>}
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">
                    {new Date(event.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutreachAnalytics;
