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
        <div className="space-y-6 animate-reveal pb-20">
            {/* Header - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-4xl font-serif font-bold text-[#1A1A2E] tracking-tight">Operations</h2>
                    <p className="text-[#64748B] mt-1 font-medium text-xs uppercase tracking-wide">Task management & protocols</p>
                </div>
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#FF9F1C]/20">
                    <Plus size={18} /> New Task
                </button>
            </div>

            {/* Filter tabs - horizontal scroll on mobile */}
            <div className="mobile-scroll-row md:flex md:gap-4 bg-white border border-[#E2E8F0] rounded-2xl p-2">
                <button className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FF9F1C] bg-[#FF9F1C]/10 rounded-xl whitespace-nowrap">All Tasks</button>
                <button className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#64748B] hover:text-[#1A1A2E] rounded-xl transition-colors whitespace-nowrap">By Priority</button>
                <button className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#64748B] hover:text-[#1A1A2E] rounded-xl transition-colors whitespace-nowrap">My Tasks</button>
            </div>

            {/* Task list */}
            <div className="space-y-2">
                {tasks.map((task) => (
                    <div key={task.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 active:bg-[#F7F8FA] transition-all">
                        <div className="flex items-start gap-3">
                            <button className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${task.status === 'Done' ? 'bg-[#1D9D60] border-[#1D9D60]' : 'border-[#E2E8F0] active:border-[#FF9F1C]'}`}>
                                {task.status === 'Done' && <CheckCircle2 size={16} className="text-white" />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <p className={`text-[15px] font-medium leading-snug ${task.status === 'Done' ? 'text-[#94A3B8] line-through' : 'text-[#1A1A2E]'}`}>
                                    {task.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-2.5">
                                    <div className="flex items-center gap-1.5">
                                        {task.priority === 'High' && <AlertTriangle size={12} className="text-red-500" />}
                                        {task.priority === 'Medium' && <Briefcase size={12} className="text-[#FF9F1C]" />}
                                        {task.priority === 'Low' && <CheckCircle2 size={12} className="text-[#1D9D60]" />}
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{task.priority}</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{task.owner}</span>
                                    <div className="flex items-center gap-1 text-[#94A3B8]">
                                        <Clock size={11} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{task.dueDate}</span>
                                    </div>
                                </div>
                                {task.notes && (
                                    <div className="mt-2 px-2.5 py-1 bg-[#FF9F1C]/5 border border-[#FF9F1C]/10 rounded-lg text-[10px] text-[#FF9F1C] font-bold uppercase tracking-wider inline-block">
                                        Notes attached
                                    </div>
                                )}
                            </div>

                            <button className="w-10 h-10 flex items-center justify-center text-[#CBD5E1] active:text-[#1A1A2E] active:bg-[#F7F8FA] rounded-xl transition-all flex-shrink-0">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                ))}

                {tasks.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-[#64748B]">
                        <Layout size={48} className="mb-6 opacity-20" />
                        <p className="font-serif italic text-lg text-center">All tasks completed.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OperationsManager;
