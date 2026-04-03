import React, { useState } from 'react';
import { Payment, Client } from '../types';
import { CreditCard, ArrowUpRight, Search, Filter, ExternalLink, Clock, CheckCircle2, AlertCircle, X, DollarSign, Receipt, FileText, Send, RefreshCw, Zap, ChevronRight } from 'lucide-react';

interface PaymentsManagerProps {
    payments: Payment[];
    clients: Client[];
}

type TypeFilter = 'all' | 'Invoice' | 'One-time' | 'Subscription';

const PaymentsManager: React.FC<PaymentsManagerProps> = ({ payments, clients }) => {
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const resolveClientName = (stripeCustomerId: string, paymentClientId: string) => {
        const client = clients.find(c =>
            (stripeCustomerId && c.stripeCustomerId === stripeCustomerId) ||
            (paymentClientId && c.id === paymentClientId)
        );
        return client ? client.companyName : (paymentClientId || stripeCustomerId || 'Guest Payment');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Paid': return <CheckCircle2 size={14} className="text-green-400" />;
            case 'Failed': return <AlertCircle size={14} className="text-red-400" />;
            case 'Past Due': return <Clock size={14} className="text-amber-400" />;            case 'Open': return <Send size={14} className="text-blue-400" />;            case 'Voided': return <X size={14} className="text-gray-400" />;
            default: return <Clock size={14} className="text-zinc-500" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Paid': return 'text-[#1D9D60] bg-[#1D9D60]/10 border-[#1D9D60]/20';
            case 'Failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'Past Due': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';            case 'Open': return 'text-blue-600 bg-blue-50 border-blue-200';            case 'Voided': return 'text-gray-400 bg-gray-100 border-gray-200';            case 'Draft': return 'text-gray-400 bg-gray-50 border-gray-200';
            default: return 'text-[#64748B] bg-[#E8E8E8] border-black/5';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Invoice': return <FileText size={16} className="text-blue-500" />;
            case 'Subscription': return <RefreshCw size={16} className="text-purple-500" />;
            default: return <Zap size={16} className="text-green-500" />;
        }
    };

    // Filter payments
    const filtered = payments.filter(p => {
        if (typeFilter !== 'all' && p.type !== typeFilter) return false;
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (searchTerm) {
            const name = resolveClientName(p.stripeCustomerId, p.clientId).toLowerCase();
            const term = searchTerm.toLowerCase();
            return name.includes(term) || p.notes?.toLowerCase().includes(term) || p.stripeId?.toLowerCase().includes(term);
        }
        return true;
    }).sort((a, b) => new Date(b.dueDate || '').getTime() - new Date(a.dueDate || '').getTime());

    const totalReceived = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const totalPending = payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0);
    const invoiceCount = payments.filter(p => p.type === 'Invoice').length;
    const paidInvoices = payments.filter(p => p.type === 'Invoice' && p.status === 'Paid').length;
    const overdueInvoices = payments.filter(p => p.status === 'Past Due').length;    const openInvoices = payments.filter(p => p.status === 'Open').length;
    const subCount = payments.filter(p => p.type === 'Subscription').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-4 animate-reveal">
                <div>
                    <h2 className="text-4xl font-serif font-bold text-[#1A1A2E] tracking-tight">Revenue Operations</h2>
                    <p className="text-[#64748B] text-sm mt-1">Live Stripe sync &middot; auto-updates every 30s</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-reveal">
                <div className="luminous-card p-5 bg-white/80">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-[#1D9D60]/10 rounded-xl flex items-center justify-center border border-[#1D9D60]/20">
                            <ArrowUpRight size={20} className="text-[#1D9D60]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Received</span>
                    </div>
                    <p className="text-2xl font-serif font-bold">${totalReceived.toLocaleString()}</p>
                </div>
                <div className="luminous-card p-5 bg-white/80">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                            <Clock size={20} className="text-amber-600" />
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Pending</span>
                    </div>
                    <p className="text-2xl font-serif font-bold">${totalPending.toLocaleString()}</p>
                    {overdueInvoices > 0 && <p className="text-xs text-amber-600 font-bold mt-1">{overdueInvoices} overdue</p>}
                </div>
                <div className="luminous-card p-5 bg-white/80">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                            <FileText size={20} className="text-blue-500" />
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Invoices</span>
                    </div>
                    <p className="text-2xl font-serif font-bold">{invoiceCount}</p>
                    <p className="text-xs text-[#64748B] mt-1">{paidInvoices} paid</p>
                </div>
                <div className="luminous-card p-5 bg-white/80">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                            <RefreshCw size={20} className="text-purple-500" />
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Subscriptions</span>
                    </div>
                    <p className="text-2xl font-serif font-bold">{subCount}</p>
                    <p className="text-xs text-[#64748B] mt-1">active recurring</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-3 animate-reveal">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/5 rounded-2xl shadow-sm flex-1 max-w-md">
                    <Search size={14} className="text-[#64748B]" />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by client, note, or Stripe ID..."
                        className="bg-transparent border-none outline-none text-xs w-full font-medium text-[#1A1A2E]" />
                    {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} className="text-[#64748B]" /></button>}
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {(['all', 'Invoice', 'One-time', 'Subscription'] as TypeFilter[]).map(t => (
                        <button key={t} onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === t ? 'bg-[#0B3060] text-white shadow-md' : 'text-[#64748B] hover:text-[#1A1A2E]'}`}>
                            {t === 'all' ? 'All' : t}s
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {['all', 'Paid', 'Open', 'Past Due', 'Failed'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-[#0B3060] text-white shadow-md' : 'text-[#64748B] hover:text-[#1A1A2E]'}`}>
                            {s === 'all' ? 'All' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Payments Table */}
            <div className="luminous-card bg-white overflow-hidden animate-reveal">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#F7F8FA] bg-[#F7F8FA]/30">
                            <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Client</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Type</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Date</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Notes</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] text-right">Link</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F7F8FA]">
                        {filtered.map(p => (
                            <tr key={p.id} onClick={() => setSelectedPayment(p)}
                                className="hover:bg-[#F7F8FA]/50 transition-colors cursor-pointer group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] flex items-center justify-center border border-black/5">
                                            {getTypeIcon(p.type)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#1A1A2E] truncate max-w-[180px]">{resolveClientName(p.stripeCustomerId, p.clientId)}</p>
                                            <p className="text-[9px] text-[#64748B] font-mono">{p.stripeId?.slice(0, 20)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                        p.type === 'Invoice' ? 'bg-blue-50 text-blue-600' :
                                        p.type === 'Subscription' ? 'bg-purple-50 text-purple-600' :
                                        'bg-green-50 text-green-600'
                                    }`}>{p.type}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-[#1A1A2E]">${p.amount.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(p.status)}`}>
                                        {getStatusIcon(p.status)} {p.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-[#64748B]">
                                    <div>{p.paidDate || p.dueDate}</div>
                                    {p.paidDate && p.dueDate && p.paidDate !== p.dueDate && (
                                        <div className="text-[9px] text-[#64748B]">due: {p.dueDate}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-[#64748B] max-w-[150px] truncate">{p.notes || '—'}</td>
                                <td className="px-6 py-4 text-right">
                                    {p.stripeLink && (
                                        <a href={p.stripeLink} target="_blank" rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="p-2 text-[#64748B] hover:text-[#FF9F1C] hover:bg-[#F7F8FA] rounded-xl transition-all inline-flex">
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="py-16 flex flex-col items-center text-[#64748B]">
                        <Search size={36} className="mb-4 opacity-20" />
                        <p className="font-serif italic">No transactions match your filters.</p>
                    </div>
                )}
                <div className="px-6 py-3 bg-[#F7F8FA]/30 border-t border-[#F7F8FA] text-xs text-[#64748B] flex justify-between">
                    <span>Showing {filtered.length} of {payments.length} transactions</span>
                    <span className="font-bold">Total shown: ${filtered.reduce((s,p) => s + p.amount, 0).toLocaleString()}</span>
                </div>
            </div>

            {/* Invoice-Style Detail Modal */}
            {selectedPayment && (() => {
                const sp = selectedPayment;
                const clientName = resolveClientName(sp.stripeCustomerId, sp.clientId);
                const noteLines = (sp.notes || '').split('\n').filter((l: string) => l.trim());
                const bulletLines = noteLines.filter((l: string) => /^[\u2022\-•]/.test(l.trim()));
                const textLines = noteLines.filter((l: string) => !/^[\u2022\-•]/.test(l.trim()) && !l.trim().startsWith('Includes'));
                const hasIncludes = noteLines.some((l: string) => l.trim().startsWith('Includes'));
                const fmtDate = (d: string | undefined) => {
                    if (!d) return '\u2014';
                    try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
                    catch { return d; }
                };

                return (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedPayment(null)}>
                        <div onClick={e => e.stopPropagation()}
                            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-200">

                            {/* Dark header like Stripe */}
                            <div className="bg-[#0A2540] text-white p-8 rounded-t-3xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                            <span className="text-[#FF9F1C] font-serif text-xl font-bold">P</span>
                                        </div>
                                        <span className="font-serif font-bold text-lg">John Johnson</span>
                                    </div>
                                    <button onClick={() => setSelectedPayment(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                        <X size={18} />
                                    </button>
                                </div>
                                <p className="text-4xl font-serif font-bold tracking-tight">
                                    ${sp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-white/50 text-sm mt-2">
                                    {sp.status === 'Paid' ? `Paid ${fmtDate(sp.paidDate)}` : `Due ${fmtDate(sp.dueDate)}`}
                                </p>
                            </div>

                            {/* Invoice body */}
                            <div className="bg-white rounded-b-3xl">
                                <div className="p-8 space-y-6">
                                    {/* Structured fields grid */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                                            <span className="text-[#64748B]">To</span>
                                            <span className="text-[#1A1A2E] font-bold">{clientName}</span>

                                            <span className="text-[#64748B]">From</span>
                                            <span className="text-[#1A1A2E] font-bold">John Johnson</span>

                                            <span className="text-[#64748B]">Invoice</span>
                                            <span className="text-[#1A1A2E] font-mono text-xs font-bold">{sp.stripeId?.startsWith('in_') ? '#' + sp.stripeId.slice(3, 20) : sp.stripeId?.slice(0, 20)}</span>

                                            <span className="text-[#64748B]">Type</span>
                                            <span className={`font-bold text-xs inline-block w-fit px-2.5 py-0.5 rounded-lg ${
                                                sp.type === 'Invoice' ? 'bg-blue-50 text-blue-600' :
                                                sp.type === 'Subscription' ? 'bg-purple-50 text-purple-600' :
                                                'bg-green-50 text-green-600'
                                            }`}>{sp.type}</span>

                                            <span className="text-[#64748B]">Status</span>
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold w-fit px-2.5 py-0.5 rounded-lg border ${getStatusStyle(sp.status)}`}>
                                                {getStatusIcon(sp.status)} {sp.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Memo section */}
                                    {textLines.length > 0 && (
                                        <div className="border-t border-[#E2E8F0] pt-5">
                                            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mb-3">Memo</p>
                                            <div className="space-y-2">
                                                {textLines.map((line: string, i: number) => (
                                                    <p key={i} className="text-sm text-[#1A1A2E] leading-relaxed">{line}</p>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Includes / Line items */}
                                    {bulletLines.length > 0 && (
                                        <div className="border-t border-[#E2E8F0] pt-5">
                                            {hasIncludes && <p className="text-sm font-bold text-[#1A1A2E] mb-3">Includes:</p>}
                                            <div className="space-y-2.5 pl-1">
                                                {bulletLines.map((line: string, i: number) => (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <span className="text-[#FF9F1C] font-bold mt-0.5">&bull;</span>
                                                        <span className="text-sm text-[#4A4A4A]">{line.replace(/^[\u2022\-•]\s*/, '')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Total line */}
                                    <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center">
                                        <span className="text-sm font-bold text-[#1A1A2E] uppercase tracking-wider">Total</span>
                                        <span className="text-2xl font-serif font-bold text-[#1A1A2E]">${sp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Footer with link */}
                                {sp.stripeLink && (
                                    <div className="px-8 pb-8 pt-2">
                                        <div className="border-t border-[#E2E8F0] pt-5">
                                            <a href={sp.stripeLink} target="_blank" rel="noopener noreferrer"
                                                className="text-sm text-[#64748B] hover:text-[#1A1A2E] flex items-center gap-2 transition-all">
                                                View invoice and payment details <ChevronRight size={16} />
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default PaymentsManager;
