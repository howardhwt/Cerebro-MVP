"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Loader2,
  AlertCircle,
  Building2,
  RefreshCw,
  BarChart3,
  Package,
  ChevronDown,
  LayoutDashboard,
  Clock,
  User,
  Tag,
  ArrowUpDown,
} from "lucide-react";

interface CallTranscript {
  id: string;
  transcript_text: string;
  customer_name?: string;
  call_summary?: string;
  call_date: string;
  created_at: string;
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

// Local state for follow-up dates and statuses
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

// Sample product mapping
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

export default function CompaniesPage() {
  const pathname = usePathname();

  // State
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [refreshingCompanies, setRefreshingCompanies] = useState(false);
  const [queriedTranscripts, setQueriedTranscripts] = useState<CallTranscript[]>([]);
  const [queriedInsights, setQueriedInsights] = useState<ExtractedInsight[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [localState, setLocalState] = useState<LocalInsightState>({});
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Meetings", href: "/", icon: BarChart3 },
    { name: "Companies", href: "/companies", icon: Building2 },
    { name: "Product Vault", href: "/product-vault", icon: Package },
  ];

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async (showLoading = false) => {
    if (showLoading) {
      setRefreshingCompanies(true);
    }
    try {
      const response = await fetch("/api/get-companies", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.companies && data.companies.length > 0) {
          setCompanies(data.companies);
        } else {
          setCompanies([]);
        }
      }
    } catch (err) {
      console.error("Error loading companies:", err);
    } finally {
      if (showLoading) {
        setRefreshingCompanies(false);
      }
    }
  };

  const queryCompanyAnalysis = async (companyName: string) => {
    if (!companyName) {
      return;
    }

    setQueryLoading(true);
    try {
      const response = await fetch(`/api/get-company-analysis?company_name=${encodeURIComponent(companyName)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch company analysis: ${response.statusText}`);
      }

      const data = await response.json();
      setQueriedTranscripts(data.calls || []);
      setQueriedInsights(data.insights || []);
      setSelectedCallId(null);
    } catch (err) {
      console.error("Error querying company analysis:", err);
      setQueriedTranscripts([]);
      setQueriedInsights([]);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCompanySelect = (companyName: string) => {
    setSelectedCompanyName(companyName);
    if (companyName) {
      queryCompanyAnalysis(companyName);
    } else {
      setQueriedTranscripts([]);
      setQueriedInsights([]);
      setSelectedCallId(null);
    }
  };

  // Get filtered and sorted insights
  const sortedInsights = useMemo(() => {
    let filtered = selectedCallId
      ? queriedInsights.filter((insight) => insight.call_id === selectedCallId)
      : queriedInsights;

    return [...filtered].sort((a, b) => {
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
  }, [queriedInsights, selectedCallId, sortDirection]);

  // Map pain point to products
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

        {/* Main Content */}
        <div className="flex-1 bg-base bg-grid flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/50 bg-base-50/80 backdrop-blur-sm px-6 py-3">
            <h2 className="font-display text-sm font-semibold text-slate-200 tracking-wide flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              Companies
            </h2>
            {selectedCompanyName && sortedInsights.length > 0 && (
              <button
                onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-base-200"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                Timeline: {sortDirection === "asc" ? "Earliest" : "Latest"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Company Selector */}
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    Select Company
                  </label>
                  <button
                    onClick={() => loadCompanies(true)}
                    disabled={refreshingCompanies}
                    className="p-1.5 rounded-lg hover:bg-base-200 disabled:opacity-50 transition-colors"
                    title="Refresh companies"
                  >
                    {refreshingCompanies ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedCompanyName}
                    onChange={(e) => handleCompanySelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-base-100 px-4 py-3 text-sm text-slate-200 focus:border-accent/50 focus:outline-none focus:shadow-glow-sm transition-all appearance-none pr-10"
                  >
                    <option value="">Select a company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Call Selector */}
              {selectedCompanyName && queriedTranscripts.length > 0 && (
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Filter by Call
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCallId || ""}
                      onChange={(e) => setSelectedCallId(e.target.value || null)}
                      className="w-full rounded-lg border border-slate-800 bg-base-100 px-4 py-3 text-sm text-slate-200 focus:border-accent/50 focus:outline-none focus:shadow-glow-sm appearance-none pr-10 transition-all"
                    >
                      <option value="">All calls</option>
                      {queriedTranscripts.map((call) => (
                        <option key={call.id} value={call.id}>
                          {call.call_date
                            ? new Date(call.call_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Date unknown"}
                          {call.customer_name ? ` - ${call.customer_name}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Pain Points Table */}
            {queryLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <span className="mt-4 text-sm text-slate-400">Loading company data...</span>
              </div>
            ) : !selectedCompanyName ? (
              <div className="rounded-2xl border border-slate-800/80 bg-base-100 p-16 text-center relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                  <div className="rounded-2xl bg-gradient-to-br from-base-200 to-base-300 p-6 mx-auto w-fit mb-5 empty-state-icon">
                    <Building2 className="h-12 w-12 text-slate-400" />
                  </div>
                  <p className="font-display text-xl font-bold text-white mb-3">
                    No company selected
                  </p>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Select a company from the dropdown above to view their pain points and manage follow-ups
                  </p>
                </div>
              </div>
            ) : sortedInsights.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-base-100 p-16 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-warning/5 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                  <div className="rounded-2xl bg-gradient-to-br from-base-200 to-base-300 p-6 mx-auto w-fit mb-5 empty-state-icon">
                    <AlertCircle className="h-12 w-12 text-slate-400" />
                  </div>
                  <p className="font-display text-xl font-bold text-white mb-3">
                    {selectedCallId ? "No pain points found for this call" : "No pain points found"}
                  </p>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {selectedCallId
                      ? "This call doesn't have any extracted pain points yet"
                      : `No pain points have been extracted for ${selectedCompanyName} yet`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-200">
                    {selectedCallId ? "Pain Points for Selected Call" : `All Pain Points`}
                  </h3>
                  <span className="font-mono text-xs text-slate-500 bg-base-200 px-2.5 py-1 rounded-md">
                    {sortedInsights.length} pain point{sortedInsights.length !== 1 ? "s" : ""}
                  </span>
                </div>
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
                          const call = queriedTranscripts.find((c) => c.id === insight.call_id);
                          const urgencyStyle = getUrgencyStyle(insight.urgency_level);
                          const mappedProducts = getMappedProducts(insight.pain_point_description);
                          const state = localState[insight.id] || {};
                          const currentStatus = state.status || insight.status || "to_do";
                          const statusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];

                          return (
                            <tr key={insight.id} className="table-row-hover transition-colors group">
                              <td className="px-4 py-3.5 text-sm text-slate-400 font-mono whitespace-nowrap">
                                {call?.call_date ? formatDate(call.call_date) : "N/A"}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
