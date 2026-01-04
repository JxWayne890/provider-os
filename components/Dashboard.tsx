
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Users, Target, ArrowUpRight, Sparkles,
  ChevronRight, CreditCard, CheckCircle, Shield, Zap
} from 'lucide-react';
import { Lead, Client, Payment, Metric, ClientStatus } from '../types';

interface DashboardProps {
  leads: Lead[];
  clients: Client[];
  payments: Payment[];
  metrics: Metric[];
  configs: any[];
  onConnectStripe: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ leads, clients, payments, metrics, configs, onConnectStripe }) => {
  const businessName = configs.find(c => c.settingKey === 'business_name')?.value || 'The Provider';
  const stripeKey = configs.find(c => c.settingKey === 'stripe_api_key')?.value;

  const totalRevenue = payments.reduce((sum, p) => p.status === 'Paid' ? sum + p.amount : sum, 0);
  const activeClients = clients.filter(c => c.status === ClientStatus.ACTIVE).length;
  const leadCount = leads.length;

  // Feature 2: Intelligence Matrix Calculations
  const mrr = payments
    .filter(p => p.type === 'Subscription' && p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0); // Simplified: assumes all are monthly for now

  const avgLtv = clients.length > 0
    ? clients.reduce((sum, c) => sum + (c.totalContractValue || 0), 0) / clients.length
    : 0;

  // Feature 3: Tax Forecaster
  const taxReserveRate = 0.25;
  const bufferRate = 0.05;
  const taxReserve = totalRevenue * taxReserveRate;
  const buffer = totalRevenue * bufferRate;
  const safeToSpend = totalRevenue - taxReserve - buffer;

  // Chart data mapping
  const chartData = metrics.map(m => {
    // Format date for better readability (e.g., Jun 01)
    let formattedDate = m.date;
    try {
      const date = new Date(m.date);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (e) {
      console.warn("Date formatting error:", e);
    }

    return {
      name: formattedDate,
      revenue: m.revenue || m.totalRevenue || 0,
      leads: m.leads || m.leadCount || 0
    };
  });

  if (!stripeKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-reveal">
        <div className="w-24 h-24 luminous-card flex items-center justify-center mb-8 border-[#B8860B]/20 bg-white">
          <CreditCard size={40} className="text-[#B8860B]" />
        </div>
        <h2 className="text-4xl font-serif font-bold text-[#1D1D1F] mb-4 text-center">Your Financial Hub Awaits</h2>
        <p className="text-lg text-[#6E6E73] max-w-md text-center mb-10 leading-relaxed font-sans">
          Connect your Stripe account to unlock deep historical insights, revenue velocity charts, and AI-powered fiscal auditing.
        </p>
        <button
          onClick={onConnectStripe}
          className="px-10 py-4 luminous-button-gold rounded-2xl text-lg font-bold transition-all active:scale-95"
        >
          Connect Stripe System
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-reveal pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#121212] tracking-tight">{businessName}</h1>
          <p className="text-[#666] mt-1 font-medium text-sm">Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Fiscal Safety: High</span>
          </div>
        </div>
      </header>

      {/* Primary KPI Grid - Mobile Optimized (2x2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-[#121212]', bg: 'bg-white' },
          { label: 'Recurring', value: `$${mrr.toLocaleString()}`, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50/50' },
          { label: 'Avg LTV', value: `$${Math.round(avgLtv).toLocaleString()}`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50/50' },
          { label: 'Pipeline', value: leadCount, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50/50' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-[120px] md:h-auto animate-reveal">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon size={16} className={`${kpi.color} opacity-80`} />
            </div>
            <h3 className={`text-xl md:text-2xl font-serif font-bold text-[#121212]`}>{kpi.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 luminous-card p-10 h-[500px] bg-white">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-serif font-bold text-[#1D1D1F]">Revenue Velocity</h3>
              <p className="text-sm text-[#86868B]">Net performance performance vs projection</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#F5F5F7] text-[#1D1D1F] text-xs font-bold rounded-lg border border-black/5">Yearly</button>
              <button className="px-4 py-2 bg-white text-[#B8860B] text-xs font-bold rounded-lg border border-[#B8860B]/20 shadow-sm">Monthly</button>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B8860B" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#B8860B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#86868B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#86868B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #B8860B20', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#1D1D1F', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#B8860B" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Consultant & Fiscal Health */}
        <div className="space-y-8">
          {/* Tax Forecaster Card */}
          <div className="luminous-card p-8 bg-gradient-to-br from-[#1D1D1F] to-[#2C2C2E] text-white border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#B8860B]/10 blur-3xl rounded-full"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif font-bold flex items-center gap-3">
                  <Shield size={20} className="text-[#B8860B]" /> Net-Net Forecast
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#B8860B]">Q1 Estimate</span>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-2">Safe-to-Spend Balance</p>
                  <h4 className="text-4xl font-serif font-bold text-white">${Math.round(safeToSpend).toLocaleString()}</h4>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  {[
                    { label: 'Tax Reserve (25%)', value: `-$${Math.round(taxReserve).toLocaleString()}`, color: 'text-red-400' },
                    { label: 'Operational Buffer (5%)', value: `-$${Math.round(buffer).toLocaleString()}`, color: 'text-amber-400' }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#86868B]">{item.label}</span>
                      <span className={item.color}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Consultant */}
          <div className="luminous-card p-8 border-[#B8860B]/10 relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B8860B]/5 blur-3xl rounded-full"></div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#B8860B]/10 flex items-center justify-center border border-[#B8860B]/20">
                <Sparkles className="text-[#B8860B]" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-[#1D1D1F]">AI Consultant</h3>
                <p className="text-[10px] text-[#B8860B] font-bold uppercase tracking-widest">Active Intelligence</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#F5F5F7] border border-black/5 relative shadow-sm">
                <p className="text-sm text-[#1D1D1F] leading-relaxed italic font-serif">
                  "{configs.find(c => c.settingKey === 'latest_ai_insight')?.value || "Initializing intelligence protocols. Please run the business audit script to generate your first audit."}"
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Growth Levers identified</p>
                {[
                  "LTV Optimization: Bryan Bailey",
                  "Churn Risk: Arki Design Studio",
                  "Project Velocity: NextGen AI"
                ].map((lever, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F5F7] cursor-pointer transition-all border border-transparent hover:border-black/5">
                    <span className="text-sm font-semibold text-[#1D1D1F]">{lever}</span>
                    <ChevronRight size={16} className="text-[#86868B]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
