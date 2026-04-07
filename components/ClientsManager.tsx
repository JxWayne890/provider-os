import React, { useState } from 'react';
import { Users, Search, Filter, Plus, Mail, Phone, MoreVertical, ExternalLink, ShieldCheck, AlertCircle, X, Calendar, DollarSign, Briefcase, FileText, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';
import { Client, ClientStatus, Payment, Project, Session } from '../types';
import { createStripeInvoice, createStripeCustomer, upsertClient } from '../services/dataService';

interface ClientsManagerProps {
    clients: Client[];
    payments: Payment[];
    projects: Project[];
    sessions: Session[];
    onUpdateClient?: (client: Client) => void;
    onRefresh?: () => Promise<void>;
}

const ClientsManager: React.FC<ClientsManagerProps> = ({ clients, payments, projects, sessions, onUpdateClient, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Invoice Terminal state
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
    const [invAmount, setInvAmount] = useState('');
    const [invDesc, setInvDesc] = useState('');
    const [invMarkPaid, setInvMarkPaid] = useState(true);

    // Customer Genesis state
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

    // New Client Engine state
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

    const getPaymentSortTime = (payment: Payment) => {
        const timestamp = new Date(payment.paidDate || payment.dueDate || '').getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    // Compute real financials from payment data
    const getClientFinancials = (client: Client) => {
        const cp = payments.filter(p =>
            (p.stripeCustomerId && client.stripeCustomerId && p.stripeCustomerId === client.stripeCustomerId) ||
            (p.clientId && p.clientId === client.id)
        );
        const totalPaid = cp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
        const outstanding = cp.filter(p => p.status === 'Open' || p.status === 'Past Due').reduce((s, p) => s + p.amount, 0);
        const subs = cp.filter(p => p.type === 'Subscription' && p.status === 'Paid');
        const mrr = subs.reduce((s, p) => s + p.amount, 0);
        const lastPayment = cp.filter(p => p.status === 'Paid' && p.paidDate).sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())[0];
        const daysSincePayment = lastPayment?.paidDate ? Math.floor((Date.now() - new Date(lastPayment.paidDate).getTime()) / 86400000) : 999;
        const isHealthy = daysSincePayment < 60 || subs.length > 0;
        return { totalPaid, outstanding, mrr, txnCount: cp.length, daysSincePayment, isHealthy };
    };
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newClient, setNewClient] = useState({
        companyName: '',
        primaryContact: '',
        email: '',
        phone: '',
        servicePackage: 'Executive Retainer',
        billingType: 'Subscription' as const,
        monthlyValue: 2500,
        totalContractValue: 30000,
        startDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus(null);

        try {
            const newId = `CL-${Date.now().toString(36).toUpperCase()}`;
            const clientData: Client = {
                id: newId,
                leadId: '',
                companyName: newClient.companyName,
                primaryContact: newClient.primaryContact,
                email: newClient.email,
                phone: newClient.phone,
                status: ClientStatus.ONBOARDING,
                servicePackage: newClient.servicePackage,
                billingType: newClient.billingType as any,
                monthlyValue: newClient.monthlyValue,
                totalContractValue: newClient.totalContractValue,
                startDate: newClient.startDate,
                stripeCustomerId: '',
                notes: newClient.notes,
                healthScore: 85,
            };
            await upsertClient(clientData);




















            setStatus({ type: 'success', message: 'High-value partnership successfully initialized.' });
            setIsNewClientModalOpen(false);

            // Reset form
            setNewClient({
                companyName: '',
                primaryContact: '',
                email: '',
                phone: '',
                servicePackage: 'Executive Retainer',
                billingType: 'Subscription',
                monthlyValue: 2500,
                totalContractValue: 30000,
                startDate: new Date().toISOString().split('T')[0],
                notes: ''
            });

            // Trigger data refresh if handler exists
            if (onUpdateClient) {
                // We create a mock client object to satisfy the callback and trigger RE-FETCH in parent
                onUpdateClient({ id: newId } as any);
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || 'Creation failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primaryContact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyle = (status: ClientStatus) => {
        switch (status) {
            case ClientStatus.ACTIVE: return 'bg-[#1D9D60]/10 text-[#1D9D60] border-[#1D9D60]/20';
            case ClientStatus.PAUSED: return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case ClientStatus.INACTIVE: return 'bg-[#E8E8E8] text-[#64748B] border-black/5';
            case ClientStatus.AT_RISK: return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-[#E8E8E8] text-[#64748B] border-black/5';
        }
    };

    const clientPayments = selectedClient
        ? payments.filter(p => p.stripeCustomerId === selectedClient.stripeCustomerId || p.clientId === selectedClient.id)
        : [];

    const clientProjects = selectedClient
        ? projects.filter(p => p.clientId === selectedClient.id)
        : [];

    const clientSessions = selectedClient
        ? sessions.filter(s => s.leadClientId === selectedClient.id)
        : [];

    const timelineItems = [
        ...clientPayments.map(p => ({ date: p.paidDate || p.dueDate, type: 'payment', data: p, icon: DollarSign })),
        ...clientProjects.map(p => ({ date: p.dueDate, type: 'project', data: p, icon: Briefcase })),
        ...clientSessions.map(s => ({ date: s.scheduledAt, type: 'session', data: s, icon: Calendar }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient || !selectedClient.stripeCustomerId) return;

        setIsCreatingInvoice(true);
        setStatus(null);
        try {
            const result = await createStripeInvoice(selectedClient.stripeCustomerId, parseFloat(invAmount), invDesc, invMarkPaid);
            if (result.success) {
                setStatus({
                    type: 'success',
                    message: `Invoice ${result.status === 'paid' ? 'Paid' : 'Created'}! ID: ${result.invoiceId}`
                });
                setInvAmount('');
                setInvDesc('');
                if (onRefresh) await onRefresh();
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || "Invoice creation failed." });
        } finally {
            setIsCreatingInvoice(false);
        }
    };

    const handleCreateCustomer = async (client: Client) => {
        setIsCreatingCustomer(true);
        setStatus(null);
        try {
            const stripeResult = await createStripeCustomer(client.companyName, client.email, { clientId: client.id });
            if (stripeResult.success) {
                const updatedClient = { ...client, stripeCustomerId: stripeResult.customerId };
                const saveResult = await upsertClient(updatedClient);

                if (saveResult) {
                    setStatus({ type: 'success', message: `Identity initialized! ID: ${stripeResult.customerId}` });
                    if (onUpdateClient) onUpdateClient(updatedClient);
                    setSelectedClient(updatedClient);
                } else {
                    throw new Error("Stripe account created, but database sync failed.");
                }
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || "Customer genesis failed." });
        } finally {
            setIsCreatingCustomer(false);
        }
    };

    return (
        <div className="space-y-10 animate-reveal pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="hidden md:block text-3xl font-serif font-bold text-[#1A1A2E] tracking-tight">Portfolio</h2>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-4 py-3 md:py-2 bg-white border border-black/5 rounded-2xl text-[#64748B] shadow-sm flex-1">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-medium w-full md:w-64 text-[#1A1A2E]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-3 md:p-2.5 bg-white border border-black/5 rounded-2xl text-[#64748B] hover:text-[#1A1A2E] transition-all shadow-sm">
                            <Filter size={20} />
                        </button>
                        <button
                            onClick={() => setIsNewClientModalOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#FF9F1C]/20 whitespace-nowrap"
                        >
                            <Plus size={18} /> New Client
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: 'Total Reach', value: clients.length, color: 'text-[#1A1A2E]' },
                    { label: 'Total Paid', value: `$${clients.reduce((sum, c) => sum + getClientFinancials(c).totalPaid, 0).toLocaleString()}`, color: 'text-[#1D9D60]' },
                    { label: 'Outstanding', value: `$${clients.reduce((sum, c) => sum + getClientFinancials(c).outstanding, 0).toLocaleString()}`, color: 'text-amber-600' },
                    { label: 'Active MRR', value: `$${clients.reduce((sum, c) => sum + getClientFinancials(c).mrr, 0).toLocaleString()}`, color: 'text-[#0066CC]' }
                ].map((stat, i) => (
                    <div key={i} className="luminous-card p-4 md:p-6 bg-white/70">
                        <p className="text-[9px] md:text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mb-2 md:mb-3">{stat.label}</p>
                        <h3 className={`text-xl md:text-3xl font-serif font-bold ${stat.color}`}>{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Client List (Desktop) */}
            <div className="hidden md:block luminous-card bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#F7F8FA] bg-[#F7F8FA]/30">
                                <th className="px-8 py-5 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Partner / Company</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Contact Metadata</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Lifecycle</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Financials</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] text-right">Engagement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F7F8FA]">
                            {filteredClients.map((client) => (
                                <tr
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-[#1A1A2E] font-bold flex items-center gap-2">
                                                {client.companyName}
                                                {client.stripeCustomerId && <ShieldCheck size={14} className="text-[#0066CC]" />}
                                            </span>
                                            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-tight">{client.servicePackage}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2">
                                                <Mail size={12} className="text-[#64748B]" /> {client.email || 'N/A'}
                                            </span>
                                            {client.phone && (
                                                <span className="text-[10px] text-[#64748B] font-medium flex items-center gap-2 mt-1">
                                                    <Phone size={10} className="text-[#64748B]" /> {client.phone}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyle(client.status)}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            {(() => { const f = getClientFinancials(client); return (<>
                                            <span className="text-[#1A1A2E] font-bold font-mono">${f.totalPaid.toLocaleString()}</span>
                                            <div className="flex items-center gap-2">
                                                {f.outstanding > 0 && <span className="text-[10px] text-amber-600 font-bold">Due: ${f.outstanding.toLocaleString()}</span>}
                                                {f.outstanding === 0 && f.totalPaid > 0 && <span className="text-[10px] text-[#1D9D60] font-bold">Paid up</span>}
                                                {f.totalPaid === 0 && f.outstanding === 0 && <span className="text-[10px] text-[#64748B] font-bold">No payments</span>}
                                                {f.mrr > 0 && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">${f.mrr}/mo</span>}
                                                {!f.isHealthy && f.totalPaid > 0 && (
                                                    <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">At Risk</span>
                                                )}
                                            </div>
                                            </>); })()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button className="p-2 text-[#64748B] hover:text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-xl transition-all">
                                                <Mail size={18} />
                                            </button>
                                            <button className="p-2 text-[#64748B] hover:text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-xl transition-all">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredClients.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
                        <AlertCircle size={48} className="mb-4 opacity-20" />
                        <p className="font-serif italic text-lg">Your partnership roster is currently empty.</p>
                    </div>
                )}
            </div>

            {/* Client Cards (Mobile) */}
            <div className="md:hidden space-y-4">
                {filteredClients.map((client) => (
                    <div
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="bg-white p-5 rounded-[24px] border border-black/5 shadow-sm active:scale-[0.98] transition-transform"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#1A1A2E] flex items-center gap-2">
                                    {client.companyName}
                                    {client.stripeCustomerId && <ShieldCheck size={16} className="text-[#0066CC]" />}
                                </h3>
                                <p className="text-[10px] text-[#FF9F1C] font-bold uppercase tracking-wider mt-1">{client.servicePackage}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide border ${getStatusStyle(client.status)}`}>
                                {client.status}
                            </span>
                        </div>

                        <div className="bg-[#F7F8FA]/80 p-3 rounded-2xl border border-black/5 mb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-black/5 text-[#1A1A2E] font-bold text-xs">
                                    {client.primaryContact[0]}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-[#1A1A2E] truncate">{client.primaryContact}</p>
                                    <p className="text-[10px] text-[#64748B] truncate">{client.email}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-black/5 pt-2 mt-1">
                                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Recurring</span>
                                <span className="text-sm font-mono font-bold text-[#1D9D60]">${getClientFinancials(client).totalPaid.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button className="flex items-center gap-1 text-[10px] font-bold text-[#1A1A2E] px-4 py-2 bg-[#F7F8FA] rounded-xl hover:bg-[#E8E8E8] transition-all">
                                Manage <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredClients.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-[#64748B]">
                        <AlertCircle size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-serif italic">No clients found.</p>
                    </div>
                )}
            </div>

            {/* Client Detail Modal */}
            {/* Client Detail Panel */}
            {selectedClient && (() => {
                const cp = [...clientPayments].sort((a, b) => getPaymentSortTime(b) - getPaymentSortTime(a));
                const totalPaid = cp.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
                const totalOpen = cp.filter(p => p.status === 'Open' || p.status === 'Past Due').reduce((s, p) => s + p.amount, 0);
                const invoices = cp.filter(p => p.type === 'Invoice');
                const charges = cp.filter(p => p.type === 'One-time');
                const subs = cp.filter(p => p.type === 'Subscription');

                const getStatusStyle = (status: string) => {
                    switch(status) {
                        case 'Paid': return 'text-green-600 bg-green-50 border-green-200';
                        case 'Open': return 'text-blue-600 bg-blue-50 border-blue-200';
                        case 'Past Due': return 'text-amber-600 bg-amber-50 border-amber-200';
                        case 'Failed': return 'text-red-500 bg-red-50 border-red-200';
                        default: return 'text-gray-500 bg-gray-50 border-gray-200';
                    }
                };

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-md" onClick={() => setSelectedClient(null)}>
                        <div onClick={e => e.stopPropagation()}
                            className="w-full max-w-2xl h-full bg-white md:rounded-l-[32px] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">

                            {/* Header */}
                            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#0B3060] flex items-center justify-center text-white font-serif font-bold text-xl">
                                        {(selectedClient.companyName || '?')[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-serif font-bold">{selectedClient.companyName}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-[#64748B]">{selectedClient.email}</span>
                                            {selectedClient.stripeCustomerId && (
                                                <span className="text-[9px] font-mono text-[#64748B] bg-gray-100 px-2 py-0.5 rounded">{selectedClient.stripeCustomerId}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?mode=portal&client=${selectedClient.id}`); setStatus({ type: "success", message: "Portal link copied!" }); setTimeout(() => setStatus(null), 2000); }}
                                    className="px-3 py-1.5 text-xs font-bold text-[#FF9F1C] border border-[#FF9F1C]/20 rounded-xl hover:bg-[#FF9F1C]/10 transition-all">Copy Portal Link</button>
                                <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto">
                                {/* Financial Summary */}
                                <div className="grid grid-cols-3 gap-px bg-gray-100">
                                    <div className="bg-white p-5 text-center">
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Total Paid</p>
                                        <p className="text-2xl font-serif font-bold text-[#1D9D60]">${totalPaid.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white p-5 text-center">
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Outstanding</p>
                                        <p className="text-2xl font-serif font-bold text-amber-600">${totalOpen.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white p-5 text-center">
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Transactions</p>
                                        <p className="text-2xl font-serif font-bold">{cp.length}</p>
                                    </div>
                                </div>

                                {/* Client Info */}
                                <div className="p-6 border-b border-[#E2E8F0]">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Contact</p>
                                            <p className="font-bold">{selectedClient.primaryContact || selectedClient.companyName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Phone</p>
                                            <p className="font-bold">{selectedClient.phone || '\u2014'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Status</p>
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-green-50 text-green-600 border border-green-200">{selectedClient.status}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Client Since</p>
                                            <p className="font-bold">{selectedClient.startDate ? new Date(selectedClient.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '\u2014'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Send Invoice */}
                                {selectedClient.stripeCustomerId && (
                                    <div className="p-6 border-b border-[#E2E8F0]">
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">Quick Invoice</p>
                                        <form onSubmit={handleCreateInvoice} className="flex gap-2">
                                            <input type="text" required value={invDesc} onChange={e => setInvDesc(e.target.value)}
                                                placeholder="Description" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs" />
                                            <input type="number" required value={invAmount} onChange={e => setInvAmount(e.target.value)}
                                                placeholder="$" className="w-24 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs" />
                                            <button type="submit" disabled={isCreatingInvoice}
                                                className="bg-[#0B3060] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                                {isCreatingInvoice ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                                                Send
                                            </button>
                                        </form>
                                        {status && (
                                            <p className={`text-xs mt-2 font-bold ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{status.message}</p>
                                        )}
                                    </div>
                                )}

                                {!selectedClient.stripeCustomerId && (
                                    <div className="p-6 border-b border-[#E2E8F0]">
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold">No Stripe account linked</p>
                                                <p className="text-xs text-[#64748B]">Create a Stripe customer to send invoices</p>
                                            </div>
                                            <button onClick={() => handleCreateCustomer(selectedClient)} disabled={isCreatingCustomer}
                                                className="bg-[#0B3060] text-white px-4 py-2 rounded-xl text-xs font-bold">
                                                {isCreatingCustomer ? 'Creating...' : 'Link Stripe'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Transaction History */}
                                <div className="p-6">
                                    <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-4">Transaction History</p>

                                    {cp.length === 0 ? (
                                        <p className="text-sm text-[#64748B] italic py-8 text-center">No transactions yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {cp.map(p => (
                                                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all group">
                                                    {/* Icon */}
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                        p.type === 'Invoice' ? 'bg-blue-50' : p.type === 'Subscription' ? 'bg-purple-50' : 'bg-green-50'
                                                    }`}>
                                                        {p.type === 'Invoice' ? <FileText size={16} className="text-blue-500" /> :
                                                         p.type === 'Subscription' ? <RefreshCw size={16} className="text-purple-500" /> :
                                                         <DollarSign size={16} className="text-green-500" />}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-[#1A1A2E] truncate">
                                                                {p.notes?.split('\n')[0] || p.type}
                                                            </p>
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${getStatusStyle(p.status)}`}>
                                                                {p.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-[#64748B] mt-0.5">
                                                            {p.paidDate || p.dueDate}
                                                            {p.stripeId && <span className="ml-2 font-mono">{p.stripeId.slice(0, 18)}</span>}
                                                        </p>
                                                    </div>

                                                    {/* Amount */}
                                                    <div className="text-right shrink-0">
                                                        <p className={`text-sm font-bold ${p.status === 'Paid' ? 'text-[#1D9D60]' : 'text-[#1A1A2E]'}`}>
                                                            {p.status === 'Paid' ? '+' : ''}${p.amount.toLocaleString()}
                                                        </p>
                                                    </div>

                                                    {/* Link */}
                                                    {p.stripeLink && (
                                                        <a href={p.stripeLink} target="_blank" rel="noopener noreferrer"
                                                            onClick={e => e.stopPropagation()}
                                                            className="p-2 text-[#64748B] hover:text-[#1A1A2E] opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Projects & Sessions */}
                                {clientProjects.length > 0 && (
                                    <div className="p-6 border-t border-[#E2E8F0]">
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">Projects</p>
                                        {clientProjects.map(proj => (
                                            <div key={proj.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
                                                <div>
                                                    <p className="text-sm font-bold">{proj.name}</p>
                                                    <p className="text-[10px] text-[#64748B]">{proj.currentMilestone}</p>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                                    proj.status === 'Finished' ? 'bg-green-50 text-green-600' :
                                                    proj.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-gray-50 text-gray-500'
                                                }`}>{proj.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {clientSessions.length > 0 && (
                                    <div className="p-6 border-t border-[#E2E8F0]">
                                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">Sessions</p>
                                        {clientSessions.map(sess => (
                                            <div key={sess.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50">
                                                <div>
                                                    <p className="text-sm font-bold">{sess.sessionType}</p>
                                                    <p className="text-[10px] text-[#64748B]">{sess.scheduledAt}</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-[#64748B]">{sess.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* New Client Initialization Modal */}
            {isNewClientModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-reveal">
                    <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl border border-black/5 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-[#F7F8FA] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                                    <Plus size={24} className="text-[#FF9F1C]" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-serif font-bold text-[#1A1A2E]">Initialize Partnership</h3>
                                    <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest">Deploying core infrastructure for new client</p>
                                </div>
                            </div>
                            <button onClick={() => setIsNewClientModalOpen(false)} className="p-2 hover:bg-[#F7F8FA] rounded-xl transition-all"><X size={24} className="text-[#64748B]" /></button>
                        </div>

                        <form onSubmit={handleCreateClient} className="flex-1 overflow-y-auto p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Company Name</label>
                                        <input
                                            required
                                            className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/10"
                                            placeholder="e.g. Acme Corp"
                                            value={newClient.companyName}
                                            onChange={e => setNewClient({ ...newClient, companyName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Primary Contact</label>
                                        <input
                                            required
                                            className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                            placeholder="John Doe"
                                            value={newClient.primaryContact}
                                            onChange={e => setNewClient({ ...newClient, primaryContact: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Email</label>
                                            <input
                                                required type="email"
                                                className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                placeholder="john@example.com"
                                                value={newClient.email}
                                                onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Phone</label>
                                            <input
                                                className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                placeholder="+1 (555) 000-0000"
                                                value={newClient.phone}
                                                onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Service Package</label>
                                        <select
                                            className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm appearance-none"
                                            value={newClient.servicePackage}
                                            onChange={e => setNewClient({ ...newClient, servicePackage: e.target.value })}
                                        >
                                            <option>Executive Retainer</option>
                                            <option>Strategic Growth Bundle</option>
                                            <option>Operational Audit</option>
                                            <option>Full Scale Care</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Monthly MRR ($)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                value={newClient.monthlyValue}
                                                onChange={e => setNewClient({ ...newClient, monthlyValue: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Contract Value ($)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                value={newClient.totalContractValue}
                                                onChange={e => setNewClient({ ...newClient, totalContractValue: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                            value={newClient.startDate}
                                            onChange={e => setNewClient({ ...newClient, startDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-2">
                                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest ml-1">Strategic Notes</label>
                                <textarea
                                    className="w-full bg-[#F7F8FA] border border-black/5 rounded-2xl py-4 px-6 text-sm h-32 resize-none"
                                    placeholder="Initial discovery notes, pain points, core objectives..."
                                    value={newClient.notes}
                                    onChange={e => setNewClient({ ...newClient, notes: e.target.value })}
                                />
                            </div>

                            <div className="mt-10 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsNewClientModalOpen(false)}
                                    className="flex-1 py-4 bg-white border border-black/5 text-[#64748B] rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:text-[#1A1A2E] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-3 py-4 bg-black text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#1A1A2E] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                                    Deploy Partnership Infrastructure
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsManager;
