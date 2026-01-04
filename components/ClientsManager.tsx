import React, { useState } from 'react';
import { Users, Search, Filter, Plus, Mail, Phone, MoreVertical, ExternalLink, ShieldCheck, AlertCircle, X, Calendar, DollarSign, Briefcase, FileText, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';
import { Client, ClientStatus, Payment, Project, Session } from '../types';
import { createStripeInvoice, createStripeCustomer, updateSheetRow } from '../services/sheetsService';

interface ClientsManagerProps {
    clients: Client[];
    payments: Payment[];
    projects: Project[];
    sessions: Session[];
    onUpdateClient?: (client: Client) => void;
}

const ClientsManager: React.FC<ClientsManagerProps> = ({ clients, payments, projects, sessions, onUpdateClient }) => {
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
            const rowData = [
                newId,
                '', // leadId
                newClient.companyName,
                newClient.primaryContact,
                newClient.email,
                newClient.phone,
                'Onboarding', // status
                newClient.servicePackage,
                newClient.billingType,
                newClient.monthlyValue,
                newClient.totalContractValue,
                newClient.startDate,
                '', // stripeCustomerId
                newClient.notes,
                85 // initial healthScore
            ];

            await updateSheetRow('CLIENTS', newId, rowData);

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
            case ClientStatus.INACTIVE: return 'bg-[#E8E8E8] text-[#86868B] border-black/5';
            case ClientStatus.AT_RISK: return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-[#E8E8E8] text-[#86868B] border-black/5';
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
                // Note: onRefresh isn't passed here, but App.tsx likely syncs. We can rely on user refreshing OR suggest onRefresh prop.
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
                const sheetResult = await updateSheetRow('CLIENTS', client.id, updatedClient);

                if (sheetResult) {
                    setStatus({ type: 'success', message: `Identity initialized! ID: ${stripeResult.customerId}` });
                    if (onUpdateClient) onUpdateClient(updatedClient);
                    setSelectedClient(updatedClient);
                } else {
                    throw new Error("Stripe account created, but Sheet sync failed.");
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
                <h2 className="hidden md:block text-3xl font-serif font-bold text-[#1D1D1F] tracking-tight">Portfolio</h2>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-4 py-3 md:py-2 bg-white border border-black/5 rounded-2xl text-[#86868B] shadow-sm flex-1">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-medium w-full md:w-64 text-[#1D1D1F]"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-3 md:p-2.5 bg-white border border-black/5 rounded-2xl text-[#86868B] hover:text-[#1D1D1F] transition-all shadow-sm">
                            <Filter size={20} />
                        </button>
                        <button
                            onClick={() => setIsNewClientModalOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#B8860B]/20 whitespace-nowrap"
                        >
                            <Plus size={18} /> New Client
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: 'Total Reach', value: clients.length, color: 'text-[#1D1D1F]' },
                    { label: 'Total Invoiced', value: `$${clients.reduce((sum, c) => sum + (c.totalContractValue || 0), 0).toLocaleString()}`, color: 'text-[#1D1D1F]' },
                    { label: 'Monthly MRR', value: `$${clients.reduce((sum, c) => sum + (c.monthlyValue || 0), 0).toLocaleString()}`, color: 'text-[#1D9D60]' },
                    { label: 'Avg. Health', value: `${clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + (c.healthScore || 0), 0) / clients.length) : 0}%`, color: 'text-[#0066CC]' }
                ].map((stat, i) => (
                    <div key={i} className="luminous-card p-4 md:p-6 bg-white/70">
                        <p className="text-[9px] md:text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-2 md:mb-3">{stat.label}</p>
                        <h3 className={`text-xl md:text-3xl font-serif font-bold ${stat.color}`}>{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Client List (Desktop) */}
            <div className="hidden md:block luminous-card bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#F5F5F7] bg-[#F5F5F7]/30">
                                <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Partner / Company</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Contact Metadata</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Lifecycle</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Financials</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] text-right">Engagement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5F5F7]">
                            {filteredClients.map((client) => (
                                <tr
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-[#1D1D1F] font-bold flex items-center gap-2">
                                                {client.companyName}
                                                {client.stripeCustomerId && <ShieldCheck size={14} className="text-[#0066CC]" />}
                                            </span>
                                            <span className="text-[10px] text-[#86868B] font-bold uppercase tracking-tight">{client.servicePackage}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                                                <Mail size={12} className="text-[#86868B]" /> {client.email || 'N/A'}
                                            </span>
                                            {client.phone && (
                                                <span className="text-[10px] text-[#86868B] font-medium flex items-center gap-2 mt-1">
                                                    <Phone size={10} className="text-[#86868B]" /> {client.phone}
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
                                            <span className="text-[#1D1D1F] font-bold font-mono">${client.monthlyValue?.toLocaleString()}/mo</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-[#86868B] font-bold">LTV: ${client.totalContractValue?.toLocaleString()}</span>
                                                {client.healthScore < 85 && (
                                                    <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Retention Risk</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button className="p-2 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all">
                                                <Mail size={18} />
                                            </button>
                                            <button className="p-2 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all">
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
                    <div className="flex flex-col items-center justify-center py-24 text-[#86868B]">
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
                                <h3 className="text-lg font-bold text-[#1D1D1F] flex items-center gap-2">
                                    {client.companyName}
                                    {client.stripeCustomerId && <ShieldCheck size={16} className="text-[#0066CC]" />}
                                </h3>
                                <p className="text-[10px] text-[#B8860B] font-bold uppercase tracking-wider mt-1">{client.servicePackage}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide border ${getStatusStyle(client.status)}`}>
                                {client.status}
                            </span>
                        </div>

                        <div className="bg-[#F5F5F7]/80 p-3 rounded-2xl border border-black/5 mb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-black/5 text-[#1D1D1F] font-bold text-xs">
                                    {client.primaryContact[0]}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-[#1D1D1F] truncate">{client.primaryContact}</p>
                                    <p className="text-[10px] text-[#86868B] truncate">{client.email}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-black/5 pt-2 mt-1">
                                <span className="text-[9px] font-bold text-[#86868B] uppercase tracking-wider">Recurring</span>
                                <span className="text-sm font-mono font-bold text-[#1D9D60]">${client.monthlyValue?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button className="flex items-center gap-1 text-[10px] font-bold text-[#1D1D1F] px-4 py-2 bg-[#F5F5F7] rounded-xl hover:bg-[#E8E8E8] transition-all">
                                Manage <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredClients.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-[#86868B]">
                        <AlertCircle size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-serif italic">No clients found.</p>
                    </div>
                )}
            </div>

            {/* Client Detail Modal */}
            {selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-end p-0 md:p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl h-full bg-white md:rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-l border-black/5 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="p-8 border-b border-[#F5F5F7] flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[24px] bg-[#E8E8E8] flex items-center justify-center border border-black/5">
                                    <Users size={32} className="text-[#1D1D1F]" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-[#1D1D1F] tracking-tight">{selectedClient.companyName}</h2>
                                    <p className="text-[10px] text-[#B8860B] font-bold uppercase tracking-[0.2em]">{selectedClient.servicePackage}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedClient(null)}
                                className="p-3 hover:bg-[#F5F5F7] rounded-2xl transition-all text-[#86868B] hover:text-[#1D1D1F]"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-12">
                            {/* Quick Info Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-3xl bg-[#F5F5F7] border border-black/5">
                                    <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-2">Invoiced LTV</p>
                                    <p className="text-2xl font-serif font-bold text-[#1D1D1F]">${selectedClient.totalContractValue?.toLocaleString()}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-[#F5F5F7] border border-black/5">
                                    <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-2">Retention MRR</p>
                                    <p className="text-2xl font-serif font-bold text-[#1D9D60]">${selectedClient.monthlyValue?.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Decentralized Stripe Tools */}
                            <div className="space-y-6 pt-4 border-t border-[#F5F5F7]">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-[#86868B] uppercase tracking-[0.2em]">Financial Terminal</h3>
                                    {status && (
                                        <div className={`px-4 py-2 rounded-xl text-[10px] font-bold animate-reveal ${status.type === 'success' ? 'bg-[#1D9D60]/10 text-[#1D9D60]' : 'bg-red-500/10 text-red-500'}`}>
                                            {status.message}
                                        </div>
                                    )}
                                </div>

                                {!selectedClient.stripeCustomerId ? (
                                    <div className="bg-[#B8860B]/5 border border-[#B8860B]/20 p-6 rounded-[32px] flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-serif font-bold text-[#1D1D1F]">Initialize Stripe Identity</p>
                                            <p className="text-[10px] text-[#86868B]">Sync this CRM contact to Stripe for billing.</p>
                                        </div>
                                        <button
                                            onClick={() => handleCreateCustomer(selectedClient)}
                                            disabled={isCreatingCustomer}
                                            className="bg-black text-white px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
                                        >
                                            {isCreatingCustomer ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                                            Initialize
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 p-6 rounded-[32px] space-y-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#1D9D60]/10 rounded-xl flex items-center justify-center">
                                                <DollarSign size={16} className="text-[#1D9D60]" />
                                            </div>
                                            <p className="text-xs font-bold text-[#1D1D1F] uppercase tracking-widest">Pulse Invoice Terminal</p>
                                        </div>

                                        <form onSubmit={handleCreateInvoice} className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <input
                                                    type="text" required value={invDesc} onChange={(e) => setInvDesc(e.target.value)}
                                                    placeholder="Invoice Memo (e.g. Monthly Retainer)"
                                                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl py-3 px-4 text-xs font-medium"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <input
                                                    type="number" required value={invAmount} onChange={(e) => setInvAmount(e.target.value)}
                                                    placeholder="Amount (USD)"
                                                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-xl py-3 px-4 text-xs font-medium"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isCreatingInvoice}
                                                className="col-span-1 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#1D1D1F] transition-all flex items-center justify-center gap-2"
                                            >
                                                {isCreatingInvoice ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                                                {invMarkPaid ? 'Settle' : 'Send'}
                                            </button>
                                            <div className="col-span-2 flex items-center gap-2 cursor-pointer pt-2" onClick={() => setInvMarkPaid(!invMarkPaid)}>
                                                <div className={`w-8 h-4 rounded-full relative transition-all ${invMarkPaid ? 'bg-[#1D9D60]' : 'bg-black/10'}`}>
                                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${invMarkPaid ? 'right-0.5' : 'left-0.5'}`}></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-[#86868B] uppercase tracking-tighter">Settle Instantly (Paid Out-of-Band)</span>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* History Timeline */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold text-[#86868B] uppercase tracking-[0.2em] flex items-center gap-3">
                                    <FileText size={16} className="text-[#B8860B]" /> Audit history
                                </h3>

                                <div className="relative border-l-2 border-[#F5F5F7] ml-4 pl-8 space-y-8">
                                    {timelineItems.length > 0 ? timelineItems.map((item, idx) => (
                                        <div key={idx} className="relative">
                                            <div className="absolute -left-[41px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-[#F5F5F7] z-10" />
                                            <div className="luminous-card p-6 bg-[#F5F5F7]/40 hover:bg-white transition-all transform hover:-translate-y-1">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl border ${item.type === 'payment' ? 'bg-[#1D9D60]/10 border-[#1D9D60]/20 text-[#1D9D60]' :
                                                            item.type === 'project' ? 'bg-[#0066CC]/10 border-[#0066CC]/20 text-[#0066CC]' :
                                                                'bg-[#B8860B]/10 border-[#B8860B]/20 text-[#B8860B]'
                                                            }`}>
                                                            <item.icon size={16} />
                                                        </div>
                                                        <span className="text-sm font-bold text-[#1D1D1F] capitalize">{item.type}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                                <p className="text-sm text-[#6E6E73] leading-relaxed font-serif italic">
                                                    {item.type === 'payment' && `Validated transaction of $${(item.data as Payment).amount.toLocaleString()} received via Stripe.`}
                                                    {item.type === 'project' && `Project Milestone progression: ${(item.data as Project).currentMilestone}`}
                                                    {item.type === 'session' && `Strategy & Alignment session: ${(item.data as Session).sessionType}`}
                                                </p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-sm text-[#86868B] italic font-serif">Deep history records are currently consolidating for this account.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-10 border-t border-[#F5F5F7] bg-[#F5F5F7]/30 flex gap-4">
                            <button className="flex-1 py-4 bg-white hover:bg-white text-[#1D1D1F] border border-black/5 rounded-2xl text-sm font-bold transition-all shadow-sm active:scale-95">
                                Secure Communication
                            </button>
                            <button className="flex-1 py-4 luminous-button-gold rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95">
                                Launch Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* New Client Initialization Modal */}
            {isNewClientModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-reveal">
                    <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl border border-black/5 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-[#F5F5F7] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                                    <Plus size={24} className="text-[#B8860B]" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-serif font-bold text-[#1D1D1F]">Initialize Partnership</h3>
                                    <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest">Deploying core infrastructure for new client</p>
                                </div>
                            </div>
                            <button onClick={() => setIsNewClientModalOpen(false)} className="p-2 hover:bg-[#F5F5F7] rounded-xl transition-all"><X size={24} className="text-[#86868B]" /></button>
                        </div>

                        <form onSubmit={handleCreateClient} className="flex-1 overflow-y-auto p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Company Name</label>
                                        <input
                                            required
                                            className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8860B]/10"
                                            placeholder="e.g. Acme Corp"
                                            value={newClient.companyName}
                                            onChange={e => setNewClient({ ...newClient, companyName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Primary Contact</label>
                                        <input
                                            required
                                            className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                            placeholder="John Doe"
                                            value={newClient.primaryContact}
                                            onChange={e => setNewClient({ ...newClient, primaryContact: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Email</label>
                                            <input
                                                required type="email"
                                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                placeholder="john@example.com"
                                                value={newClient.email}
                                                onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Phone</label>
                                            <input
                                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                placeholder="+1 (555) 000-0000"
                                                value={newClient.phone}
                                                onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Service Package</label>
                                        <select
                                            className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm appearance-none"
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
                                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Monthly MRR ($)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                value={newClient.monthlyValue}
                                                onChange={e => setNewClient({ ...newClient, monthlyValue: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Contract Value ($)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                                value={newClient.totalContractValue}
                                                onChange={e => setNewClient({ ...newClient, totalContractValue: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm"
                                            value={newClient.startDate}
                                            onChange={e => setNewClient({ ...newClient, startDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-2">
                                <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest ml-1">Strategic Notes</label>
                                <textarea
                                    className="w-full bg-[#F5F5F7] border border-black/5 rounded-2xl py-4 px-6 text-sm h-32 resize-none"
                                    placeholder="Initial discovery notes, pain points, core objectives..."
                                    value={newClient.notes}
                                    onChange={e => setNewClient({ ...newClient, notes: e.target.value })}
                                />
                            </div>

                            <div className="mt-10 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsNewClientModalOpen(false)}
                                    className="flex-1 py-4 bg-white border border-black/5 text-[#86868B] rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:text-[#1D1D1F] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-3 py-4 bg-black text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#1D1D1F] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
