import React from 'react';
import { Task } from '../types';
import { Briefcase, Clock, CheckCircle2, AlertTriangle, ChevronRight, Layout, Milestone, Plus, Filter } from 'lucide-react';

interface OperationsManagerProps {
    tasks: Task[];
}

const OperationsManager: React.FC<OperationsManagerProps> = ({ tasks }) => {
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'text-red-400 bg-red-400';
            case 'Medium': return 'text-amber-400 bg-amber-400';
            default: return 'text-green-400 bg-green-400';
        }
    };

    return (
        <div className="space-y-10 animate-reveal pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-5xl font-serif font-bold text-[#1A1A2E] tracking-tight">Operations Hub</h2>
                    <p className="text-[#64748B] mt-2 font-medium tracking-wide uppercase text-xs">Internal task matrix and automated system protocols</p>
                </div>
                <button className="flex items-center gap-2 px-8 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#FF9F1C]/20">
                    <Plus size={18} /> New Task
                </button>
            </div>

            <div className="luminous-card bg-white overflow-hidden">
                <div className="p-6 border-b border-[#F7F8FA] bg-[#F7F8FA]/30 flex justify-between items-center">
                    <div className="flex gap-8">
                        <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF9F1C] border-b-2 border-[#FF9F1C] pb-1">All Missions</button>
                        <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748B] hover:text-[#1A1A2E] transition-colors pb-1">By Projection</button>
                        <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748B] hover:text-[#1A1A2E] transition-colors pb-1">My Deck</button>
                    </div>
                    <button className="text-[#64748B] hover:text-[#1A1A2E] transition-all p-2 hover:bg-white rounded-xl">
                        <Filter size={18} />
                    </button>
                </div>

                <div className="divide-y divide-[#F7F8FA]">
                    {tasks.map((task) => (
                        <div key={task.id} className="p-6 hover:bg-[#F7F8FA]/30 transition-all flex items-center gap-6 group">
                            <button className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.status === 'Done' ? 'bg-[#1D9D60] border-[#1D9D60]' : 'border-[#E8E8E8] hover:border-[#FF9F1C]'}`}>
                                {task.status === 'Done' && <CheckCircle2 size={14} className="text-white" />}
                            </button>

                            <div className="flex-1">
                                <p className={`text-sm font-medium ${task.status === 'Done' ? 'text-[#64748B] line-through' : 'text-[#1A1A2E]'}`}>
                                    {task.description}
                                </p>
                                <div className="flex items-center gap-6 mt-3">
                                    <div className="flex items-center gap-2">
                                        {task.priority === 'High' && <AlertTriangle size={12} className="text-red-500" />}
                                        {task.priority === 'Medium' && <Briefcase size={12} className="text-[#FF9F1C]" />}
                                        {task.priority === 'Low' && <CheckCircle2 size={12} className="text-[#1D9D60]" />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{task.priority} Priority</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#64748B]">
                                        <Milestone size={12} /> {/* Changed from User to Milestone for a more "Luminous" feel, assuming this is part of the redesign */}
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{task.owner}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#64748B]">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">EXP: {task.dueDate}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                {task.notes && (
                                    <div className="px-2 py-1 bg-[#F7F8FA] border border-black/5 rounded-lg text-[9px] text-[#FF9F1C] font-bold uppercase tracking-widest">Protocol Attached</div>
                                )}
                                <button className="p-2.5 text-[#64748B] hover:text-[#1A1A2E] hover:bg-white rounded-xl transition-all shadow-sm">
                                    <ChevronRight size={18} /> {/* Changed from MoreHorizontal to ChevronRight, assuming this is part of the redesign */}
                                </button>
                            </div>
                        </div>
                    ))}

                    {tasks.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center text-[#64748B]">
                            <Layout size={48} className="mb-6 opacity-20" /> {/* Changed from CheckSquare to Layout, assuming this is part of the redesign */}
                            <p className="font-serif italic text-lg">Operational harmony achieved. All tasks completed.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OperationsManager;
