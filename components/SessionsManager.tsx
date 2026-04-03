import React, { useState, useEffect } from 'react';
import { Session, ConfigItem, Client } from '../types';
import { Calendar, Video, Clock, Users, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, List, LayoutGrid, CalendarDays, X, MapPin, Mail, ArrowUpRight, Sparkles, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchUpcomingMeetings, fetchPastMeetings, CalendarEvent, sendEmail } from '../services/dataService';

interface SessionsManagerProps {
    clients?: Client[];
    sessions: Session[];
    configs?: ConfigItem[];
}

type ViewMode = 'list' | 'week' | 'month';
type TimeFilter = 'upcoming' | 'past';

const SessionsManager: React.FC<SessionsManagerProps> = ({ sessions, configs, clients }) => {
    const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
    const [past, setPast] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [followUpDraft, setFollowUpDraft] = useState<string>('');
    const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
    const [sendingFollowUp, setSendingFollowUp] = useState(false);
    const [followUpSent, setFollowUpSent] = useState(false);

    const tz = configs?.find(c => c.key === 'timezone')?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const loadCalendar = async () => {
        setIsLoading(true);
        try {
            const [u, p] = await Promise.all([fetchUpcomingMeetings(), fetchPastMeetings()]);
            setUpcoming(u);
            setPast(p);
        } catch (err) { console.error('Calendar load error:', err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { loadCalendar(); }, []);

    const generateFollowUp = async (event: CalendarEvent) => {
        setGeneratingFollowUp(true);
        setFollowUpSent(false);
        try {
            const attendeeNames = event.attendees.filter(a => !a.self).map(a => a.name || a.email).join(', ');
            const draft = `Hi ${attendeeNames || 'there'},\n\nThank you for taking the time to meet regarding "${event.summary}". I wanted to follow up on our discussion${event.description ? ' about ' + event.description.slice(0, 100) : ''}.\n\nKey takeaways from our meeting:\n- [Action item 1]\n- [Action item 2]\n\nPlease let me know if you have any questions or if there's anything else I can help with.\n\nBest regards`;
            setFollowUpDraft(draft);
        } catch (err) { console.error('Follow-up generation error:', err); }
        finally { setGeneratingFollowUp(false); }
    };

    const sendFollowUpEmail = async (event: CalendarEvent) => {
        setSendingFollowUp(true);
        try {
            const attendeeEmails = event.attendees.filter(a => !a.self && a.email).map(a => a.email);
            for (const email of attendeeEmails) {
                await sendEmail(email, `Follow-up: ${event.summary}`, followUpDraft.replace(/\n/g, '<br>'));
            }
            setFollowUpSent(true);
        } catch (err) { console.error('Send follow-up error:', err); }
        finally { setSendingFollowUp(false); }
    };

    const allEvents = [...past, ...upcoming];
    const listEvents = timeFilter === 'upcoming' ? upcoming : past;

    // ── Timezone-aware formatters ──
    const fmtTime = (s: string) => {
        if (!s) return '';
        return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
    };
    const fmtDate = (s: string) => {
        if (!s) return '';
        return new Date(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz });
    };
    const fmtFullDate = (s: string) => {
        if (!s) return '';
        return new Date(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz });
    };
    const fmtDatetime = (s: string) => {
        if (!s) return '';
        return new Date(s).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' });
    };

    const isToday = (d: Date) => {
        const now = new Date();
        return d.toLocaleDateString('en-US', { timeZone: tz }) === now.toLocaleDateString('en-US', { timeZone: tz });
    };
    const isSameDay = (a: Date, b: Date) => a.toLocaleDateString('en-US', { timeZone: tz }) === b.toLocaleDateString('en-US', { timeZone: tz });

    const getDayLabel = (s: string) => {
        const d = new Date(s);
        const now = new Date();
        const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
        if (isSameDay(d, now)) return 'Today';
        if (isSameDay(d, tmr)) return 'Tomorrow';
        return fmtDate(s);
    };

    const getAttendees = (e: CalendarEvent) => e.attendees.filter(a => !a.self);
    const hasMtg = (e: CalendarEvent) => !!(e.meetingLink || e.conferenceType);
    const getEventsForDate = (date: Date) => allEvents.filter(e => isSameDay(new Date(e.start), date));

    // ── Week/Month helpers ──
    const getWeekStart = (d: Date) => { const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return s; };
    const getWeekDays = (d: Date) => { const s = getWeekStart(d); return Array.from({length:7},(_,i)=>{const x=new Date(s);x.setDate(x.getDate()+i);return x;}); };
    const getMonthGrid = (d: Date) => {
        const y=d.getFullYear(),m=d.getMonth();const f=new Date(y,m,1);const l=new Date(y,m+1,0);
        const days:(Date|null)[]=[]; for(let i=0;i<f.getDay();i++)days.push(null);
        for(let i=1;i<=l.getDate();i++)days.push(new Date(y,m,i));
        while(days.length%7!==0)days.push(null); return days;
    };

    const navPrev = () => { const d=new Date(currentDate); if(viewMode==='week')d.setDate(d.getDate()-7);else d.setMonth(d.getMonth()-1); setCurrentDate(d); };
    const navNext = () => { const d=new Date(currentDate); if(viewMode==='week')d.setDate(d.getDate()+7);else d.setMonth(d.getMonth()+1); setCurrentDate(d); };
    const navToday = () => setCurrentDate(new Date());

    const weekDays = getWeekDays(currentDate);
    const monthGrid = getMonthGrid(currentDate);
    const hours = Array.from({length:15},(_,i)=>i+7);

    const headerLabel = viewMode === 'week'
        ? `${weekDays[0].toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:tz})} – ${weekDays[6].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:tz})}`
        : currentDate.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:tz});

    const groupedEvents:{[k:string]:CalendarEvent[]}={};
    listEvents.forEach(e=>{const k=new Date(e.start).toDateString();if(!groupedEvents[k])groupedEvents[k]=[];groupedEvents[k].push(e);});

    const meetingCount = upcoming.filter(hasMtg).length;

    // ── Event Card (compact for calendar grids) ──
    const EventCard = ({event,compact}:{event:CalendarEvent;compact?:boolean}) => (
        <div onClick={()=>setSelectedEvent(event)}
            className={`${compact?'px-1.5 py-1 text-[10px]':'p-2 text-xs'} rounded-lg bg-[#FF9F1C]/10 border border-[#FF9F1C]/20 text-[#1A1A2E] cursor-pointer hover:bg-[#FF9F1C]/20 transition-all overflow-hidden`}>
            <div className="font-bold truncate">{compact ? event.summary.slice(0,20) : event.summary}</div>
            {!compact && <div className="text-[#64748B] truncate mt-0.5">{fmtTime(event.start)}</div>}
        </div>
    );

    // ── Event Detail Modal ──
    const EventModal = () => {
        if (!selectedEvent) return null;
        const e = selectedEvent;
        const attendees = getAttendees(e);
        const isMeeting = hasMtg(e);

        return (
            <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setSelectedEvent(null)}>
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={ev=>ev.stopPropagation()}>
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-[#E2E8F0] flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <h2 className="text-xl font-serif font-bold text-[#1A1A2E]">{e.summary}</h2>
                            <p className="text-sm text-[#64748B] mt-1">{fmtDatetime(e.start)}</p>
                        </div>
                        <button onClick={()=>setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all shrink-0">
                            <X size={18} className="text-[#64748B]" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Time */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-[#F7F8FA] rounded-xl flex items-center justify-center shrink-0">
                                <Clock size={18} className="text-[#FF9F1C]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#1A1A2E]">{fmtTime(e.start)} – {fmtTime(e.end)}</p>
                                <p className="text-xs text-[#64748B] mt-0.5">{fmtFullDate(e.start)}</p>
                                <p className="text-[10px] text-[#64748B] mt-0.5 uppercase tracking-wider">{tz.replace(/_/g,' ')}</p>
                            </div>
                        </div>

                        {/* Meeting Link */}
                        {isMeeting && (
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                    <Video size={18} className="text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#1A1A2E]">{e.conferenceType || 'Video Call'}</p>
                                    {e.meetingLink && (
                                        <a href={e.meetingLink} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline mt-0.5 flex items-center gap-1 break-all">
                                            {e.meetingLink.length > 50 ? e.meetingLink.slice(0,50) + '...' : e.meetingLink}
                                            <ArrowUpRight size={12} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        {e.location && (
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-[#F7F8FA] rounded-xl flex items-center justify-center shrink-0">
                                    <MapPin size={18} className="text-[#64748B]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#1A1A2E]">Location</p>
                                    <p className="text-xs text-[#64748B] mt-0.5">{e.location}</p>
                                </div>
                            </div>
                        )}

                        {/* Attendees */}
                        {attendees.length > 0 && (
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-[#F7F8FA] rounded-xl flex items-center justify-center shrink-0">
                                    <Users size={18} className="text-[#64748B]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#1A1A2E] mb-2">{attendees.length} Attendee{attendees.length>1?'s':''}</p>
                                    <div className="space-y-2">
                                        {attendees.map((a,i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-[#64748B] uppercase">
                                                        {(a.name || a.email)[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-[#1A1A2E]">{a.name}</p>
                                                        <p className="text-[10px] text-[#64748B]">{a.email}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                                                    a.status === 'accepted' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                    a.status === 'declined' ? 'bg-red-50 text-red-500 border border-red-100' :
                                                    a.status === 'tentative' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                                    'bg-gray-50 text-gray-400 border border-[#E2E8F0]'
                                                }`}>{a.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {e.description && (
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-[#F7F8FA] rounded-xl flex items-center justify-center shrink-0">
                                    <Mail size={18} className="text-[#64748B]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#1A1A2E] mb-1">Description</p>
                                    <div className="text-xs text-[#64748B] leading-relaxed whitespace-pre-wrap bg-[#F7F8FA] rounded-xl p-3 max-h-32 overflow-y-auto"
                                        dangerouslySetInnerHTML={{__html: e.description}} />
                                </div>
                            </div>
                        )}

                        {/* Organizer */}
                        {e.organizer && (
                            <div className="text-[10px] text-[#64748B] uppercase tracking-widest pt-2 border-t border-[#E2E8F0]">
                                Organized by {e.organizer}
                            </div>
                        )}
                    </div>

                    {/* Follow-up Email Section */}
                    {new Date(e.start) < new Date() && (
                        <div className="px-6 pt-2 space-y-3">
                            {!followUpDraft && !generatingFollowUp && (
                                <button onClick={() => generateFollowUp(e)}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#FF9F1C]/10 text-[#FF9F1C] rounded-2xl text-sm font-bold hover:bg-[#FF9F1C]/20 transition-all border border-[#FF9F1C]/20">
                                    <Sparkles size={16} /> Generate Follow-up Email
                                </button>
                            )}
                            {generatingFollowUp && (
                                <div className="flex items-center justify-center gap-2 py-3 text-[#FF9F1C]">
                                    <Loader2 size={16} className="animate-spin" /> Generating...
                                </div>
                            )}
                            {followUpDraft && !generatingFollowUp && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-[#64748B] uppercase tracking-wide">Follow-up Email</label>
                                    <textarea value={followUpDraft} onChange={(ev) => setFollowUpDraft(ev.target.value)}
                                        rows={6} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9F1C]/30 resize-none" />
                                    {followUpSent ? (
                                        <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold"><CheckCircle2 size={16} /> Follow-up sent!</div>
                                    ) : (
                                        <button onClick={() => sendFollowUpEmail(e)} disabled={sendingFollowUp}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A2E] text-white rounded-xl text-sm font-bold hover:bg-[#0a2850] transition-all disabled:opacity-50">
                                            {sendingFollowUp ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Follow-up
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Footer Actions */}
                    <div className="p-6 pt-0 flex gap-3">
                        {e.meetingLink && (
                            <a href={e.meetingLink} target="_blank" rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0B3060] text-white rounded-2xl text-sm font-bold hover:bg-[#0a2850] transition-all">
                                <Video size={16} /> Join Meeting
                            </a>
                        )}
                        {e.htmlLink && (
                            <a href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                                className={`${e.meetingLink ? '' : 'flex-1'} flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-[#1A1A2E] rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all`}>
                                <ExternalLink size={16} /> Open in Google Calendar
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-reveal pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                <div>
                    <h2 className="text-5xl font-serif font-bold text-[#1A1A2E] tracking-tight">Sessions</h2>
                    <p className="text-[#64748B] mt-2 font-medium tracking-wide uppercase text-xs">Google Calendar &middot; {tz.replace(/_/g,' ')}</p>
                </div>
                <button onClick={loadCalendar} disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#FF9F1C]/20 disabled:opacity-50">
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? 'Syncing...' : 'Sync Calendar'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {label:'Upcoming',val:upcoming.length,sub:'next 30 days'},
                    {label:'Video Calls',val:meetingCount,sub:'with meeting links'},
                    {label:'Today',val:allEvents.filter(e=>isToday(new Date(e.start))).length,sub:'events'},
                    {label:'Past 30 Days',val:past.length,sub:'completed'},
                ].map(s=>(
                    <div key={s.label} className="luminous-card bg-white p-5">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">{s.label}</p>
                        <p className="text-3xl font-serif font-bold">{s.val}</p>
                        <p className="text-xs text-[#64748B] mt-1">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* View Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    {([{mode:'list' as ViewMode,icon:List,label:'List'},{mode:'week' as ViewMode,icon:CalendarDays,label:'Week'},{mode:'month' as ViewMode,icon:LayoutGrid,label:'Month'}]).map(v=>(
                        <button key={v.mode} onClick={()=>setViewMode(v.mode)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode===v.mode?'bg-[#0B3060] text-white shadow-md':'text-[#64748B] hover:text-[#1A1A2E]'}`}>
                            <v.icon size={14}/> {v.label}
                        </button>
                    ))}
                </div>
                {viewMode !== 'list' && (
                    <div className="flex items-center gap-3">
                        <button onClick={navToday} className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">Today</button>
                        <button onClick={navPrev} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"><ChevronLeft size={16}/></button>
                        <span className="text-sm font-bold text-[#1A1A2E] min-w-[180px] text-center">{headerLabel}</span>
                        <button onClick={navNext} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"><ChevronRight size={16}/></button>
                    </div>
                )}
                {viewMode === 'list' && (
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        <button onClick={()=>setTimeFilter('upcoming')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeFilter==='upcoming'?'bg-[#0B3060] text-white shadow-md':'text-[#64748B]'}`}>Upcoming ({upcoming.length})</button>
                        <button onClick={()=>setTimeFilter('past')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeFilter==='past'?'bg-[#0B3060] text-white shadow-md':'text-[#64748B]'}`}>Past ({past.length})</button>
                    </div>
                )}
            </div>

            {/* Loading */}
            {isLoading && allEvents.length === 0 && (
                <div className="py-20 flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-[#FF9F1C] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[#64748B] font-serif italic">Syncing calendar...</p>
                </div>
            )}

            {/* ═══ LIST VIEW ═══ */}
            {viewMode === 'list' && !isLoading && (
                <>
                    {listEvents.length===0 && (
                        <div className="py-20 flex flex-col items-center text-[#64748B]">
                            <Calendar size={48} className="mb-6 opacity-20"/>
                            <p className="font-serif italic text-lg">{timeFilter==='upcoming'?'No upcoming meetings.':'No past meetings found.'}</p>
                        </div>
                    )}
                    {Object.entries(groupedEvents).map(([dayKey,dayEvents])=>(
                        <div key={dayKey} className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold uppercase tracking-widest">{getDayLabel(dayEvents[0].start)}</h3>
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-[#64748B]">{fmtFullDate(dayEvents[0].start)}</span>
                            </div>
                            {dayEvents.map(event=>{
                                const attendees=getAttendees(event);const isMeeting=hasMtg(event);
                                return (
                                    <div key={event.id} onClick={()=>setSelectedEvent(event)}
                                        className="luminous-card bg-white p-5 flex items-start gap-5 group hover:translate-y-[-1px] transition-all cursor-pointer">
                                        <div className="text-center min-w-[60px]">
                                            <p className="text-lg font-bold font-serif">{fmtTime(event.start)}</p>
                                            <p className="text-[10px] text-[#64748B]">{fmtTime(event.end)}</p>
                                        </div>
                                        <div className="w-px h-14 bg-gray-200 self-center"></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-base truncate">{event.summary}</h4>
                                            {attendees.length>0 && (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Users size={13} className="text-[#64748B]"/>
                                                    <p className="text-xs text-[#64748B] truncate">{attendees.map(a=>a.name).slice(0,3).join(', ')}{attendees.length>3&&` +${attendees.length-3}`}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isMeeting && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100">{event.conferenceType||'Video'}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </>
            )}

            {/* ═══ WEEK VIEW ═══ */}
            {viewMode === 'week' && !isLoading && (
                <div className="luminous-card bg-white overflow-hidden">
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#E2E8F0]">
                        <div className="p-3"></div>
                        {weekDays.map((day,i)=>{const de=getEventsForDate(day);const td=isToday(day);return(
                            <div key={i} className={`p-3 text-center border-l border-[#E2E8F0] ${td?'bg-[#FF9F1C]/5':''}`}>
                                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">{day.toLocaleDateString('en-US',{weekday:'short',timeZone:tz})}</p>
                                <p className={`text-xl font-serif font-bold mt-1 ${td?'text-[#FF9F1C]':'text-[#1A1A2E]'}`}>{day.getDate()}</p>
                                {de.length>0 && <div className="w-1.5 h-1.5 rounded-full bg-[#FF9F1C] mx-auto mt-1"></div>}
                            </div>
                        );})}
                    </div>
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
                        {hours.map(hour=>(
                            <React.Fragment key={hour}>
                                <div className="h-16 flex items-start justify-end pr-3 pt-1">
                                    <span className="text-[10px] font-bold text-[#64748B]">{hour===0?'12 AM':hour<12?`${hour} AM`:hour===12?'12 PM':`${hour-12} PM`}</span>
                                </div>
                                {weekDays.map((day,di)=>{
                                    const de=getEventsForDate(day).filter(e=>new Date(e.start).getHours()===hour);const td=isToday(day);
                                    return(
                                        <div key={di} className={`h-16 border-l border-t border-[#E2E8F0]/50 p-0.5 ${td?'bg-[#FF9F1C]/[0.02]':''}`}>
                                            {de.map(ev=><EventCard key={ev.id} event={ev}/>)}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ MONTH VIEW ═══ */}
            {viewMode === 'month' && !isLoading && (
                <div className="luminous-card bg-white overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-[#E2E8F0]">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
                            <div key={d} className="p-3 text-center"><span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">{d}</span></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {monthGrid.map((day,i)=>{
                            if(!day)return <div key={`e-${i}`} className="h-28 border-t border-l border-[#E2E8F0]/50 bg-gray-50/50"></div>;
                            const de=getEventsForDate(day);const td=isToday(day);
                            return(
                                <div key={i} className={`h-28 border-t border-l border-[#E2E8F0]/50 p-2 overflow-hidden ${td?'bg-[#FF9F1C]/5':''}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-bold ${td?'w-6 h-6 rounded-full bg-[#FF9F1C] text-white flex items-center justify-center':'text-[#1A1A2E]'}`}>{day.getDate()}</span>
                                        {de.length>0 && <span className="text-[9px] font-bold text-[#64748B]">{de.length}</span>}
                                    </div>
                                    <div className="space-y-0.5">
                                        {de.slice(0,3).map(ev=><EventCard key={ev.id} event={ev} compact/>)}
                                        {de.length>3 && <p className="text-[9px] font-bold text-[#64748B] pl-1">+{de.length-3} more</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Event Detail Modal */}
            <EventModal />
        </div>
    );
};

export default SessionsManager;
