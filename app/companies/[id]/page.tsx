"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Briefcase,
  Users,
  Phone,
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Loader2,
  ChevronRight,
  ExternalLink,
  Menu,
  X as XIcon,
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

interface Company {
  id: string;
  name: string;
  created_at: string;
}

type TabType = "summary" | "calls" | "painpoints";

const STATUS_OPTIONS = [
  { value: "to_do", label: "To Do", color: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  { value: "scheduled_call", label: "Scheduled Call", color: "text-accent-light bg-accent/10 border-accent/30" },
  { value: "proceed", label: "Proceed", color: "text-success bg-success/10 border-success/30" },
  { value: "sales_loss", label: "Sales Loss", color: "text-urgent bg-urgent/10 border-urgent/30" },
];

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

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [calls, setCalls] = useState<CallTranscript[]>([]);
  const [insights, setInsights] = useState<ExtractedInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [localState, setLocalState] = useState<{ [id: string]: { followUpDate?: string; status?: string } }>({});
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  const loadCompanyData = useCallback(async () => {
    try {
      // First get the company name
      const companiesRes = await fetch("/api/get-companies");
      const companiesData = await companiesRes.json();
      const foundCompany = companiesData.companies?.find((c: Company) => c.id === companyId);

      if (foundCompany) {
        setCompany(foundCompany);

        // Then get the analysis data
        const analysisRes = await fetch(
          `/api/get-company-analysis?company_name=${encodeURIComponent(foundCompany.name)}`
        );
        const analysisData = await analysisRes.json();

        setCalls(analysisData.calls || []);
        setInsights(analysisData.insights || []);
      }
    } catch (err) {
      console.error("Error loading company data:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId, loadCompanyData]);

  // Get most recent contact person
  const contactPerson = useMemo(() => {
    if (calls.length === 0) return null;
    const sortedCalls = [...calls].sort(
      (a, b) => new Date(b.call_date || b.created_at).getTime() - new Date(a.call_date || a.created_at).getTime()
    );
    return sortedCalls[0].customer_name || null;
  }, [calls]);

  // Get last contact date
  const lastContactDate = useMemo(() => {
    if (calls.length === 0) return null;
    const sortedCalls = [...calls].sort(
      (a, b) => new Date(b.call_date || b.created_at).getTime() - new Date(a.call_date || a.created_at).getTime()
    );
    return sortedCalls[0].call_date || sortedCalls[0].created_at;
  }, [calls]);

  // Generate AI summary points based on insights
  const summaryPoints = useMemo(() => {
    const points: string[] = [];

    if (calls.length > 0) {
      const tenure = calls.length >= 5 ? "Long-standing" : calls.length >= 3 ? "Established" : "New";
      points.push(`${tenure} customer relationship with ${calls.length} recorded call${calls.length !== 1 ? "s" : ""} in the system.`);
    }

    const highUrgency = insights.filter((i) => i.urgency_level >= 4).length;
    if (highUrgency > 0) {
      points.push(`${highUrgency} high-urgency pain point${highUrgency !== 1 ? "s" : ""} requiring immediate attention.`);
    }

    const uniqueStakeholders = [...new Set(insights.map((i) => i.person_mentioned).filter(Boolean))];
    if (uniqueStakeholders.length > 0) {
      points.push(`Key stakeholders identified: ${uniqueStakeholders.slice(0, 3).join(", ")}${uniqueStakeholders.length > 3 ? ` and ${uniqueStakeholders.length - 3} more` : ""}.`);
    }

    const pendingFollowUps = insights.filter((i) => !i.status || i.status === "to_do").length;
    if (pendingFollowUps > 0) {
      points.push(`${pendingFollowUps} open item${pendingFollowUps !== 1 ? "s" : ""} requiring follow-up action.`);
    }

    if (points.length === 0) {
      points.push("No significant activity recorded yet. Upload call transcripts to generate insights.");
    }

    return points;
  }, [calls, insights]);

  // Get pain points count per call
  const getPainPointsCount = (callId: string) => {
    return insights.filter((i) => i.call_id === callId).length;
  };

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

  // Get urgency styling
  const getUrgencyStyle = (urgency: number) => {
    if (urgency >= 4) return { bg: "bg-urgent/20", text: "text-urgent-light", border: "border-urgent/40", label: "High" };
    if (urgency === 3) return { bg: "bg-warning/20", text: "text-warning-light", border: "border-warning/40", label: "Med" };
    return { bg: "bg-success/20", text: "text-success-light", border: "border-success/40", label: "Low" };
  };

  // Format date
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

  // Convert ISO timestamp to YYYY-MM-DD for date input
  const toDateInputValue = (dateStr?: string | null): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Update insight in local state and persist to Supabase
  const updateInsightState = async (insightId: string, field: "followUpDate" | "status", value: string) => {
    // Update local state immediately for responsive UI
    setLocalState((prev) => ({
      ...prev,
      [insightId]: {
        ...prev[insightId],
        [field]: value,
      },
    }));

    // Persist to Supabase
    try {
      const body: Record<string, string> = { insightId };
      if (field === "followUpDate") {
        body.followUpDate = value;
      } else if (field === "status") {
        body.status = value;
      }

      const response = await fetch("/api/update-insight", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to update insight:", errorData);
      }
    } catch (err) {
      console.error("Error persisting insight update:", err);
    }
  };

  // Determine customer status
  const customerStatus = useMemo(() => {
    const highUrgency = insights.filter((i) => i.urgency_level >= 4).length;
    if (highUrgency >= 3) return { label: "Churn Risk", color: "bg-urgent/20 text-urgent-light border-urgent/30" };
    if (calls.length >= 5) return { label: "Active", color: "bg-success/20 text-success-light border-success/30" };
    if (calls.length >= 2) return { label: "Engaged", color: "bg-accent/20 text-accent-light border-accent/30" };
    return { label: "Lead", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
  }, [calls, insights]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base text-slate-100">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <span className="mt-4 text-sm text-slate-400">Loading company details...</span>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-screen items-center justify-center bg-base text-slate-100">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-lg text-slate-300">Company not found</p>
          <Link href="/companies" className="text-accent-light hover:text-accent mt-2 inline-block">
            ← Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-base text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800/50 bg-base-50 px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/companies"
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Companies</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-base sm:text-lg font-semibold text-white truncate">{company.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileInfoOpen(!mobileInfoOpen)}
            className="lg:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-sm transition-all"
          >
            {mobileInfoOpen ? <XIcon className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="hidden sm:inline">Info</span>
          </button>
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-sm transition-all">
            <ExternalLink className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Sidebar - Account Profile */}
        <div className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800/50 bg-base-50 flex flex-col flex-shrink-0 overflow-y-auto ${mobileInfoOpen ? 'max-h-[50vh]' : 'max-h-0 lg:max-h-none'} lg:max-h-none transition-all duration-300`}>
          <div className="p-6 space-y-6">
            {/* Company Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center border border-accent/20">
                <span className="text-2xl font-bold text-accent-light">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-bold text-white truncate">
                  {company.name}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">Technology • Enterprise</p>
                <span className={`inline-flex mt-2 px-2.5 py-1 rounded-md text-xs font-semibold border ${customerStatus.color}`}>
                  {customerStatus.label}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-800/50" />

            {/* Account Details Section */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4 font-mono">
                Account Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Primary Contact</p>
                    <p className="text-sm text-slate-200 font-medium">{contactPerson || "Not identified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm text-slate-200 font-medium">
                      {contactPerson ? `${contactPerson.toLowerCase().replace(" ", ".")}@${company.name.toLowerCase().replace(/\s+/g, "")}.com` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Account Owner</p>
                    <p className="text-sm text-slate-200 font-medium">Sales Team</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Company Size</p>
                    <p className="text-sm text-slate-200 font-medium">50-200 employees</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Last Contact</p>
                    <p className="text-sm text-slate-200 font-medium">
                      {lastContactDate ? formatDate(lastContactDate) : "Never"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-800/50" />

            {/* Quick Stats */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4 font-mono">
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-100 rounded-lg p-3 border border-slate-800/50">
                  <p className="text-2xl font-bold text-white font-mono">{calls.length}</p>
                  <p className="text-xs text-slate-500">Total Calls</p>
                </div>
                <div className="bg-base-100 rounded-lg p-3 border border-slate-800/50">
                  <p className="text-2xl font-bold text-white font-mono">{insights.length}</p>
                  <p className="text-xs text-slate-500">Pain Points</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Tabbed Interface */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-800/50 bg-base-50/50 px-3 sm:px-6">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { id: "summary", label: "Summary", icon: Sparkles },
                { id: "calls", label: "Calls", icon: Phone },
                { id: "painpoints", label: "Pain Points", icon: AlertTriangle },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                      isActive
                        ? "border-accent text-accent-light"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.id === "painpoints" && insights.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-700 text-slate-300">
                        {insights.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                {/* AI Summary Card */}
                <div className="rounded-xl border border-slate-800/80 bg-base-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-accent/20 border border-purple-500/20">
                      <Sparkles className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">AI-Generated Summary</h3>
                      <p className="text-xs text-slate-500">Updated from latest call data</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {summaryPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-300 leading-relaxed">{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent Activity */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                      Recent Calls
                    </h3>
                    <button
                      onClick={() => setActiveTab("calls")}
                      className="text-xs text-accent-light hover:text-accent flex items-center gap-1"
                    >
                      View all calls
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {calls.slice(0, 3).map((call) => (
                      <div
                        key={call.id}
                        className="rounded-lg border border-slate-800/50 bg-base-100 p-4 hover:border-slate-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {call.call_summary?.split(".")[0] || "Call Recording"}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(call.call_date || call.created_at)}
                              </span>
                              {call.customer_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {call.customer_name}
                                </span>
                              )}
                            </div>
                          </div>
                          {getPainPointsCount(call.id) > 0 && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-warning/10 text-warning-light border border-warning/20">
                              {getPainPointsCount(call.id)} Pain Point{getPainPointsCount(call.id) !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Calls Tab */}
            {activeTab === "calls" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-200">
                    Call History
                  </h3>
                  <span className="font-mono text-xs text-slate-500 bg-base-200 px-2.5 py-1 rounded-md">
                    {calls.length} call{calls.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {calls.length === 0 ? (
                  <div className="rounded-xl border border-slate-800/80 bg-base-100 p-12 text-center">
                    <Phone className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No calls recorded yet</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800/80 bg-base-100 overflow-hidden">
                    {calls.map((call, idx) => (
                      <div
                        key={call.id}
                        className={`p-4 hover:bg-base-50/50 transition-colors ${
                          idx !== calls.length - 1 ? "border-b border-slate-800/50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-200">
                              {call.call_summary?.split(".")[0] || "Call Recording"}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1.5 font-mono">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(call.call_date || call.created_at)}
                              </span>
                              {call.customer_name && (
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" />
                                  {call.customer_name}
                                </span>
                              )}
                            </div>
                            {call.call_summary && (
                              <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                                {call.call_summary}
                              </p>
                            )}
                          </div>
                          {getPainPointsCount(call.id) > 0 && (
                            <span className="px-2.5 py-1 text-xs font-medium rounded bg-warning/10 text-warning-light border border-warning/20 flex-shrink-0 ml-4">
                              {getPainPointsCount(call.id)} Pain Point{getPainPointsCount(call.id) !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pain Points Tab */}
            {activeTab === "painpoints" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-200">
                    Pain Points Repository
                  </h3>
                  <span className="font-mono text-xs text-slate-500 bg-base-200 px-2.5 py-1 rounded-md">
                    {insights.length} pain point{insights.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {insights.length === 0 ? (
                  <div className="rounded-xl border border-slate-800/80 bg-base-100 p-12 text-center">
                    <AlertTriangle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No pain points extracted yet</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800/80 bg-base-100 overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-base-50 border-b border-slate-800/80">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                              Pain Point
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                              Products
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                              Stakeholder
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                              Urgency
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                              Follow-up
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {insights.map((insight) => {
                            const call = calls.find((c) => c.id === insight.call_id);
                            const urgencyStyle = getUrgencyStyle(insight.urgency_level);
                            const mappedProducts = getMappedProducts(insight.pain_point_description);
                            const state = localState[insight.id] || {};
                            const dbStatus = insight.status === "pending" ? "to_do" : insight.status;
                            const currentStatus = state.status ?? dbStatus ?? "to_do";
                            const statusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];

                            return (
                              <tr key={insight.id} className="table-row-hover transition-colors">
                                <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                                  {call?.call_date ? formatDate(call.call_date) : "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-200 max-w-[200px]">
                                  <p className="line-clamp-2">{insight.pain_point_description}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {mappedProducts.map((product) => (
                                      <span
                                        key={product}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent-light border border-accent/20"
                                      >
                                        <Tag className="h-2.5 w-2.5" />
                                        {product}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-slate-500" />
                                    {insight.person_mentioned || "Unknown"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold border ${urgencyStyle.bg} ${urgencyStyle.text} ${urgencyStyle.border}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      insight.urgency_level >= 4 ? "bg-urgent" : insight.urgency_level === 3 ? "bg-warning" : "bg-success"
                                    }`} />
                                    {urgencyStyle.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="date"
                                    value={state.followUpDate ?? toDateInputValue(insight.follow_up_date)}
                                    onChange={(e) => updateInsightState(insight.id, "followUpDate", e.target.value)}
                                    className="rounded border border-slate-700 bg-base-200 px-2 py-1 text-[11px] text-slate-200 focus:border-accent/50 focus:outline-none transition-all cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={currentStatus}
                                    onChange={(e) => updateInsightState(insight.id, "status", e.target.value)}
                                    className={`rounded border px-2 py-1 text-[11px] font-medium focus:outline-none transition-all cursor-pointer ${statusOption.color} bg-transparent`}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
