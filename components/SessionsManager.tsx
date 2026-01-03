import React from 'react';
import { Session } from '../types';
import { Calendar, Video, FileText, Mail, Clock, CheckCircle2, AlertTriangle, Play, ExternalLink, Brain } from 'lucide-react';

interface SessionsManagerProps {
    sessions: Session[];
}

const SessionsManager: React.FC<SessionsManagerProps> = ({ sessions }) => {
    return (
        <div className="space-y-10 animate-reveal pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-5xl font-serif font-bold text-[#1D1D1F] tracking-tight">Intelligence Log</h2>
                    <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-xs">Post-session synthesis and cognitive action mapping</p>
                </div>
                <button className="flex items-center gap-2 px-8 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#B8860B]/20">
                    <Calendar size={18} /> Sync Calendar
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {sessions.map((session) => (
                    <div key={session.id} className="luminous-card bg-white flex flex-col h-[450px] group hover:translate-y--1 transition-all">
                        <div className="p-6 border-b border-[#F5F5F7] bg-[#F5F5F7]/30 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-black/5 shadow-sm">
                                    <Calendar size={20} className="text-[#B8860B]" />
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-[#1D1D1F] text-lg">{session.sessionType || 'Strategy Session'}</h3>
                                    <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">{new Date(session.scheduledAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${session.status === 'Completed' ? 'text-[#1D9D60] bg-[#1D9D60]/10 border-[#1D9D60]/20' :
                                session.status === 'Scheduled' ? 'text-[#B8860B] bg-[#B8860B]/10 border-[#B8860B]/20' :
                                    'text-red-500 bg-red-500/10 border-red-500/20'
                                }`}>
                                {session.status}
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto p-8 space-y-6 custom-scrollbar">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[#B8860B]">
                                    <Brain size={16} />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Cognitive Synthesis</span>
                                </div>
                                <p className="text-sm text-[#1D1D1F] leading-relaxed font-serif italic border-l-2 border-[#F5F5F7] pl-4">"{session.aiSummary}"</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[#86868B]">
                                    <CheckCircle2 size={16} className="text-[#1D9D60]" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Actionable Items</span>
                                </div>
                                <div className="text-xs text-[#6E6E73] space-y-2 font-medium">
                                    {(session.aiActionItems ? (typeof session.aiActionItems === 'string' ? session.aiActionItems.split('\n') : Array.isArray(session.aiActionItems) ? session.aiActionItems : []) : []).map((item, i) => (
                                        <div key={i} className="flex gap-3">
                                            <span className="text-[#B8860B] font-bold">•</span>
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-[#F5F5F7] bg-[#F5F5F7]/30 flex items-center justify-between gap-4">
                            <div className="flex gap-3">
                                <a href={session.meetingLink} className="p-2.5 bg-white border border-black/5 rounded-xl text-[#86868B] hover:text-[#1D1D1F] transition-all shadow-sm" title="Launch Recording">
                                    <Play size={18} />
                                </a>
                                <a href={session.transcriptLink} className="p-2.5 bg-white border border-black/5 rounded-xl text-[#86868B] hover:text-[#1D1D1F] transition-all shadow-sm" title="View Transcript">
                                    <FileText size={18} />
                                </a>
                            </div>
                            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-black/5 rounded-xl text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all shadow-sm">
                                <Mail size={16} /> Review Follow-up Draft
                            </button>
                        </div>
                    </div>
                ))}

                {sessions.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-[#86868B]">
                        <Video size={48} className="mb-6 opacity-20" />
                        <p className="font-serif italic text-lg">No meetings have been archived in this cycle.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionsManager;
