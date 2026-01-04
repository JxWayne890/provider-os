
import React, { useState } from 'react';
import { Payment, Client } from '../types';
import { CreditCard, ArrowUpRight, ArrowDownLeft, Search, Filter, ExternalLink, Clock, CheckCircle2, AlertCircle, X, DollarSign, Receipt, FileText, Send } from 'lucide-react';

interface PaymentsManagerProps {
    payments: Payment[];
    clients: Client[];
}

const PaymentsManager: React.FC<PaymentsManagerProps> = ({ payments, clients }) => {
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
            case 'Past Due': return <Clock size={14} className="text-amber-400" />;
            default: return <Clock size={14} className="text-zinc-500" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Paid': return 'text-[#1D9D60] bg-[#1D9D60]/10 border-[#1D9D60]/20';
            case 'Failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'Past Due': return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
            default: return 'text-[#6E6E73] bg-[#E8E8E8] border-black/5';
        }
    };

    const totalAmount = payments.reduce((sum, p) => p.status === 'Paid' ? sum + p.amount : sum, 0);
    const pendingAmount = payments.reduce((sum, p) => p.status !== 'Paid' ? sum + p.amount : sum, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-10 animate-reveal">
                <div>
                    <h2 className="text-4xl font-serif font-bold text-[#1D1D1F] tracking-tight">Revenue Operations</h2>
                    <p className="text-[#86868B] text-sm mt-1">Financial tracking and Stripe synchronization</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-2xl text-[#86868B] shadow-sm">
                        <Search size={14} />
                        <input type="text" placeholder="Search transactions..." className="bg-transparent border-none outline-none text-xs w-48 font-medium text-[#1D1D1F]" />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-2xl text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all shadow-sm">
                        <Filter size={14} /> Filter
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-reveal" style={{ animationDelay: '0.1s' }}>
                <div className="luminous-card p-6 bg-white/80">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-[#1D9D60]/10 rounded-2xl flex items-center justify-center border border-[#1D9D60]/20">
                            <ArrowUpRight size={24} className="text-[#1D9D60]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Received</span>
                    </div>
                    <p className="text-3xl font-serif font-bold text-[#1D1D1F]">${totalAmount.toLocaleString()}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#1D9D60]">
                        <span className="px-1.5 py-0.5 bg-[#1D9D60]/10 rounded">+12%</span>
                        <span className="text-[#86868B]">from last month</span>
                    </div>
                </div>

                <div className="luminous-card p-6 bg-white/80">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                            <Clock size={24} className="text-amber-600" />
                        </div>
                        <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Pending</span>
                    </div>
                    <p className="text-3xl font-serif font-bold text-[#1D1D1F]">${pendingAmount.toLocaleString()}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-600">
                        <span className="px-1.5 py-0.5 bg-amber-500/10 rounded">3 Invoices</span>
                        <span className="text-[#86868B]">overdue</span>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="luminous-card bg-white overflow-hidden animate-reveal" style={{ animationDelay: '0.2s' }}>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#F5F5F7] bg-[#F5F5F7]/30">
                            <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Transaction / Client</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Type</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Amount</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Due Date</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F5F7]">
                        {payments.map((p) => (
                            <tr
                                key={p.id}
                                onClick={() => setSelectedPayment(p)}
                                className="hover:bg-[#F5F5F7]/50 transition-colors cursor-pointer group"
                            >
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center border border-black/5 group-hover:border-[#B8860B]/20 transition-all">
                                            <CreditCard size={16} className="text-[#86868B]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#1D1D1F]">
                                                {resolveClientName(p.stripeCustomerId, p.clientId)}
                                            </p>
                                            <p className="text-[10px] text-[#86868B] font-mono tracking-tighter">{p.stripeId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-xs font-semibold text-[#86868B] uppercase tracking-wider">{p.type}</td>
                                <td className="px-8 py-5">
                                    <span className="text-sm font-bold text-[#1D1D1F]">${p.amount.toLocaleString()}</span>
                                    <span className="text-[10px] text-[#86868B] ml-1 font-bold">{p.currency}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border ${getStatusStyle(p.status)}`}>
                                        {getStatusIcon(p.status)}
                                        {p.status}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-xs font-bold text-[#6E6E73]">{p.dueDate}</td>
                                <td className="px-8 py-5 text-right">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedPayment(p); }}
                                        className="p-2.5 text-[#86868B] hover:text-[#B8860B] hover:bg-[#F5F5F7] rounded-xl transition-all"
                                    >
                                        <ArrowUpRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Payment Detail Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden border border-black/5 animate-in zoom-in-95 duration-300"
                    >
                        {/* Modal Header */}
                        <div className="p-8 border-b border-[#F5F5F7] flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-[#1D9D60]/10 flex items-center justify-center border border-[#1D9D60]/20">
                                    <DollarSign size={28} className="text-[#1D9D60]" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-[#1D1D1F]">Transaction Data</h2>
                                    <p className="text-[10px] text-[#86868B] uppercase tracking-[0.2em] font-bold">{selectedPayment.stripeId}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="p-3 hover:bg-[#F5F5F7] rounded-2xl transition-all text-[#86868B] hover:text-[#1D1D1F]"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-10 space-y-8">
                            <div className="text-center pb-8 border-b border-[#F5F5F7]">
                                <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.3em] mb-4">Amount Dispatched</p>
                                <h3 className="text-6xl font-serif font-bold text-[#1D1D1F] tracking-tighter">
                                    ${selectedPayment.amount.toLocaleString()} <span className="text-2xl text-[#86868B] font-sans font-medium">{selectedPayment.currency}</span>
                                </h3>
                                <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mt-6 border ${getStatusStyle(selectedPayment.status)}`}>
                                    {getStatusIcon(selectedPayment.status)}
                                    {selectedPayment.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest flex items-center gap-2">
                                        <Receipt size={12} className="text-[#B8860B]" /> Relationship
                                    </p>
                                    <p className="text-base text-[#1D1D1F] font-bold break-all">
                                        {resolveClientName(selectedPayment.stripeCustomerId, selectedPayment.clientId)}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} className="text-[#0066CC]" /> Logged At
                                    </p>
                                    <p className="text-base text-[#1D1D1F] font-bold">{selectedPayment.paidDate || selectedPayment.dueDate}</p>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-[#F5F5F7] border border-black/5 space-y-3">
                                <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={12} /> Transaction Metadata
                                </p>
                                <p className="text-sm text-[#6E6E73] leading-relaxed italic font-serif">
                                    {selectedPayment.notes || "No supplemental records found for this ledger entry."}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-[#F5F5F7]/30 border-t border-[#F5F5F7] flex gap-4">
                            <button className="flex-1 py-4 bg-white hover:bg-white text-[#1D1D1F] border border-black/5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95">
                                <Send size={18} /> Resend Audit Trail
                            </button>
                            <a
                                href={selectedPayment.stripeLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-4 luminous-button-indigo rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <ExternalLink size={18} /> View in Stripe
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {payments.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-[#86868B] animate-reveal">
                    <Search size={48} className="mb-6 opacity-20" />
                    <p className="font-serif italic text-lg text-center">No transactions have been logged in the current audit period.</p>
                </div>
            )}
        </div>
    );
};

export default PaymentsManager;
