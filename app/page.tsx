"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import PainPointCard from "@/components/PainPointCard";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  AlertCircle,
  Building2,
  Search,
  Calendar,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface PainPoint {
  id: string;
  painPoint: string;
  urgency: number; // 1-5
  mentionedTimeline?: string;
  rawQuote?: string;
}

interface CallTranscript {
  id: string;
  transcript_text: string;
  customer_name?: string;
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
  created_at: string;
}

type TabType = "transcripts" | "painpoints";

export default function AnalysisPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("transcripts");

  // Input state
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query state
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [refreshingCompanies, setRefreshingCompanies] = useState(false);
  const [queriedTranscripts, setQueriedTranscripts] = useState<CallTranscript[]>([]);
  const [queriedInsights, setQueriedInsights] = useState<ExtractedInsight[]>([]);

  // Current extraction results (not saved yet)
  const [currentPainPoints, setCurrentPainPoints] = useState<PainPoint[]>([]);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async (showLoading = false) => {
    if (showLoading) {
      setRefreshingCompanies(true);
    }
    try {
      // Debug logging (only in development)
      if (process.env.NODE_ENV === "development") {
        console.log("Fetching companies from API...");
      }
      
      const response = await fetch("/api/get-companies", {
        cache: "no-store", // Prevent caching
      });
      
      if (process.env.NODE_ENV === "development") {
        console.log("Response status:", response.status, response.statusText);
      }
      
      if (response.ok) {
        const data = await response.json();
        
        if (process.env.NODE_ENV === "development") {
          console.log("API response data:", data);
          console.log("Loaded companies from API:", data.companies?.length || 0);
          console.log("Company names:", data.companies?.map((c: any) => c.name) || []);
        }
        
        if (data.companies && data.companies.length > 0) {
          setCompanies(data.companies);
        } else {
          console.warn("No companies in response, but API returned OK");
          setCompanies([]);
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to load companies:", errorData);
        setError(`Failed to load companies: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error loading companies:", err);
      setError(`Error loading companies: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (showLoading) {
        setRefreshingCompanies(false);
      }
    }
  };

  const extractAndSave = async () => {
    if (!text.trim()) {
      setError("Please provide some text to analyze");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentPainPoints([]);

    try {
      const response = await fetch("/api/analyze-and-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze and save transcript");
      }

      const data = await response.json();
      
      // Debug logging (only in development)
      if (process.env.NODE_ENV === "development") {
        console.log("Extract and save response:", {
          success: data.success,
          company_name: data.company_name,
          company_id: data.company_id,
          insights_count: data.count,
        });
      }
      
      // Convert insights to pain points format for display
      const painPoints: PainPoint[] = (data.insights || []).map((insight: any) => ({
        id: insight.id,
        painPoint: insight.pain_point_description,
        urgency: insight.urgency_level,
        mentionedTimeline: insight.mentioned_timeline,
        rawQuote: insight.raw_quote,
      }));

      setCurrentPainPoints(painPoints);
      
      // Reload companies list in case it's new
      await loadCompanies();
      
      // If this company is selected, reload its data
      if (selectedCompanyName === data.company_name) {
        await queryCompanyAnalysis(data.company_name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error extracting and saving:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const queryCompanyAnalysis = async (companyName: string) => {
    if (!companyName) return;

    setQueryLoading(true);
    try {
      const response = await fetch(`/api/get-company-analysis?company_name=${encodeURIComponent(companyName)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch company analysis");
      }

      const data = await response.json();
      setQueriedTranscripts(data.calls || []);
      setQueriedInsights(data.insights || []);
    } catch (err) {
      console.error("Error querying company analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCompanySelect = (companyName: string) => {
    setSelectedCompanyName(companyName);
    // Don't auto-fetch, wait for button click
  };

  const handleFetchAnalysis = () => {
    if (selectedCompanyName) {
      queryCompanyAnalysis(selectedCompanyName);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText.trim()) {
      setText(pastedText);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleFileUpload = async (file: File) => {
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        setText(content);
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a text file (.txt)");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Group insights by urgency
  const groupInsightsByUrgency = (insights: ExtractedInsight[]) => {
    const high = insights.filter((i) => i.urgency_level >= 4);
    const medium = insights.filter((i) => i.urgency_level === 3);
    const low = insights.filter((i) => i.urgency_level <= 2);
    return { high, medium, low };
  };

  // Group insights by timeline
  const groupInsightsByTimeline = (insights: ExtractedInsight[]) => {
    const withTimeline = insights.filter((i) => i.mentioned_timeline);
    const withoutTimeline = insights.filter((i) => !i.mentioned_timeline);
    
    // Further group by timeline value
    const timelineGroups: Record<string, ExtractedInsight[]> = {};
    withTimeline.forEach((insight) => {
      const timeline = insight.mentioned_timeline || "No timeline";
      if (!timelineGroups[timeline]) {
        timelineGroups[timeline] = [];
      }
      timelineGroups[timeline].push(insight);
    });
    
    return { withTimeline, withoutTimeline, timelineGroups };
  };

  const groupedQueriedInsights = groupInsightsByUrgency(queriedInsights);
  const timelineGroupedInsights = groupInsightsByTimeline(queriedInsights);

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full sm:ml-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Analysis</h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Upload transcripts, extract pain points, and query previous analyses
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-4 sm:mb-6 border-b border-slate-700">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab("transcripts")}
                className={`whitespace-nowrap border-b-2 py-3 sm:py-4 px-1 text-sm font-medium ${
                  activeTab === "transcripts"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                Call Transcripts
              </button>
              <button
                onClick={() => setActiveTab("painpoints")}
                className={`whitespace-nowrap border-b-2 py-3 sm:py-4 px-1 text-sm font-medium ${
                  activeTab === "painpoints"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                Extracted Painpoints and Timelines
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "transcripts" && (
            <div className="space-y-4 sm:space-y-6">
              {/* File Upload Zone */}
              <div
                className={`relative rounded-lg border-2 border-dashed p-6 sm:p-8 text-center ${
                  dragActive
                    ? "border-blue-500 bg-slate-800"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-400" />
                <p className="mt-4 text-sm font-medium text-slate-200">
                  Drop a file here or click to upload
                </p>
                <p className="mt-1 text-xs text-slate-400">Supports .txt files</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Select File
                </button>
              </div>

              {/* Text Area */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <label
                  htmlFor="text-input"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200"
                >
                  <FileText className="h-4 w-4" />
                  Paste transcript here
                </label>
                <textarea
                  id="text-input"
                  value={text}
                  onChange={handleTextChange}
                  onPaste={handlePaste}
                  placeholder="Paste customer call transcript, email, or notes here..."
                  className="h-64 w-full resize-none rounded-md border border-slate-600 bg-slate-900 p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {text && !isProcessing && (
                  <button
                    onClick={extractAndSave}
                    className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Extract Pain Points & Save to Database
                  </button>
                )}
              </div>

              {/* Processing State */}
              {isProcessing && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 p-8 sm:p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="mt-4 text-sm font-medium text-slate-200">
                    Processing and saving...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Extracting pain points and saving to database
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <p className="mt-2 text-sm font-medium text-red-400">{error}</p>
                </div>
              )}


            </div>
          )}

          {activeTab === "painpoints" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Company Selector for Pain Points */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label
                    htmlFor="painpoints-company-select"
                    className="flex items-center gap-2 text-sm font-medium text-slate-200"
                  >
                    <Building2 className="h-4 w-4" />
                    Select Company to View Pain Points
                  </label>
                  <button
                    onClick={() => loadCompanies(true)}
                    disabled={refreshingCompanies}
                    className="flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Refresh companies list"
                  >
                    {refreshingCompanies ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    id="painpoints-company-select"
                    value={selectedCompanyName}
                    onChange={(e) => handleCompanySelect(e.target.value)}
                    className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select a company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleFetchAnalysis}
                    disabled={!selectedCompanyName || queryLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title={!selectedCompanyName ? "Please select a company first" : "Fetch analysis"}
                  >
                    {queryLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {companies.length === 0
                    ? "No companies found. Extract pain points from a transcript first."
                    : "Select a company and click the search button to fetch analysis"}
                </p>
              </div>

              {queryLoading && (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-slate-300">Loading pain points...</span>
                </div>
              )}

              {!queryLoading && (
                <>
                  {/* Timeline Section - Always Visible */}
                  <div className="rounded-lg border-2 border-purple-700/50 bg-purple-900/20 p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-400" />
                      <h2 className="text-lg sm:text-xl font-semibold text-purple-200">
                        Pain Points by Timeline
                      </h2>
                      <span className="rounded-full bg-purple-800/50 px-2 py-1 text-xs font-medium text-purple-200">
                        {selectedCompanyName ? timelineGroupedInsights.withTimeline.length : 0} with timeline
                      </span>
                    </div>
                    {selectedCompanyName && timelineGroupedInsights.withTimeline.length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(timelineGroupedInsights.timelineGroups).map(([timeline, insights]: [string, ExtractedInsight[]]) => (
                          <div key={timeline} className="rounded-lg border border-purple-700/50 bg-slate-800/50 p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Calendar className="h-4 w-4 text-purple-400" />
                              <h3 className="font-semibold text-white">{timeline}</h3>
                              <span className="rounded-full bg-purple-800/50 px-2 py-1 text-xs font-medium text-purple-200">
                                {insights.length} pain point{insights.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {insights.map((insight) => (
                                <div
                                  key={insight.id}
                                  className="rounded border border-slate-700 bg-slate-800/30 p-3"
                                >
                                  <div className="mb-1 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-slate-400" />
                                    <span className="font-medium text-slate-200">
                                      {insight.pain_point_description}
                                    </span>
                                  </div>
                                  {insight.raw_quote && (
                                    <p className="mb-1 text-xs italic text-slate-400">
                                      &quot;{insight.raw_quote}&quot;
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                    <span>Urgency: {insight.urgency_level}/5</span>
                                    {insight.follow_up_date && (
                                      <span>
                                        Follow-up: {new Date(insight.follow_up_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {timelineGroupedInsights.withoutTimeline.length > 0 && (
                          <div className="rounded-lg border border-purple-700/50 bg-slate-800/50 p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <h3 className="font-semibold text-slate-300">No Timeline Mentioned</h3>
                              <span className="rounded-full bg-slate-700/50 px-2 py-1 text-xs font-medium text-slate-300">
                                {timelineGroupedInsights.withoutTimeline.length} pain point{timelineGroupedInsights.withoutTimeline.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {timelineGroupedInsights.withoutTimeline.map((insight) => (
                                <div
                                  key={insight.id}
                                  className="rounded border border-slate-700 bg-slate-800/30 p-3"
                                >
                                  <div className="mb-1 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-slate-400" />
                                    <span className="font-medium text-slate-200">
                                      {insight.pain_point_description}
                                    </span>
                                  </div>
                                  {insight.raw_quote && (
                                    <p className="mb-1 text-xs italic text-slate-400">
                                      &quot;{insight.raw_quote}&quot;
                                    </p>
                                  )}
                                  <div className="text-xs text-slate-400">
                                    Urgency: {insight.urgency_level}/5
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedCompanyName ? (
                      <p className="text-sm text-slate-400">
                        No pain points with timelines extracted yet for this company.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Select a company and click fetch to view timelines.
                      </p>
                    )}
                  </div>

                  {/* High Urgency Section - Always Visible */}
                  <div className="rounded-lg border-2 border-red-800/50 bg-red-900/20 p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-red-400" />
                      <h2 className="text-lg sm:text-xl font-semibold text-red-200">
                        High Urgency (4-5)
                      </h2>
                      <span className="rounded-full bg-red-800/50 px-2 py-1 text-xs font-medium text-red-200">
                        {selectedCompanyName ? groupedQueriedInsights.high.length : 0}
                      </span>
                    </div>
                    {selectedCompanyName && groupedQueriedInsights.high.length > 0 ? (
                      <div className="space-y-3">
                        {groupedQueriedInsights.high.map((insight) => (
                          <div
                            key={insight.id}
                            className="rounded-lg border border-red-800/50 bg-slate-800/50 p-4"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-red-400" />
                              <h3 className="font-semibold text-white">
                                {insight.pain_point_description}
                              </h3>
                            </div>
                            {insight.raw_quote && (
                              <p className="mb-2 text-sm italic text-slate-400">
                                &quot;{insight.raw_quote}&quot;
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              {insight.mentioned_timeline && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{insight.mentioned_timeline}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>Urgency: {insight.urgency_level}/5</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedCompanyName ? (
                      <p className="text-sm text-slate-400">
                        No high urgency pain points extracted yet for this company.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Select a company and click fetch to view high urgency pain points.
                      </p>
                    )}
                  </div>

                  {/* Medium Urgency Section - Always Visible */}
                  <div className="rounded-lg border-2 border-yellow-800/50 bg-yellow-900/20 p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-yellow-400" />
                      <h2 className="text-lg sm:text-xl font-semibold text-yellow-200">
                        Medium Urgency (3)
                      </h2>
                      <span className="rounded-full bg-yellow-800/50 px-2 py-1 text-xs font-medium text-yellow-200">
                        {selectedCompanyName ? groupedQueriedInsights.medium.length : 0}
                      </span>
                    </div>
                    {selectedCompanyName && groupedQueriedInsights.medium.length > 0 ? (
                      <div className="space-y-3">
                        {groupedQueriedInsights.medium.map((insight) => (
                          <div
                            key={insight.id}
                            className="rounded-lg border border-yellow-800/50 bg-slate-800/50 p-4"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-yellow-400" />
                              <h3 className="font-semibold text-white">
                                {insight.pain_point_description}
                              </h3>
                            </div>
                            {insight.raw_quote && (
                              <p className="mb-2 text-sm italic text-slate-400">
                                &quot;{insight.raw_quote}&quot;
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              {insight.mentioned_timeline && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{insight.mentioned_timeline}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>Urgency: {insight.urgency_level}/5</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedCompanyName ? (
                      <p className="text-sm text-slate-400">
                        No medium urgency pain points extracted yet for this company.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Select a company and click fetch to view medium urgency pain points.
                      </p>
                    )}
                  </div>

                  {/* Low Urgency Section - Always Visible */}
                  <div className="rounded-lg border-2 border-blue-800/50 bg-blue-900/20 p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      <h2 className="text-lg sm:text-xl font-semibold text-blue-200">
                        Low Urgency (1-2)
                      </h2>
                      <span className="rounded-full bg-blue-800/50 px-2 py-1 text-xs font-medium text-blue-200">
                        {selectedCompanyName ? groupedQueriedInsights.low.length : 0}
                      </span>
                    </div>
                    {selectedCompanyName && groupedQueriedInsights.low.length > 0 ? (
                      <div className="space-y-3">
                        {groupedQueriedInsights.low.map((insight) => (
                          <div
                            key={insight.id}
                            className="rounded-lg border border-blue-800/50 bg-slate-800/50 p-4"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-blue-400" />
                              <h3 className="font-semibold text-white">
                                {insight.pain_point_description}
                              </h3>
                            </div>
                            {insight.raw_quote && (
                              <p className="mb-2 text-sm italic text-slate-400">
                                &quot;{insight.raw_quote}&quot;
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              {insight.mentioned_timeline && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{insight.mentioned_timeline}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>Urgency: {insight.urgency_level}/5</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedCompanyName ? (
                      <p className="text-sm text-slate-400">
                        No low urgency pain points extracted yet for this company.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Select a company and click fetch to view low urgency pain points.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
