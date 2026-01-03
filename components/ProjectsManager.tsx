
import React from 'react';
import { Project } from '../types';
import { Briefcase, Clock, CheckCircle2, AlertTriangle, ChevronRight, Layout, Milestone, Plus } from 'lucide-react';

interface ProjectsManagerProps {
    projects: Project[];
}

const ProjectsManager: React.FC<ProjectsManagerProps> = ({ projects }) => {
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Finished': return 'text-[#1D9D60] bg-[#1D9D60]/10 border-[#1D9D60]/20';
            case 'In Progress': return 'text-[#0066CC] bg-[#0066CC]/10 border-[#0066CC]/20';
            case 'Blocked': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-[#86868B] bg-[#E8E8E8] border-black/5';
        }
    };

    return (
        <div className="space-y-10 animate-reveal pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-5xl font-serif font-bold text-[#1D1D1F] tracking-tight">Deployment Matrix</h2>
                    <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-xs">Monitoring client success and mission-critical milestones</p>
                </div>
                <button className="flex items-center gap-2 px-8 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#B8860B]/20">
                    <Plus size={18} /> New Project
                </button>
            </div>

            <div className="space-y-6">
                {projects.map((project) => (
                    <div key={project.id} className="luminous-card bg-white p-8 group hover:translate-y--0.5 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                            <div className="space-y-4 flex-1">
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 bg-[#F5F5F7] rounded-[22px] flex items-center justify-center border border-black/5 shadow-inner">
                                        <Layout size={24} className="text-[#B8860B]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-serif font-bold text-[#1D1D1F] group-hover:text-[#B8860B] transition-colors">{project.name}</h3>
                                        <p className="text-sm text-[#86868B] font-serif italic max-w-xl">{project.scopeSummary}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center border border-black/5">
                                            <Milestone size={14} className="text-[#B8860B]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Milestone</span>
                                            <span className="text-sm font-bold text-[#1D1D1F]">{project.currentMilestone}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center border border-black/5">
                                            <Clock size={14} className="text-[#86868B]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Deadline</span>
                                            <span className="text-sm font-bold text-[#1D1D1F]">{project.dueDate}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-8 lg:min-w-[400px] justify-end">
                                <div className="space-y-2 w-full sm:w-48">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868B]">
                                        <span>Velocity</span>
                                        <span className="text-[#1D1D1F]">65%</span>
                                    </div>
                                    <div className="h-2 w-full bg-[#F5F5F7] rounded-full overflow-hidden border border-black/5">
                                        <div className="h-full bg-[#B8860B] rounded-full w-2/3 shadow-sm"></div>
                                    </div>
                                </div>

                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyle(project.status)}`}>
                                    {project.status}
                                </span>

                                <button className="p-3 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-2xl transition-all">
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>

                        {project.risks && (
                            <div className="mt-8 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center gap-4">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-red-500/10 shadow-sm shrink-0">
                                    <AlertTriangle size={16} className="text-red-500" />
                                </div>
                                <span className="text-xs text-red-600 font-bold uppercase tracking-widest">Risk Factor: {project.risks}</span>
                            </div>
                        )}
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center text-[#86868B]">
                        <Briefcase size={48} className="mb-6 opacity-20" />
                        <p className="font-serif italic text-lg">System idling. No active deployments detected.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectsManager;
