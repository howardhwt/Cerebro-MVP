"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Loader2,
  AlertCircle,
  Building2,
  Search,
  Calendar,
  RefreshCw,
  BarChart3,
  Package,
  Radar,
  ChevronDown,
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

export default function PainPointsPage() {
  const pathname = usePathname();

  // State
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [refreshingCompanies, setRefreshingCompanies] = useState(false);
  const [queriedTranscripts, setQueriedTranscripts] = useState<CallTranscript[]>([]);
  const [queriedInsights, setQueriedInsights] = useState<ExtractedInsight[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const menuItems = [
    {
      name: "Meetings",
      href: "/",
      icon: BarChart3,
    },
    {
      name: "Pain Points",
      href: "/pain-points",
      icon: AlertCircle,
    },
    {
      name: "Product Vault",
      href: "/product-vault",
      icon: Package,
    },
    {
      name: "Radar",
      href: "/radar",
      icon: Radar,
    },
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
      setSelectedCallId(null); // Reset selected call when loading new company
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

  // Get filtered insights based on selected call
  const getFilteredInsights = () => {
    if (selectedCallId) {
      return queriedInsights.filter((insight) => insight.call_id === selectedCallId);
    }
    return queriedInsights;
  };

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/cerebro-logo.png"
            alt="Cerebro"
            width={24}
            height={24}
            className="h-6 w-6"
            priority
          />
          <span className="text-base font-medium text-white">Cerebro</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navbar - Features */}
        <div className="w-64 border-r border-slate-700 bg-slate-900 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
        <div className="flex-1 border-r border-slate-700 bg-slate-900 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-200">Pain Points</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Company Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Select Company
                </label>
                <button
                  onClick={() => loadCompanies(true)}
                  disabled={refreshingCompanies}
                  className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-50"
                  title="Refresh companies"
                >
                  {refreshingCompanies ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
              <select
                value={selectedCompanyName}
                onChange={(e) => handleCompanySelect(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.name}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Call Selector */}
            {selectedCompanyName && queriedTranscripts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Select Call (Optional)
                </label>
                <div className="relative">
                  <select
                    value={selectedCallId || ""}
                    onChange={(e) => setSelectedCallId(e.target.value || null)}
                    className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-8"
                  >
                    <option value="">All calls</option>
                    {queriedTranscripts.map((call) => (
                      <option key={call.id} value={call.id}>
                        {call.call_date
                          ? new Date(call.call_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Date unknown"}
                        {call.customer_name ? ` - ${call.customer_name}` : ""}
                        {call.call_summary ? ` - ${call.call_summary.substring(0, 40)}...` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                {selectedCallId && (
                  <button
                    onClick={() => setSelectedCallId(null)}
                    className="text-xs text-slate-400 hover:text-slate-300 underline"
                  >
                    Show all pain points
                  </button>
                )}
              </div>
            )}

            {/* Pain Points Table */}
            {queryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-slate-300">Loading pain points...</span>
              </div>
            ) : !selectedCompanyName ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                <Building2 className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                <p className="text-sm font-medium text-slate-300 mb-2">
                  No company selected
                </p>
                <p className="text-xs text-slate-400">
                  Please select a company from the dropdown above to view pain points
                </p>
              </div>
            ) : getFilteredInsights().length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                <p className="text-sm font-medium text-slate-300 mb-2">
                  {selectedCallId ? "No pain points found for this call" : "No pain points found"}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedCallId
                    ? "This call doesn't have any extracted pain points yet"
                    : `No pain points have been extracted for ${selectedCompanyName} yet`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">
                    {selectedCallId ? "Pain Points for Selected Call" : `All Pain Points - ${selectedCompanyName}`}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {getFilteredInsights().length} pain point{getFilteredInsights().length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-900/50 border-b border-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Pain Point
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Person
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Timeline
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Urgency
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Quote
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {getFilteredInsights().map((insight) => {
                          const call = queriedTranscripts.find((c) => c.id === insight.call_id);
                          const callDate = call?.call_date 
                            ? new Date(call.call_date).toLocaleDateString()
                            : "N/A";
                          
                          const getUrgencyColor = (urgency: number) => {
                            if (urgency >= 4) return "text-red-400";
                            if (urgency === 3) return "text-yellow-400";
                            return "text-blue-400";
                          };

                          return (
                            <tr 
                              key={insight.id} 
                              className={`hover:bg-slate-800/30 align-top ${
                                selectedCallId && insight.call_id === selectedCallId 
                                  ? "bg-blue-900/10" 
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-sm text-slate-200 align-top">
                                {insight.pain_point_description}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400 align-top">
                                {insight.person_mentioned || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400 align-top">
                                {callDate}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400 align-top">
                                {insight.mentioned_timeline || "N/A"}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span className={`text-sm font-medium ${getUrgencyColor(insight.urgency_level)}`}>
                                  {insight.urgency_level}/5
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400 max-w-md align-top">
                                <p className="whitespace-normal break-words leading-relaxed">
                                  {insight.raw_quote || "N/A"}
                                </p>
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
