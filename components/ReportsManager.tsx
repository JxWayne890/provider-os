import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, DollarSign, Users, Percent } from 'lucide-react';
import { Payment, Client } from '../types';

interface ReportsManagerProps {
  payments: Payment[];
  clients: Client[];
}

const COLORS = ['#FF9F1C', '#1A1A2E', '#64748B', '#D4A843', '#4A4A4A', '#C0C0C0'];

const ReportsManager: React.FC<ReportsManagerProps> = ({ payments, clients }) => {
  const paidPayments = useMemo(() => payments.filter(p => p.status === 'Paid'), [payments]);
  const totalRevenue = useMemo(() => paidPayments.reduce((s, p) => s + p.amount, 0), [paidPayments]);
  const totalOutstanding = useMemo(() => payments.filter(p => p.status === 'Past Due').reduce((s, p) => s + p.amount, 0), [payments]);

  // Revenue by month (last 12 months)
  const revenueByMonth = useMemo(() => {
    const months: Record<string, { paid: number; outstanding: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = { paid: 0, outstanding: 0 };
    }
    payments.forEach(p => {
      const date = new Date(p.paidDate || p.dueDate);
      if (isNaN(date.getTime())) return;
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (months[key]) {
        if (p.status === 'Paid') months[key].paid += p.amount;
        else if (p.status === 'Past Due') months[key].outstanding += p.amount;
      }
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  }, [payments]);

  // Revenue by client (top 10)
  const revenueByClient = useMemo(() => {
    const byClient: Record<string, number> = {};
    paidPayments.forEach(p => {
      const client = clients.find(c => c.id === p.clientId || c.stripeCustomerId === p.stripeCustomerId);
      const name = client?.companyName || p.clientId || 'Unknown';
      byClient[name] = (byClient[name] || 0) + p.amount;
    });
    return Object.entries(byClient)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, revenue]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, revenue }));
  }, [paidPayments, clients]);

  // Payment type breakdown
  const typeBreakdown = useMemo(() => {
    const types: Record<string, number> = {};
    paidPayments.forEach(p => { types[p.type] = (types[p.type] || 0) + p.amount; });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [paidPayments]);

  // This month revenue
  const thisMonthRevenue = useMemo(() => {
    const now = new Date();
    return paidPayments
      .filter(p => { const d = new Date(p.paidDate || p.dueDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, p) => s + p.amount, 0);
  }, [paidPayments]);

  const avgDealSize = paidPayments.length > 0 ? totalRevenue / paidPayments.length : 0;
  const collectionRate = payments.length > 0 ? (paidPayments.length / payments.length) * 100 : 0;

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div className="space-y-8 animate-reveal">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
          { label: 'This Month', value: `$${thisMonthRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-[#FF9F1C]' },
          { label: 'Avg Deal Size', value: `$${avgDealSize.toFixed(0)}`, icon: Users, color: 'text-blue-600' },
          { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, icon: Percent, color: 'text-[#1A1A2E]' },
        ].map((card, i) => (
          <div key={i} className="luminous-card bg-white/80 p-5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={16} className={card.color} />
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="text-2xl font-serif font-bold text-[#1A1A2E]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <div className="luminous-card bg-white/80 p-6">
          <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-4">Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
              <Bar dataKey="paid" fill="#FF9F1C" radius={[6, 6, 0, 0]} name="Paid" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Paid vs Outstanding */}
        <div className="luminous-card bg-white/80 p-6">
          <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-4">Paid vs Outstanding</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
              <Area type="monotone" dataKey="paid" fill="#FF9F1C" fillOpacity={0.2} stroke="#FF9F1C" name="Paid" />
              <Area type="monotone" dataKey="outstanding" fill="#EF4444" fillOpacity={0.15} stroke="#EF4444" name="Outstanding" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Client */}
        <div className="luminous-card bg-white/80 p-6">
          <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-4">Top Clients by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByClient} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={fmt} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} width={120} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#1A1A2E" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Type Breakdown */}
        <div className="luminous-card bg-white/80 p-6">
          <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-4">Payment Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {typeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsManager;
