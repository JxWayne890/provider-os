
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
}

const RelationshipHub: React.FC<RelationshipHubProps> = ({
    leads,
    clients,
    payments,
    projects,
    sessions,
    onUpdateLead,
    onRequestLink
}) => {
    const [view, setView] = useState<'pipeline' | 'portfolio'>('pipeline');

    return (
        <div className="space-y-8 animate-reveal">
            {/* Premium Segmented Control */}
            <div className="flex justify-center px-4 md:px-0">
                <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-[22px] border border-black/5 shadow-sm flex w-full md:w-auto md:inline-flex">
                    <button
                        onClick={() => setView('pipeline')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-4 md:px-8 py-3 rounded-2xl text-sm font-bold transition-all ${view === 'pipeline'
                            ? 'bg-white text-[#B8860B] shadow-lg shadow-black/5'
                            : 'text-[#86868B] hover:text-[#1D1D1F]'
                            }`}
                    >
                        <Target size={18} />
                        Pipeline
                    </button>
                    <button
                        onClick={() => setView('portfolio')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-4 md:px-8 py-3 rounded-2xl text-sm font-bold transition-all ${view === 'portfolio'
                            ? 'bg-white text-[#B8860B] shadow-lg shadow-black/5'
                            : 'text-[#86868B] hover:text-[#1D1D1F]'
                            }`}
                    >
                        <Users size={18} />
                        Portfolio
                    </button>
                </div>
            </div>

            {/* Sub-Header Context Description */}
            <div className="text-center pb-4">
                <h2 className="text-3xl font-serif font-bold text-[#1D1D1F] tracking-tight">
                    {view === 'pipeline' ? 'Lead Generation Intelligence' : 'Global Partnership Portfolio'}
                </h2>
                <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-[10px]">
                    {view === 'pipeline'
                        ? `Managing ${leads.length} Active Prospects`
                        : `Managing ${clients.length} High-Value Partnerships`}
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
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelationshipHub;
