
import React, { useState } from 'react';
import { Users, Search, Filter, Plus, Mail, Phone, MoreVertical, ExternalLink, ShieldCheck, AlertCircle, X, Calendar, DollarSign, Briefcase, FileText } from 'lucide-react';
import { Client, ClientStatus, Payment, Project, Session } from '../types';

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

    return (
        <div className="space-y-10 animate-reveal pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-serif font-bold text-[#1D1D1F] tracking-tight">Global CRM</h1>
                    <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-xs">Managing {clients.length} active high-value partnerships</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-2xl text-[#86868B] shadow-sm">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-medium w-64 text-[#1D1D1F]"
                        />
                    </div>
                    <button className="p-2.5 bg-white border border-black/5 rounded-2xl text-[#86868B] hover:text-[#1D1D1F] transition-all shadow-sm">
                        <Filter size={20} />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#B8860B]/20">
                        <Plus size={18} /> New Client
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Reach', value: clients.length, color: 'text-[#1D1D1F]' },
                    { label: 'Total Invoiced', value: `$${clients.reduce((sum, c) => sum + (c.totalContractValue || 0), 0).toLocaleString()}`, color: 'text-[#1D1D1F]' },
                    { label: 'Monthly MRR', value: `$${clients.reduce((sum, c) => sum + (c.monthlyValue || 0), 0).toLocaleString()}`, color: 'text-[#1D9D60]' },
                    { label: 'Avg. Health', value: `${clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + (c.healthScore || 0), 0) / clients.length) : 0}%`, color: 'text-[#0066CC]' }
                ].map((stat, i) => (
                    <div key={i} className="luminous-card p-6 bg-white/70">
                        <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-3">{stat.label}</p>
                        <h3 className={`text-3xl font-serif font-bold ${stat.color}`}>{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Client List */}
            <div className="luminous-card bg-white overflow-hidden">
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
                                            <span className="text-[10px] text-[#86868B] font-bold">LTV: ${client.totalContractValue?.toLocaleString()}</span>
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
        </div>
    );
};

export default ClientsManager;
