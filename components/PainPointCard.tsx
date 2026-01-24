"use client";

import { AlertCircle, Calendar, TrendingUp } from "lucide-react";

interface PainPoint {
  id: string;
  painPoint: string;
  urgency: number; // 1-5
  mentionedTimeline?: string;
}

interface PainPointCardProps {
  painPoint: PainPoint;
}

export default function PainPointCard({ painPoint }: PainPointCardProps) {
  // Map urgency (1-5) to colors and labels
  const getUrgencyStyle = (urgency: number) => {
    if (urgency >= 4) {
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-800",
        label: "High Urgency",
      };
    } else if (urgency === 3) {
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-800",
        label: "Medium Urgency",
      };
    } else {
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-800",
        label: "Low Urgency",
      };
    }
  };

  const urgencyStyle = getUrgencyStyle(painPoint.urgency);

  return (
    <div
      className={`rounded-lg border p-4 transition-all hover:shadow-md ${urgencyStyle.bg} ${urgencyStyle.border} ${urgencyStyle.text}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold text-lg">{painPoint.painPoint}</h3>
          </div>
          <div className="flex items-center gap-4 text-sm mt-3">
            {painPoint.mentionedTimeline && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{painPoint.mentionedTimeline}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{urgencyStyle.label}</span>
              <span className="ml-1 font-semibold">({painPoint.urgency}/5)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
