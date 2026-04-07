import React, { useState } from 'react';
import { Target, Users, LayoutGrid, ChevronRight } from 'lucide-react';
import LeadsManager from './LeadsManager';
import ClientsManager from './ClientsManager';
import { Lead, Client, Payment, Project, Session } from '../types';

interface RelationshipHubProps {
    leads: Lead[];
    clients: Client[];
    payments: Payment[];
    projects: Project[];
    sessions: Session[];
    onUpdateLead: (updatedLead: Lead) => Promise<void>;
    onRequestLink?: (lead: Lead) => void;
    onRefresh?: () => Promise<void>;
}

const RelationshipHub: React.FC<RelationshipHubProps> = ({
    leads,
    clients,
    payments,
    projects,
    sessions,
    onUpdateLead,
    onRefresh,
    onRequestLink
}) => {
    const [view, setView] = useState<'pipeline' | 'portfolio'>('pipeline');

    return (
        <div className="space-y-6 animate-reveal">
            {/* Segmented Control - Full width on mobile */}
            <div className="flex justify-center px-0 md:px-4">
                <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-[#E2E8F0] shadow-sm flex w-full md:w-auto md:inline-flex">
                    <button
                        onClick={() => setView('pipeline')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 md:px-8 py-3.5 rounded-xl text-sm font-bold transition-all ${view === 'pipeline'
                            ? 'bg-white text-[#FF9F1C] shadow-lg shadow-black/5'
                            : 'text-[#64748B] active:text-[#1A1A2E]'
                            }`}
                    >
                        <Target size={18} />
                        Pipeline
                    </button>
                    <button
                        onClick={() => setView('portfolio')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 md:px-8 py-3.5 rounded-xl text-sm font-bold transition-all ${view === 'portfolio'
                            ? 'bg-white text-[#FF9F1C] shadow-lg shadow-black/5'
                            : 'text-[#64748B] active:text-[#1A1A2E]'
                            }`}
                    >
                        <Users size={18} />
                        Portfolio
                    </button>
                </div>
            </div>

            {/* Context */}
            <div className="text-center pb-2">
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#1A1A2E] tracking-tight">
                    {view === 'pipeline' ? 'Lead Intelligence' : 'Partnership Portfolio'}
                </h2>
                <p className="text-[#64748B] mt-1 font-medium tracking-wide uppercase text-[10px]">
                    {view === 'pipeline'
                        ? `Managing ${leads.length} Active Prospects`
                        : `Managing ${clients.length} Partnerships`}
                </p>
            </div>

            <div className="relative">
                {view === 'pipeline' ? (
                    <div className="animate-reveal">
                        <LeadsManager
                            leads={leads}
                            onUpdateLead={onUpdateLead}
                            onRequestLink={onRequestLink}
                        />
                    </div>
                ) : (
                    <div className="animate-reveal">
                        <ClientsManager
                            clients={clients}
                            payments={payments}
                            projects={projects}
                            sessions={sessions}
                            onRefresh={onRefresh}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelationshipHub;
