import React, { useState } from 'react';
import { Search, Square, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Loader2, ExternalLink, Globe } from 'lucide-react';
import { useResearch } from './ResearchContext';
import LeadScoreBar from './LeadScoreBar';

const FloatingResearchPill: React.FC = () => {
  const ctx = useResearch();
  const [expanded, setExpanded] = useState(false);

  const visible = ctx.isRunning || ctx.isComplete;
  if (!visible) return null;

  const progress = ctx.totalLeads > 0 ? (ctx.researched / ctx.totalLeads) * 100 : 0;

  // Navigate to outreach campaign
  const goToResearch = () => {
    window.location.hash = `outreach?campaign=${ctx.campaignId}`;
    setExpanded(false);
  };

  // Collapsed pill
  if (!expanded) {
    return (
      <div
        className={`fixed z-50 transition-all duration-300 ease-out
          bottom-20 lg:bottom-6 right-4 lg:right-6
          ${ctx.isComplete ? 'cursor-pointer' : ''}`}
        style={{ animation: 'slideUpFade 300ms ease-out' }}
      >
        <div
          onClick={() => ctx.isComplete ? goToResearch() : setExpanded(true)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg cursor-pointer transition-all hover:shadow-xl active:scale-[0.98] ${
            ctx.isComplete
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0B3060] text-white'
          }`}
          style={{ minWidth: 240 }}
        >
          {/* Status indicator */}
          {ctx.isRunning ? (
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            </div>
          ) : (
            <CheckCircle size={16} className="flex-shrink-0" />
          )}

          {/* Icon */}
          {ctx.isRunning ? (
            <Loader2 size={16} className="animate-spin flex-shrink-0" />
          ) : (
            <Search size={16} className="flex-shrink-0" />
          )}

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums">
                {ctx.isComplete
                  ? `Done! ${ctx.researched.toLocaleString()} researched`
                  : `${ctx.researched.toLocaleString()} / ${ctx.totalLeads.toLocaleString()}`
                }
              </span>
            </div>
            {/* Mini progress bar */}
            {ctx.isRunning && (
              <div className="w-full bg-white/20 rounded-full h-[3px] mt-1">
                <div
                  className="bg-[#FF9F1C] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(progress, 1)}%` }}
                />
              </div>
            )}
          </div>

          {/* Stop button */}
          {ctx.isRunning && (
            <button
              onClick={e => { e.stopPropagation(); ctx.stopResearch(); }}
              className="p-1 hover:bg-white/20 rounded-md transition-all flex-shrink-0"
              title="Stop research"
            >
              <Square size={14} fill="white" />
            </button>
          )}
        </div>

        <style>{`
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // Expanded modal
  return (
    <div
      className="fixed z-50 transition-all duration-300 ease-out
        bottom-20 lg:bottom-6 right-0 lg:right-6
        w-full lg:w-[420px] max-h-[70vh] lg:max-h-[500px]"
      style={{ animation: 'slideUpFade 300ms ease-out' }}
    >
      <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[70vh] lg:max-h-[500px]">
        {/* Header */}
        <div className="bg-[#0B3060] text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/60 mb-0.5">Researching</p>
              <p className="text-sm font-bold truncate">{ctx.campaignName || 'Campaign'}</p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {ctx.isRunning && (
                <button
                  onClick={() => ctx.stopResearch()}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  title="Stop"
                >
                  <Square size={14} fill="white" />
                </button>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                title="Minimize"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold tabular-nums">{ctx.researched.toLocaleString()} / {ctx.totalLeads.toLocaleString()}</span>
            <span className="text-xs text-white/60">{progress.toFixed(0)}%</span>
            {ctx.isRunning && <Loader2 size={12} className="animate-spin text-[#FF9F1C]" />}
            {ctx.isComplete && <CheckCircle size={12} className="text-emerald-400" />}
          </div>
          <div className="w-full bg-white/15 rounded-full h-2">
            <div
              className="bg-[#FF9F1C] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-[#E2E8F0] flex-shrink-0">
          {[
            { label: 'No Site', value: ctx.noWebsite, color: 'text-emerald-600' },
            { label: 'Broken', value: ctx.broken, color: 'text-red-500' },
            { label: 'Crawled', value: ctx.crawled, color: 'text-blue-600' },
            { label: 'Avg', value: ctx.avgScore.toFixed(1), color: 'text-[#FF9F1C]' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-[#94A3B8] font-semibold uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Live feed */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Recent Results</p>
          {ctx.recentResults.length === 0 ? (
            <p className="text-xs text-[#94A3B8] text-center py-6">Waiting for results...</p>
          ) : (
            <div className="space-y-1.5">
              {ctx.recentResults.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#F7F8FA] transition-all"
                  style={{ animation: `slideInRight 150ms ease-out ${i * 30}ms both` }}
                >
                  <div className="flex-shrink-0">
                    {r.status === 'no_website' ? (
                      <XCircle size={14} className="text-emerald-500" />
                    ) : r.status === 'error' || r.score >= 8 ? (
                      <AlertTriangle size={14} className="text-amber-500" />
                    ) : (
                      <Globe size={14} className="text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#1A1A2E] truncate">{r.companyName}</p>
                    <p className="text-[10px] text-[#94A3B8] truncate">{r.assessment || r.website || 'No website'}</p>
                  </div>
                  <LeadScoreBar score={r.score} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E2E8F0] flex items-center justify-between flex-shrink-0">
          <button
            onClick={goToResearch}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3060] text-white rounded-lg text-xs font-semibold hover:bg-[#0a2850] transition-all"
          >
            <ExternalLink size={12} /> Go to Research
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-[#94A3B8] hover:text-[#1A1A2E] font-medium transition-all"
          >
            Minimize
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default FloatingResearchPill;
