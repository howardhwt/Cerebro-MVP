"use client";

import { Calendar, Ticket } from "lucide-react";

interface PainPoint {
  id: string;
  painPoint: string;
  urgency: number; // 1-5
  mentionedTimeline?: string;
  rawQuote?: string; // Added to interface to match usage
}

interface PainPointCardProps {
  painPoint: PainPoint;
}

export default function PainPointCard({ painPoint }: PainPointCardProps) {
  // Map urgency (1-5) to colors and labels
  const getUrgencyConfig = (urgency: number) => {
    if (urgency >= 4) {
      return {
        borderClass: "border-t-red-500",
        badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
        label: "CRITICAL",
      };
    } else if (urgency === 3) {
      return {
        borderClass: "border-t-amber-500",
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        label: "MEDIUM",
      };
    } else {
      return {
        borderClass: "border-t-blue-500",
        badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        label: "LOW",
      };
    }
  };

  const config = getUrgencyConfig(painPoint.urgency);

  return (
    <div className={`flex flex-col gap-3 rounded bg-[#112240] p-4 border border-white/5 border-t-2 ${config.borderClass} hover:bg-[#152748] transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            ID: {painPoint.id.slice(0, 8)}
          </span>
          <h3 className="text-sm font-medium leading-relaxed text-slate-200">
            {painPoint.painPoint}
          </h3>
        </div>
        <div className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold border ${config.badgeClass}`}>
          <span>{config.label}</span>
        </div>
      </div>

      {painPoint.rawQuote && (
        <div className="mt-1 rounded bg-black/20 p-2 font-mono text-xs text-slate-400">
          &gt; &quot;{painPoint.rawQuote}&quot;
        </div>
      )}

      {painPoint.mentionedTimeline && (
        <div className="mt-auto flex items-center gap-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Ticket className="h-3 w-3" />
            <span className="font-mono">TICKET-{painPoint.id.slice(0, 4)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-brand-400 ml-auto">
            <Calendar className="h-3 w-3" />
            <span className="font-mono text-[10px] uppercase">ETA: {painPoint.mentionedTimeline}</span>
          </div>
        </div>
      )}
    </div>
  );
}
