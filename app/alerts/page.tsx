"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Package,
  BarChart3,
  Radar,
  LayoutDashboard,
  User,
  ArrowUpDown,
  Tag,
  Zap,
} from "lucide-react";

interface CallTranscript {
  id: string;
  transcript_text: string;
  customer_name?: string;
  call_summary?: string;
  call_date: string;
  created_at: string;
  company_name?: string;
}

interface ExtractedInsight {
  id: string;
  call_id: string;
  pain_point_description: string;
  raw_quote?: string;
  urgency_level: number;
  mentioned_timeline?: string;
  follow_up_date?: string;
  status?: string;
  person_mentioned?: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

interface CallWithInsights {
  call: CallTranscript;
  company: Company;
  insights: ExtractedInsight[];
  participantCount: number;
}

// Local state for follow-up dates and statuses (would be persisted in real app)
interface LocalInsightState {
  [insightId: string]: {
    followUpDate?: string;
    status?: string;
  };
}

const STATUS_OPTIONS = [
  { value: "to_do", label: "To Do", color: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  { value: "scheduled_call", label: "Scheduled Call", color: "text-accent-light bg-accent/10 border-accent/30" },
  { value: "proceed", label: "Proceed", color: "text-success bg-success/10 border-success/30" },
  { value: "sales_loss", label: "Sales Loss", color: "text-urgent bg-urgent/10 border-urgent/30" },
];

// Sample product mapping (in a real app, this would come from a database)
const PRODUCT_MAPPING: { [keyword: string]: string } = {
  "integration": "API Suite",
  "automation": "AutoFlow Pro",
  "analytics": "Insights Pro",
  "reporting": "ReportHub",
  "data": "DataVault",
  "security": "SecureShield",
  "compliance": "ComplianceKit",
  "workflow": "WorkflowX",
  "dashboard": "DashBuilder",
  "notification": "AlertHub",
};

export default function AlertsPage() {
  const pathname = usePathname();

  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allCalls, setAllCalls] = useState<CallWithInsights[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [localState, setLocalState] = useState<LocalInsightState>({});
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const menuItems = [
    { name: "Meetings", href: "/", icon: BarChart3 },
    { name: "Companies", href: "/companies", icon: Building2 },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Product Vault", href: "/product-vault", icon: Package },
    { name: "Radar", href: "/radar", icon: Radar },
  ];

  // Simple participant counter based on transcript patterns
  const countParticipants = useCallback((transcript: string): number => {
    if (!transcript) return 2;
    const speakerMatches = transcript.match(/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?:/gm);
    if (speakerMatches) {
      const uniqueSpeakers = new Set(speakerMatches.map((s) => s.replace(":", "")));
      return Math.max(uniqueSpeakers.size, 2);
    }
    return 2;
  }, []);

  // Load all data on mount
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // First get all companies
      const companiesRes = await fetch("/api/get-companies", { cache: "no-store" });
      if (!companiesRes.ok) throw new Error("Failed to fetch companies");
      const companiesData = await companiesRes.json();
      const companiesList: Company[] = companiesData.companies || [];
      setCompanies(companiesList);

      // Then get calls and insights for each company
      const allCallsWithInsights: CallWithInsights[] = [];

      for (const company of companiesList) {
        try {
          const analysisRes = await fetch(
            `/api/get-company-analysis?company_name=${encodeURIComponent(company.name)}`
          );
          if (analysisRes.ok) {
            const data = await analysisRes.json();
            const calls: CallTranscript[] = data.calls || [];
            const insights: ExtractedInsight[] = data.insights || [];

            for (const call of calls) {
              const callInsights = insights.filter((i) => i.call_id === call.id);
              // Count unique speakers from transcript (simple heuristic)
              const participantCount = countParticipants(call.transcript_text);

              allCallsWithInsights.push({
                call: { ...call, company_name: company.name },
                company,
                insights: callInsights,
                participantCount,
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching data for company ${company.name}:`, err);
        }
      }

      setAllCalls(allCallsWithInsights);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [countParticipants]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Get the selected call data
  const selectedCallData = useMemo(() => {
    return allCalls.find((c) => c.call.id === selectedCallId);
  }, [allCalls, selectedCallId]);

  // Get sorted insights for the selected call
  const sortedInsights = useMemo(() => {
    if (!selectedCallData) return [];

    return [...selectedCallData.insights].sort((a, b) => {
      // Sort by timeline - parse the timeline string
      const getTimelinePriority = (timeline?: string): number => {
        if (!timeline) return 999;
        const lower = timeline.toLowerCase();
        if (lower.includes("immediate") || lower.includes("asap") || lower.includes("urgent")) return 1;
        if (lower.includes("week")) return 2;
        if (lower.includes("month")) return 3;
        if (lower.includes("quarter")) return 4;
        if (lower.includes("year")) return 5;
        return 10;
      };

      const priorityA = getTimelinePriority(a.mentioned_timeline);
      const priorityB = getTimelinePriority(b.mentioned_timeline);

      return sortDirection === "asc" ? priorityA - priorityB : priorityB - priorityA;
    });
  }, [selectedCallData, sortDirection]);

  // Map pain point to products based on keywords
  const getMappedProducts = (painPoint: string): string[] => {
    const products: string[] = [];
    const lowerPainPoint = painPoint.toLowerCase();

    for (const [keyword, product] of Object.entries(PRODUCT_MAPPING)) {
      if (lowerPainPoint.includes(keyword)) {
        products.push(product);
      }
    }

    return products.length > 0 ? products : ["General"];
  };

  // Update local state for an insight
  const updateInsightState = (insightId: string, field: "followUpDate" | "status", value: string) => {
    setLocalState((prev) => ({
      ...prev,
      [insightId]: {
        ...prev[insightId],
        [field]: value,
      },
    }));
  };

  // Get urgency styling
  const getUrgencyStyle = (urgency: number) => {
    if (urgency >= 4) return { bg: "bg-urgent/20", text: "text-urgent-light", border: "border-urgent/40", label: "High" };
    if (urgency === 3) return { bg: "bg-warning/20", text: "text-warning-light", border: "border-warning/40", label: "Med" };
    return { bg: "bg-success/20", text: "text-success-light", border: "border-success/40", label: "Low" };
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="flex h-screen flex-col bg-base text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800/50 bg-base-50 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/cerebro-logo.png"
            alt="Cerebro"
            width={24}
            height={24}
            className="h-6 w-6"
            priority
          />
          <span className="font-display text-lg font-semibold tracking-tight text-white">Cerebro</span>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navbar - Features */}
        <div className="w-64 border-r border-slate-800/50 bg-base-50 flex flex-col flex-shrink-0">
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-accent/15 text-accent-light border border-accent/20 shadow-glow-sm"
                        : "text-slate-400 hover:bg-base-200 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          {/* Tagline */}
          <div className="p-4 border-t border-slate-800/30">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600">
              Trust = Revenue
            </span>
          </div>
        </div>

        {/* Split View Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Call Feed */}
          <div className="w-80 border-r border-slate-800/50 bg-base-100 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between border-b border-slate-800/50 bg-base-50/80 backdrop-blur-sm px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-slate-200 tracking-wide flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" />
                Alerts Feed
              </h2>
              <span className="text-xs text-slate-500 font-mono">{allCalls.length} calls</span>
            </div>

            {/* Scrollable Call List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <span className="mt-3 text-sm text-slate-400">Loading calls...</span>
                </div>
              ) : allCalls.length === 0 ? (
                <div className="text-center py-12">
                  <div className="rounded-full bg-base-200 p-4 mx-auto w-fit mb-4">
                    <Bell className="h-8 w-8 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400">No calls found</p>
                </div>
              ) : (
                allCalls.map((item) => {
                  const isSelected = selectedCallId === item.call.id;
                  const painPointCount = item.insights.length;

                  return (
                    <button
                      key={item.call.id}
                      onClick={() => setSelectedCallId(item.call.id)}
                      className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
                        isSelected
                          ? "bg-accent/10 border-accent/30 shadow-glow-sm"
                          : "bg-base-200 border-slate-800/60 hover:bg-base-300 hover:border-slate-700"
                      }`}
                    >
                      {/* Company Name */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-500" />
                          <span className="font-display text-sm font-semibold text-slate-200 truncate max-w-[140px]">
                            {item.company.name}
                          </span>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "text-accent rotate-90" : "text-slate-600"}`} />
                      </div>

                      {/* Call Title/Summary */}
                      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                        {item.call.call_summary || item.call.customer_name || "Sales Call"}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.call.call_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {item.participantCount}
                        </span>
                      </div>

                      {/* Pain Points Badge */}
                      {painPointCount > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            painPointCount >= 3
                              ? "bg-urgent/15 text-urgent-light border border-urgent/30"
                              : "bg-warning/15 text-warning-light border border-warning/30"
                          }`}>
                            <AlertCircle className="h-3 w-3" />
                            {painPointCount} Pain Point{painPointCount !== 1 ? "s" : ""} Extracted
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Data Table */}
          <div className="flex-1 bg-base bg-grid flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/50 bg-base-50/80 backdrop-blur-sm px-6 py-3">
              <h2 className="font-display text-sm font-semibold text-slate-200 tracking-wide">
                {selectedCallData ? `Pain Points - ${selectedCallData.company.name}` : "Select a Call"}
              </h2>
              {selectedCallData && (
                <button
                  onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-base-200"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Timeline: {sortDirection === "asc" ? "Earliest" : "Latest"}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!selectedCallData ? (
                <div className="h-full flex flex-col items-center justify-center relative">
                  {/* Decorative background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="rounded-2xl bg-gradient-to-br from-base-200 to-base-300 p-8 mb-5 empty-state-icon">
                      <Bell className="h-14 w-14 text-slate-400" />
                    </div>
                    <p className="font-display text-xl font-bold text-white mb-2">
                      No Call Selected
                    </p>
                    <p className="text-sm text-slate-400 max-w-sm text-center leading-relaxed">
                      Select a call from the feed on the left to view extracted pain points and manage follow-ups
                    </p>
                  </div>
                </div>
              ) : sortedInsights.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center relative">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-warning/5 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="rounded-2xl bg-gradient-to-br from-base-200 to-base-300 p-8 mb-5 empty-state-icon">
                      <AlertCircle className="h-14 w-14 text-slate-400" />
                    </div>
                    <p className="font-display text-xl font-bold text-white mb-2">
                      No Pain Points Found
                    </p>
                    <p className="text-sm text-slate-400 max-w-sm text-center leading-relaxed">
                      This call has not had any pain points extracted yet
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800/80 bg-base-100 overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-base-50 border-b border-slate-800/80">
                        <tr>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Call Date
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Pain Point
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Mapped Products
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Key Stakeholder
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Timeline
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Urgency
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Follow-up Date
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {sortedInsights.map((insight) => {
                          const urgencyStyle = getUrgencyStyle(insight.urgency_level);
                          const mappedProducts = getMappedProducts(insight.pain_point_description);
                          const state = localState[insight.id] || {};
                          const currentStatus = state.status || insight.status || "to_do";
                          const statusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];

                          return (
                            <tr key={insight.id} className="table-row-hover transition-colors group">
                              <td className="px-4 py-3.5 text-sm text-slate-400 font-mono whitespace-nowrap">
                                {formatDate(selectedCallData.call.call_date)}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-200 max-w-xs">
                                <p className="line-clamp-3">{insight.pain_point_description}</p>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {mappedProducts.map((product) => (
                                    <span
                                      key={product}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-accent/10 text-accent-light border border-accent/20"
                                    >
                                      <Tag className="h-2.5 w-2.5" />
                                      {product}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-400 whitespace-nowrap">
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-slate-500" />
                                  {insight.person_mentioned || "Unknown"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-400 whitespace-nowrap">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                                  {insight.mentioned_timeline || "N/A"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${urgencyStyle.bg} ${urgencyStyle.text} ${urgencyStyle.border} ${insight.urgency_level >= 4 ? 'urgency-high-pulse' : ''}`}
                                >
                                  {urgencyStyle.label}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <input
                                  type="date"
                                  value={state.followUpDate || insight.follow_up_date || ""}
                                  onChange={(e) => updateInsightState(insight.id, "followUpDate", e.target.value)}
                                  className="rounded-lg border border-slate-700 bg-base-200 px-2.5 py-1.5 text-xs text-slate-200 focus:border-accent/50 focus:outline-none focus:shadow-glow-sm transition-all cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <select
                                  value={currentStatus}
                                  onChange={(e) => updateInsightState(insight.id, "status", e.target.value)}
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:shadow-glow-sm transition-all cursor-pointer ${statusOption.color} bg-transparent`}
                                >
                                  {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value} className="bg-base-200 text-slate-200">
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
