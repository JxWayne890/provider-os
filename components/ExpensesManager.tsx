import React, { useState, useMemo } from 'react';
import { Plus, X, Filter, Trash2, DollarSign, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { Expense, Payment, Client } from '../types';
import { upsertExpense, deleteExpense } from '../services/dataService';

interface ExpensesManagerProps {
  expenses: Expense[];
  payments: Payment[];
  clients: Client[];
  onUpdate: () => void;
}

const CATEGORIES: Expense['category'][] = ['Software', 'Hosting', 'Domains', 'Tools', 'Marketing', 'Other'];

const ExpensesManager: React.FC<ExpensesManagerProps> = ({ expenses, payments, clients, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('All');
  const [form, setForm] = useState<Partial<Expense>>({ category: 'Software', recurring: false, date: new Date().toISOString().split('T')[0] });

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalRevenue = useMemo(() => payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0), [payments]);
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0;

  // Monthly expenses
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  // Per-client profitability
  const clientProfit = useMemo(() => {
    const map: Record<string, { revenue: number; expenses: number; name: string }> = {};
    clients.forEach(c => { map[c.id] = { revenue: 0, expenses: 0, name: c.companyName }; });
    payments.filter(p => p.status === 'Paid').forEach(p => { if (map[p.clientId]) map[p.clientId].revenue += p.amount; });
    expenses.forEach(e => { if (e.clientId && map[e.clientId]) map[e.clientId].expenses += e.amount; });
    return Object.entries(map).filter(([_, v]) => v.revenue > 0 || v.expenses > 0).map(([id, v]) => ({ id, ...v, profit: v.revenue - v.expenses })).sort((a, b) => b.profit - a.profit);
  }, [clients, payments, expenses]);

  const filtered = filterCat === 'All' ? expenses : expenses.filter(e => e.category === filterCat);

  const handleSave = async () => {
    setSaving(true);
    try {
      const expense: Expense = {
        id: `exp-${Date.now()}`, description: form.description || '', amount: Number(form.amount) || 0,
        category: (form.category as Expense['category']) || 'Other', vendor: form.vendor || '',
        date: form.date || new Date().toISOString().split('T')[0], recurring: form.recurring || false,
        clientId: form.clientId, projectId: form.projectId, receiptUrl: form.receiptUrl,
        createdAt: new Date().toISOString(),
      };
      await upsertExpense(expense);
      onUpdate(); setShowForm(false); setForm({ category: 'Software', recurring: false, date: new Date().toISOString().split('T')[0] });
    } catch (err) { console.error('Save expense error:', err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    onUpdate();
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/30 focus:border-[#FF9F1C] transition-all";

  const getCatColor = (cat: string) => {
    switch (cat) {
      case 'Software': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Hosting': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Domains': return 'bg-green-50 text-green-700 border-green-200';
      case 'Tools': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Marketing': return 'bg-pink-50 text-pink-700 border-pink-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-8 animate-reveal">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="luminous-card bg-white/80 p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={16} className="text-red-500" /><span className="text-[10px] font-bold text-[#64748B] uppercase">Total Expenses</span></div>
          <p className="text-2xl font-serif font-bold text-[#1A1A2E]">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="luminous-card bg-white/80 p-5">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={16} className="text-amber-600" /><span className="text-[10px] font-bold text-[#64748B] uppercase">This Month</span></div>
          <p className="text-2xl font-serif font-bold text-[#1A1A2E]">${thisMonthExpenses.toLocaleString()}</p>
        </div>
        <div className="luminous-card bg-white/80 p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-600" /><span className="text-[10px] font-bold text-[#64748B] uppercase">Net Profit</span></div>
          <p className="text-2xl font-serif font-bold text-[#1A1A2E]">${(totalRevenue - totalExpenses).toLocaleString()}</p>
        </div>
        <div className="luminous-card bg-white/80 p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className={profitMargin >= 50 ? 'text-emerald-600' : 'text-amber-600'} /><span className="text-[10px] font-bold text-[#64748B] uppercase">Profit Margin</span></div>
          <p className="text-2xl font-serif font-bold text-[#1A1A2E]">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterCat === cat ? 'bg-[#1A1A2E] text-white' : 'bg-white border border-gray-200 text-[#64748B] hover:text-[#1A1A2E]'}`}>
              {cat}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#FF9F1C]/20">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
          <div key={e.id} className="luminous-card bg-white/80 p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getCatColor(e.category)}`}>{e.category}</span>
              <div>
                <p className="text-sm font-bold text-[#1A1A2E]">{e.description}</p>
                <p className="text-xs text-[#64748B]">{e.vendor}{e.recurring ? ' • Recurring' : ''} • {new Date(e.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-serif font-bold text-red-500">-${e.amount.toLocaleString()}</span>
              <button onClick={() => handleDelete(e.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-[#64748B] font-serif italic py-12">No expenses recorded</p>}
      </div>

      {/* Per-Client Profitability */}
      {clientProfit.length > 0 && (
        <div className="luminous-card bg-white/80 p-6">
          <h3 className="text-lg font-serif font-bold text-[#1A1A2E] mb-4">Client Profitability</h3>
          <div className="space-y-3">
            {clientProfit.slice(0, 8).map(cp => (
              <div key={cp.id} className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/50 last:border-0">
                <span className="text-sm font-medium text-[#1A1A2E]">{cp.name}</span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-emerald-600 font-bold">${cp.revenue.toLocaleString()}</span>
                  <span className="text-red-500 font-bold">-${cp.expenses.toLocaleString()}</span>
                  <span className={`font-bold ${cp.profit >= 0 ? 'text-[#1A1A2E]' : 'text-red-500'}`}>${cp.profit.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-xl font-serif font-bold">New Expense</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Description</label>
                <input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Vercel Pro subscription" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Amount ($)</label>
                  <input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} placeholder="20" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })} className={inputClass}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Vendor</label>
                  <input value={form.vendor || ''} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Vercel" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Date</label>
                  <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Client (optional)</label>
                <select value={form.clientId || ''} onChange={e => setForm({ ...form, clientId: e.target.value })} className={inputClass}>
                  <option value="">No client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.recurring || false} onChange={e => setForm({ ...form, recurring: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-gray-300 text-[#FF9F1C] focus:ring-[#FF9F1C]" />
                <span className="text-sm font-medium text-[#1A1A2E]">Recurring expense</span>
              </label>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end">
              <button onClick={handleSave} disabled={saving || !form.description || !form.amount}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A2E] text-white text-sm font-bold rounded-xl hover:bg-[#0a2850] transition-all disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null} Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesManager;
