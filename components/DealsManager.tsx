
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
      case DealStage.CALL_BOOKED: return 'text-[#B8860B] bg-[#B8860B]/10 border-[#B8860B]/20';
      default: return 'text-[#86868B] bg-[#E8E8E8] border-black/5';
    }
  };

  return (
    <div className="space-y-10 animate-reveal pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-serif font-bold text-[#1D1D1F] tracking-tight">Deal flow</h2>
          <p className="text-[#86868B] mt-2 font-medium tracking-wide uppercase text-xs">Tracking active capital deployments and decision timelines</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-black/5 rounded-2xl text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all shadow-sm">
            <Filter size={16} /> Filter
          </button>
          <button className="flex items-center gap-2 px-8 py-3 luminous-button-gold rounded-2xl text-sm font-bold shadow-lg shadow-[#B8860B]/20">
            <Plus size={18} /> New Deal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {deals.map((deal) => (
          <div key={deal.id} className="luminous-card bg-white/80 p-6 space-y-6 group hover:translate-y--1 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#1D1D1F] group-hover:text-[#B8860B] transition-colors">{deal.offerName}</h3>
                <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-tighter">REF: {deal.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStageColor(deal.stage)}`}>
                {deal.stage}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center border border-black/5">
                  <DollarSign size={14} className="text-[#1D9D60]" />
                </div>
                <span className="text-lg font-serif font-bold text-[#1D1D1F]">${deal.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center border border-black/5">
                  <Calendar size={14} className="text-[#86868B]" />
                </div>
                <span className="text-sm font-bold text-[#6E6E73]">{new Date(deal.sentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-[#F5F5F7] flex items-center justify-between">
              <a
                href={deal.proposalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-[#0066CC] hover:underline"
              >
                View Manifest <ExternalLink size={14} />
              </a>
              <button className="p-2 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition-all">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        ))}

        {deals.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-[#86868B]">
            <DollarSign size={48} className="mb-6 opacity-20" />
            <p className="font-serif italic text-lg">No active deal flow detected in current quadrant.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsManager;
