import React from 'react';

interface LeadScoreBarProps {
  score: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'bg-emerald-500';
  if (score >= 7) return 'bg-[#FF9F1C]';
  if (score >= 5) return 'bg-amber-500';
  if (score >= 3) return 'bg-blue-400';
  return 'bg-gray-300';
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Hot';
  if (score >= 7) return 'Strong';
  if (score >= 5) return 'Good';
  if (score >= 3) return 'Moderate';
  if (score >= 1) return 'Low';
  return '—';
}

function getScoreTooltip(score: number): string {
  if (score >= 9) return 'No website / unreachable — highest priority';
  if (score >= 7) return 'Website exists but major issues — very likely to buy';
  if (score >= 5) return 'Decent website but missing SEO/city pages — good prospect';
  if (score >= 3) return 'Okay website, missing AEO — moderate prospect';
  if (score >= 1) return 'Good website — lower priority';
  return 'Not yet scored';
}

const LeadScoreBar: React.FC<LeadScoreBarProps> = ({ score, size = 'sm', showLabel = false }) => {
  if (score === 0) return <span className="text-[10px] text-[#ccc]">—</span>;

  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const width = size === 'sm' ? 'w-12' : 'w-20';

  return (
    <div className="flex items-center gap-1.5" title={getScoreTooltip(score)}>
      <span className={`text-[10px] font-bold ${score >= 7 ? 'text-[#FF9F1C]' : 'text-[#64748B]'}`}>
        {score}
      </span>
      <div className={`${width} bg-gray-100 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${getScoreColor(score)} ${height} rounded-full transition-all`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-[10px] font-semibold ${score >= 7 ? 'text-[#FF9F1C]' : 'text-[#94A3B8]'}`}>
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
};

export default LeadScoreBar;
