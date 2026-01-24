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
  const [companys, setcompanys] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrgName, setSelectedOrgName] = useState<string>("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [refreshingOrgs, setRefreshingOrgs] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [queriedTranscripts, setQueriedTranscripts] = useState<CallTranscript[]>([]);
  const [queriedInsights, setQueriedInsights] = useState<ExtractedInsight[]>([]);

  // Current extraction results (not saved yet)
  const [currentPainPoints, setCurrentPainPoints] = useState<PainPoint[]>([]);

  // Load companys on mount
  useEffect(() => {
    loadcompanys();
  }, []);

  const loadcompanys = async (showLoading = false) => {
    if (showLoading) {
      setRefreshingOrgs(true);
    }
    try {
      const response = await fetch("/api/get-companys", {
        cache: "no-store", // Prevent caching
      });

      if (response.ok) {
        const data = await response.json();
        if (data.companys && data.companys.length > 0) {
          setcompanys(data.companys);
        } else {
          setcompanys([]);
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to load companys:", errorData);
        setError(`Failed to load companys: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error loading companys:", err);
      setError(`Error loading companys: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (showLoading) {
        setRefreshingOrgs(false);
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

      // Convert insights to pain points format for display
      const painPoints: PainPoint[] = (data.insights || []).map((insight: any) => ({
        id: insight.id,
        painPoint: insight.pain_point_description,
        urgency: insight.urgency_level,
        mentionedTimeline: insight.mentioned_timeline,
        rawQuote: insight.raw_quote,
      }));

      setCurrentPainPoints(painPoints);

      // Reload companys list in case it's new
      await loadcompanys();

      // If this company is selected, reload its data
      if (selectedOrgName === data.company_name) {
        await querycompanyAnalysis(data.company_name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error extracting and saving:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const querycompanyAnalysis = async (orgName: string) => {
    if (!orgName) return;

    setQueryLoading(true);
    try {
      const response = await fetch(`/api/get-company-analysis?org_name=${encodeURIComponent(orgName)}`);
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

  const handlecompanySelect = (orgName: string) => {
    setSelectedOrgName(orgName);
  };

  const handleFetchAnalysis = () => {
    if (selectedOrgName) {
      querycompanyAnalysis(selectedOrgName);
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
    <div className="flex min-h-screen w-full flex-col bg-[#0a192f] text-slate-300 md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-4 md:p-8 lg:p-12">

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white mb-2">
              Analysis
            </h1>
            <p className="text-slate-400">
              Extract actionable insights from customer conversations.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8 flex space-x-6 border-b border-white/5">
            <button
              onClick={() => setActiveTab("transcripts")}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === "transcripts"
                ? "border-b-2 border-brand-500 text-white"
                : "text-slate-500 hover:text-slate-300"
                }`}
            >
              New Analysis
            </button>
            <button
              onClick={() => setActiveTab("painpoints")}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === "painpoints"
                ? "border-b-2 border-brand-500 text-white"
                : "text-slate-500 hover:text-slate-300"
                }`}
            >
              company Insights
            </button>
          </div>

          {/* Content Area */}
          <div>

            {/* NEW ANALYSIS TAB */}
            {activeTab === "transcripts" && (
              <div className="space-y-6">

                {/* Technical Input Section */}
                <div className="rounded-lg border border-white/10 bg-[#0d1f3a]">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
                    <span className="font-mono text-xs text-slate-500">INPUT_SOURCE: TRANSCRIPT</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-brand-400 hover:bg-brand-500/10 hover:text-brand-300 transition-colors"
                    >
                      <Upload className="h-3 w-3" />
                      <span>UPLOAD_FILE</span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <textarea
                    id="text-input"
                    value={text}
                    onChange={handleTextChange}
                    onPaste={handlePaste}
                    placeholder="// Paste transcript here or upload file..."
                    className="block min-h-[200px] w-full resize-y bg-transparent p-4 font-mono text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-0"
                  />

                  <div className="flex items-center justify-between border-t border-white/5 px-4 py-2 bg-[#0a192f]/50">
                    <span className="text-[10px] text-slate-600">
                      {text.length} CHARS
                    </span>
                    {text && !isProcessing && (
                      <button
                        onClick={extractAndSave}
                        className="flex items-center gap-2 rounded bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        RUN_ANALYSIS
                      </button>
                    )}
                  </div>
                </div>

                {/* Processing State */}
                {isProcessing && (
                  <div className="flex items-center justify-center rounded-lg border border-white/10 bg-[#112240] py-8 text-slate-300">
                    <Loader2 className="mr-3 h-4 w-4 animate-spin text-brand-500" />
                    <span className="font-mono text-xs">PROCESSING_DATA...</span>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/30">
                    <p>{error}</p>
                  </div>
                )}

                {/* IMMEDIATE RESULTS SECTION */}
                {currentPainPoints.length > 0 && !isProcessing && (
                  <div className="pt-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">Results Found</h2>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                        {currentPainPoints.length}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {currentPainPoints.map((pp) => (
                        <PainPointCard key={pp.id} painPoint={pp} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* company INSIGHTS TAB */}
            {activeTab === "painpoints" && (
              <div className="space-y-8">
                {/* Org Selector Card */}
                <div className="rounded-lg border border-white/10 bg-[#112240] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <label className="text-sm font-medium text-white">
                      Select company
                    </label>
                    <button
                      onClick={() => loadcompanys(true)}
                      disabled={refreshingOrgs}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshingOrgs ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <select
                        value={selectedOrgName}
                        onChange={(e) => handlecompanySelect(e.target.value)}
                        className="w-full appearance-none rounded bg-[#0a192f] border border-white/10 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="">Choose company...</option>
                        {companys.map((org) => (
                          <option key={org.id} value={org.name}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleFetchAnalysis}
                      disabled={!selectedOrgName || queryLoading}
                      className="rounded bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {queryLoading ? "Searching..." : "Fetch Results"}
                    </button>
                  </div>

                  {companys.length === 0 && (
                    <p className="mt-3 text-xs text-amber-400">
                      No companys found.
                    </p>
                  )}
                </div>

                {!queryLoading && selectedOrgName && (
                  <div className="space-y-8">

                    {/* High Urgency Section */}
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <h2 className="font-semibold text-white">Critical Issues</h2>
                      </div>

                      {groupedQueriedInsights.high.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {groupedQueriedInsights.high.map((insight) => (
                            <PainPointCard
                              key={insight.id}
                              painPoint={{
                                id: insight.id,
                                painPoint: insight.pain_point_description,
                                urgency: insight.urgency_level,
                                mentionedTimeline: insight.mentioned_timeline,
                                rawQuote: insight.raw_quote
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                          No critical issues found.
                        </div>
                      )}
                    </section>

                    {/* Timeline Analysis */}
                    <section>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <h2 className="font-semibold text-white">Timeline Analysis</h2>
                      </div>

                      <div className="space-y-6">
                        {Object.entries(timelineGroupedInsights.timelineGroups).map(([timeline, insights]) => (
                          <div key={timeline} className="border-l border-white/10 pl-4">
                            <h3 className="mb-3 text-sm font-bold text-slate-300">{timeline}</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {insights.map((insight) => (
                                <PainPointCard
                                  key={insight.id}
                                  painPoint={{
                                    id: insight.id,
                                    painPoint: insight.pain_point_description,
                                    urgency: insight.urgency_level,
                                    mentionedTimeline: insight.mentioned_timeline,
                                    rawQuote: insight.raw_quote
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Other Insights */}
                    {(groupedQueriedInsights.medium.length > 0 || groupedQueriedInsights.low.length > 0) && (
                      <section>
                        <div className="mb-4 mt-8 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <h2 className="font-semibold text-white">Additional Insights</h2>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {[...groupedQueriedInsights.medium, ...groupedQueriedInsights.low].map((insight) => (
                            <PainPointCard
                              key={insight.id}
                              painPoint={{
                                id: insight.id,
                                painPoint: insight.pain_point_description,
                                urgency: insight.urgency_level,
                                mentionedTimeline: insight.mentioned_timeline,
                                rawQuote: insight.raw_quote
                              }}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {!queryLoading && !selectedOrgName && (
                  <div className="rounded-lg border border-dashed border-white/10 p-12 text-center text-slate-500">
                    Select an company to view insights.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
