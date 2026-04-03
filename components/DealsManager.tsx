import React from 'react';
import { Deal, DealStage } from '../types';
import { DollarSign, Calendar, ExternalLink, Filter, Plus, ChevronRight } from 'lucide-react';

interface DealsManagerProps {
  deals: Deal[];
  onUpdateDeal: (deal: Deal) => void;
}

const DealsManager: React.FC<DealsManagerProps> = ({ deals, onUpdateDeal }) => {
  const getStageColor = (stage: DealStage) => {
    switch (stage) {
      case DealStage.WON: return 'text-[#1D9D60] bg-[#1D9D60]/10 border-[#1D9D60]/20';
      case DealStage.LOST: return 'text-red-500 bg-red-500/10 border-red-500/20';
      case DealStage.PROPOSAL_SENT: return 'text-[#0066CC] bg-[#0066CC]/10 border-[#0066CC]/20';
      case DealStage.CALL_BOOKED: return 'text-[#FF9F1C] bg-[#FF9F1C]/10 border-[#FF9F1C]/20';
      default: return 'text-[#64748B] bg-[#E8E8E8] border-black/5';
    }
  };

  return (
    <div className="space-y-6 animate-reveal pb-20">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-[#1A1A2E] tracking-tight">Deal Flow</h2>
          <p className="text-[#64748B] mt-1 font-medium text-xs uppercase tracking-wide">Active proposals & pipeline</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-[#E2E8F0] rounded-2xl text-sm font-bold text-[#1A1A2E] active:bg-[#F7F8FA] transition-all shadow-sm">
            <Filter size={16} /> Filter
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#FF9F1C]/20">
            <Plus size={18} /> New Deal
          </button>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => (
          <div key={deal.id} className="luminous-card bg-white p-5 space-y-4 active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-serif font-bold text-[#1A1A2E] truncate">{deal.offerName}</h3>
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-tighter">REF: {deal.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border flex-shrink-0 ${getStageColor(deal.stage)}`}>
                {deal.stage}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] flex items-center justify-center border border-[#E2E8F0]">
                  <DollarSign size={16} className="text-[#1D9D60]" />
                </div>
                <span className="text-lg font-serif font-bold text-[#1A1A2E]">${deal.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#F7F8FA] flex items-center justify-center border border-[#E2E8F0]">
                  <Calendar size={16} className="text-[#64748B]" />
                </div>
                <span className="text-sm font-bold text-[#64748B]">{new Date(deal.sentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F7F8FA] flex items-center justify-between">
              <a href={deal.proposalLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-[#0066CC] active:opacity-70 px-3 py-2 -ml-3 rounded-lg">
                View Proposal <ExternalLink size={14} />
              </a>
              <button className="w-10 h-10 flex items-center justify-center text-[#64748B] active:text-[#1A1A2E] active:bg-[#F7F8FA] rounded-xl transition-all">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        ))}

        {deals.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-[#64748B]">
            <DollarSign size={48} className="mb-6 opacity-20" />
            <p className="font-serif italic text-lg text-center">No active deals in pipeline.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsManager;
