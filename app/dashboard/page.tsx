"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Package,
  BarChart3,
  Radar,
  Building2,
  TrendingUp,
  ListTodo,
  PieChart,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
}

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

type WidgetType = "follow_ups_pending" | "weekly_agenda" | "progress_tracker";

interface Widget {
  id: string;
  type: WidgetType;
  name: string;
  description: string;
  icon: React.ElementType;
}

const AVAILABLE_WIDGETS: Widget[] = [
  {
    id: "follow_ups_pending",
    type: "follow_ups_pending",
    name: "Total Follow-ups Pending",
    description: "Shows the total number of follow-ups that need action",
    icon: ListTodo,
  },
  {
    id: "weekly_agenda",
    type: "weekly_agenda",
    name: "This Week's Agenda",
    description: "List of companies due for contact this week",
    icon: Calendar,
  },
  {
    id: "progress_tracker",
    type: "progress_tracker",
    name: "Progress Tracker",
    description: "Circular progress showing Done vs Remaining for the week",
    icon: PieChart,
  },
];

export default function DashboardPage() {
  const pathname = usePathname();

  // State
  const [loading, setLoading] = useState(true);
  const [pinnedWidgets, setPinnedWidgets] = useState<WidgetType[]>([]);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [insights, setInsights] = useState<ExtractedInsight[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [calls, setCalls] = useState<CallTranscript[]>([]);

  const menuItems = [
    { name: "Meetings", href: "/", icon: BarChart3 },
    { name: "Pain Points", href: "/pain-points", icon: AlertCircle },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Product Vault", href: "/product-vault", icon: Package },
    { name: "Radar", href: "/radar", icon: Radar },
  ];

  // Load data on mount
  useEffect(() => {
    loadAllData();
    // Load pinned widgets from localStorage
    const saved = localStorage.getItem("cerebro_pinned_widgets");
    if (saved) {
      try {
        setPinnedWidgets(JSON.parse(saved));
      } catch {
        setPinnedWidgets([]);
      }
    }
  }, []);

  // Save pinned widgets to localStorage
  useEffect(() => {
    localStorage.setItem("cerebro_pinned_widgets", JSON.stringify(pinnedWidgets));
  }, [pinnedWidgets]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const companiesRes = await fetch("/api/get-companies", { cache: "no-store" });
      if (!companiesRes.ok) throw new Error("Failed to fetch companies");
      const companiesData = await companiesRes.json();
      const companiesList: Company[] = companiesData.companies || [];
      setCompanies(companiesList);

      const allInsights: ExtractedInsight[] = [];
      const allCalls: CallTranscript[] = [];

      for (const company of companiesList) {
        try {
          const analysisRes = await fetch(
            `/api/get-company-analysis?company_name=${encodeURIComponent(company.name)}`
          );
          if (analysisRes.ok) {
            const data = await analysisRes.json();
            allCalls.push(...(data.calls || []));
            allInsights.push(...(data.insights || []));
          }
        } catch (err) {
          console.error(`Error fetching data for company ${company.name}:`, err);
        }
      }

      setInsights(allInsights);
      setCalls(allCalls);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Follow-ups pending (status is to_do or no status)
    const pendingFollowUps = insights.filter(
      (i) => !i.status || i.status === "to_do"
    ).length;

    // This week's agenda - insights with follow_up_date this week or urgent ones
    const thisWeekItems = insights.filter((i) => {
      if (i.follow_up_date) {
        const followUpDate = new Date(i.follow_up_date);
        return followUpDate >= startOfWeek && followUpDate <= endOfWeek;
      }
      // Include high urgency items without dates
      return i.urgency_level >= 4 && (!i.status || i.status === "to_do");
    });

    // Progress - completed vs remaining this week
    const completedThisWeek = insights.filter((i) => {
      if (i.status === "proceed" || i.status === "sales_loss" || i.status === "scheduled_call") {
        const createdDate = new Date(i.created_at);
        return createdDate >= startOfWeek && createdDate <= endOfWeek;
      }
      return false;
    }).length;

    const totalThisWeek = thisWeekItems.length + completedThisWeek;
    const progressPercent = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;

    // Get company names for agenda items
    const agendaItems = thisWeekItems.slice(0, 5).map((insight) => {
      const call = calls.find((c) => c.id === insight.call_id);
      const company = companies.find((co) => {
        // Match by checking if any call from this company matches
        return calls.some((c) => c.id === insight.call_id);
      });
      return {
        insight,
        companyName: company?.name || "Unknown Company",
        callDate: call?.call_date || insight.created_at,
      };
    });

    return {
      pendingFollowUps,
      agendaItems,
      completedThisWeek,
      remainingThisWeek: thisWeekItems.length,
      progressPercent,
    };
  }, [insights, calls, companies]);

  // Toggle widget
  const toggleWidget = (type: WidgetType) => {
    setPinnedWidgets((prev) =>
      prev.includes(type) ? prev.filter((w) => w !== type) : [...prev, type]
    );
  };

  // Remove widget
  const removeWidget = (type: WidgetType) => {
    setPinnedWidgets((prev) => prev.filter((w) => w !== type));
  };

  // Render individual widget
  const renderWidget = (type: WidgetType) => {
    switch (type) {
      case "follow_ups_pending":
        return (
          <div className="rounded-2xl border border-slate-800/80 bg-base-100 p-6 shadow-card hover:shadow-card-hover transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-accent/15 p-3">
                  <ListTodo className="h-6 w-6 text-accent-light" />
                </div>
                <h3 className="font-display text-sm font-semibold text-slate-200">
                  Total Follow-ups Pending
                </h3>
              </div>
              <button
                onClick={() => removeWidget("follow_ups_pending")}
                className="p-1.5 rounded-lg hover:bg-base-200 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-bold text-white">
                {metrics.pendingFollowUps}
              </span>
              <span className="text-slate-500 text-sm mb-2">items</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Insights requiring follow-up action
            </p>
          </div>
        );

      case "weekly_agenda":
        return (
          <div className="rounded-2xl border border-slate-800/80 bg-base-100 p-6 shadow-card hover:shadow-card-hover transition-all duration-300 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-warning/15 p-3">
                  <Calendar className="h-6 w-6 text-warning-light" />
                </div>
                <h3 className="font-display text-sm font-semibold text-slate-200">
                  This Week&apos;s Agenda
                </h3>
              </div>
              <button
                onClick={() => removeWidget("weekly_agenda")}
                className="p-1.5 rounded-lg hover:bg-base-200 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {metrics.agendaItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                <p className="text-sm text-slate-400">All caught up this week!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.agendaItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 border border-slate-800/50 hover:bg-base-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-base-300 p-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{item.companyName}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">
                          {item.insight.pain_point_description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                          item.insight.urgency_level >= 4
                            ? "bg-urgent/15 text-urgent-light border border-urgent/30"
                            : item.insight.urgency_level === 3
                            ? "bg-warning/15 text-warning-light border border-warning/30"
                            : "bg-success/15 text-success-light border border-success/30"
                        }`}
                      >
                        {item.insight.urgency_level >= 4 ? "High" : item.insight.urgency_level === 3 ? "Med" : "Low"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "progress_tracker":
        return (
          <div className="rounded-2xl border border-slate-800/80 bg-base-100 p-6 shadow-card hover:shadow-card-hover transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-success/15 p-3">
                  <TrendingUp className="h-6 w-6 text-success-light" />
                </div>
                <h3 className="font-display text-sm font-semibold text-slate-200">
                  Progress Tracker
                </h3>
              </div>
              <button
                onClick={() => removeWidget("progress_tracker")}
                className="p-1.5 rounded-lg hover:bg-base-200 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Circular Progress */}
            <div className="flex flex-col items-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-base-300"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    className="text-success"
                    strokeDasharray={`${metrics.progressPercent * 3.52} 352`}
                    style={{
                      transition: "stroke-dasharray 0.5s ease-in-out",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-white">
                    {metrics.progressPercent}%
                  </span>
                  <span className="text-xs text-slate-500">Complete</span>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-xs text-slate-400">Done ({metrics.completedThisWeek})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-base-300" />
                  <span className="text-xs text-slate-400">Remaining ({metrics.remainingThisWeek})</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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
          <span className="text-xs text-slate-500 font-mono">Trust = Revenue</span>
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
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-base bg-grid flex flex-col overflow-hidden relative">
          <div className="flex items-center justify-between border-b border-slate-800/50 bg-base-50/80 backdrop-blur-sm px-6 py-3">
            <h2 className="font-display text-sm font-semibold text-slate-200 tracking-wide flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-accent" />
              My Dashboard
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {pinnedWidgets.length} widget{pinnedWidgets.length !== 1 ? "s" : ""} pinned
            </span>
          </div>

          {/* Dashboard Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                  <Loader2 className="h-10 w-10 animate-spin text-accent relative z-10" />
                </div>
                <span className="mt-4 text-sm text-slate-400">Loading dashboard...</span>
                <div className="flex gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent typing-dot" />
                </div>
              </div>
            ) : pinnedWidgets.length === 0 ? (
              /* Empty State - Enhanced */
              <div className="h-full flex flex-col items-center justify-center relative">
                {/* Decorative background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="rounded-2xl bg-gradient-to-br from-base-200 to-base-300 p-8 mb-6 shadow-lg empty-state-icon">
                    <LayoutDashboard className="h-16 w-16 text-slate-400" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white mb-3">
                    Your Dashboard is Empty
                  </h2>
                  <p className="text-sm text-slate-400 max-w-md text-center mb-8 leading-relaxed">
                    Pin widgets to your dashboard to track key metrics at a glance.
                    Click the &ldquo;+&rdquo; button to get started.
                  </p>
                  <button
                    onClick={() => setShowWidgetModal(true)}
                    className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-semibold text-sm hover:shadow-glow-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                    Add Your First Widget
                  </button>
                </div>
              </div>
            ) : (
              /* Widget Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pinnedWidgets.map((type) => (
                  <div key={type} className={type === "weekly_agenda" ? "lg:col-span-2" : ""}>
                    {renderWidget(type)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Add Button */}
          <button
            onClick={() => setShowWidgetModal(true)}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-white shadow-glow-md hover:shadow-glow-lg hover:bg-accent-dark transition-all duration-300 flex items-center justify-center group"
          >
            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Widget Library Modal */}
          {showWidgetModal && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-base/80 backdrop-blur-sm z-40 animate-fade-in"
                onClick={() => setShowWidgetModal(false)}
              />
              {/* Modal */}
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg">
                <div className="rounded-2xl border border-slate-800/80 bg-base-100 shadow-lift overflow-hidden animate-scale-in">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/50 px-6 py-4">
                    <h3 className="font-display text-lg font-semibold text-white">Widget Library</h3>
                    <button
                      onClick={() => setShowWidgetModal(false)}
                      className="p-2 rounded-lg hover:bg-base-200 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Widget List */}
                  <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {AVAILABLE_WIDGETS.map((widget) => {
                      const isPinned = pinnedWidgets.includes(widget.type);
                      const Icon = widget.icon;

                      return (
                        <div
                          key={widget.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                            isPinned
                              ? "bg-accent/10 border-accent/30"
                              : "bg-base-200/50 border-slate-800/50 hover:bg-base-200 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`rounded-xl p-3 ${isPinned ? "bg-accent/20" : "bg-base-300"}`}>
                              <Icon className={`h-5 w-5 ${isPinned ? "text-accent-light" : "text-slate-400"}`} />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-200">{widget.name}</h4>
                              <p className="text-xs text-slate-500">{widget.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleWidget(widget.type)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              isPinned
                                ? "bg-urgent/15 text-urgent-light border border-urgent/30 hover:bg-urgent/25"
                                : "bg-accent/15 text-accent-light border border-accent/30 hover:bg-accent/25"
                            }`}
                          >
                            {isPinned ? "Unpin" : "Pin"}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-slate-800/50 px-6 py-4 bg-base-50/50">
                    <p className="text-xs text-slate-500 text-center">
                      Pinned widgets will appear on your dashboard
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
