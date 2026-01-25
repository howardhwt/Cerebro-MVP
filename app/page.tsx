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
  Lock,
  CheckCircle2,
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
  
  // PIN gate state
  const [pin, setPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Query state
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [refreshingCompanies, setRefreshingCompanies] = useState(false);
  const [queriedTranscripts, setQueriedTranscripts] = useState<CallTranscript[]>([]);
  const [queriedInsights, setQueriedInsights] = useState<ExtractedInsight[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

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

  const verifyPin = () => {
    if (pin === "4321") {
      setPinVerified(true);
      setPinError(null);
      setPin(""); // Clear PIN for security
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPin("");
    }
  };

  const handlePinKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      verifyPin();
    }
  };

  const extractAndSave = async () => {
    if (!pinVerified) {
      setError("Please verify PIN before extracting pain points");
      return;
    }
    
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
    console.log("queryCompanyAnalysis called with:", companyName);
    if (!companyName) {
      console.warn("queryCompanyAnalysis: No company name provided");
      return;
    }

    setQueryLoading(true);
    setError(null); // Clear any previous errors
    const apiUrl = `/api/get-company-analysis?company_name=${encodeURIComponent(companyName)}`;
    console.log("Fetching from:", apiUrl);
    
    try {
      const response = await fetch(apiUrl);
      console.log("Response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", errorData);
        throw new Error(errorData.error || `Failed to fetch company analysis: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched company analysis:", {
        companyName,
        callsCount: data.calls?.length || 0,
        insightsCount: data.insights?.length || 0,
        fullResponse: data,
      });
      
      setQueriedTranscripts(data.calls || []);
      setQueriedInsights(data.insights || []);
      setSelectedCallId(null); // Reset selected call when loading new company data
      
      if (!data.insights || data.insights.length === 0) {
        console.warn("No insights found for company:", companyName);
        if (data.calls && data.calls.length > 0) {
          console.warn("Company has calls but no insights. Call IDs:", data.calls.map((c: any) => c.id));
        }
      } else {
        console.log("Successfully loaded insights:", data.insights.length);
      }
    } catch (err) {
      console.error("Error querying company analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to load analysis");
      setQueriedTranscripts([]);
      setQueriedInsights([]);
    } finally {
      setQueryLoading(false);
      console.log("queryCompanyAnalysis completed");
    }
  };

  const handleCompanySelect = (companyName: string) => {
    setSelectedCompanyName(companyName);
    // Don't auto-fetch, wait for button click
  };

  const handleFetchAnalysis = () => {
    console.log("handleFetchAnalysis called, selectedCompanyName:", selectedCompanyName);
    if (selectedCompanyName) {
      console.log("Calling queryCompanyAnalysis for:", selectedCompanyName);
      queryCompanyAnalysis(selectedCompanyName);
    } else {
      console.warn("No company selected, cannot fetch analysis");
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

          {/* Company Selector - Before Tabs */}
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label
                htmlFor="company-select"
                className="flex items-center gap-2 text-sm font-medium text-slate-200"
              >
                <Building2 className="h-4 w-4" />
                Select Company
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
                id="company-select"
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
                title={!selectedCompanyName ? "Please select a company first" : "Load company data"}
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
                : "Select a company to view its data across all tabs"}
            </p>
          </div>

          {/* Saved Call Summaries Section - Visible when company is selected */}
          {selectedCompanyName && queriedTranscripts.some((call) => call.call_summary) && (
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-slate-200">
                  Saved Call Summaries
                </h2>
                <span className="rounded-full bg-blue-800/50 px-2 py-1 text-xs font-medium text-blue-200">
                  {queriedTranscripts.filter((call) => call.call_summary).length} call{queriedTranscripts.filter((call) => call.call_summary).length !== 1 ? "s" : ""}
                </span>
                {selectedCallId && (
                  <button
                    onClick={() => setSelectedCallId(null)}
                    className="ml-auto text-xs text-slate-400 hover:text-slate-300 underline"
                  >
                    Show all pain points
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {queriedTranscripts
                  .filter((call) => call.call_summary) // Only show calls with summaries
                  .map((call) => {
                    const callInsightsCount = queriedInsights.filter(
                      (insight) => insight.call_id === call.id
                    ).length;
                    const isSelected = selectedCallId === call.id;
                    
                    return (
                      <div
                        key={call.id}
                        onClick={() => {
                          setSelectedCallId(isSelected ? null : call.id);
                          // Switch to painpoints tab when clicking
                          if (!isSelected) {
                            setActiveTab("painpoints");
                          }
                        }}
                        className={`rounded-lg border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-900/20 shadow-lg"
                            : "border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/70"
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {call.call_date
                                ? new Date(call.call_date).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Date unknown"}
                            </span>
                          </div>
                          {call.customer_name && (
                            <div className="flex items-center gap-2 text-slate-300">
                              <Building2 className="h-4 w-4" />
                              <span>{call.customer_name}</span>
                            </div>
                          )}
                          {callInsightsCount > 0 && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <AlertCircle className="h-4 w-4" />
                              <span>{callInsightsCount} pain point{callInsightsCount !== 1 ? "s" : ""}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                          {call.call_summary}
                        </p>
                        {isSelected && (
                          <p className="mt-2 text-xs text-blue-400 font-medium">
                            Click to view pain points →
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

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
              {/* PIN Gate */}
              {!pinVerified ? (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="h-5 w-5 text-slate-400" />
                    <h3 className="text-lg font-semibold text-slate-200">PIN Required</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Enter your PIN to unlock pain point extraction
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setPinError(null);
                      }}
                      onKeyPress={handlePinKeyPress}
                      placeholder="Enter PIN"
                      className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      maxLength={10}
                    />
                    <button
                      onClick={verifyPin}
                      className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Verify
                    </button>
                  </div>
                  {pinError && (
                    <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {pinError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-green-700/50 bg-green-900/20 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium text-green-200">PIN Verified</span>
                  <button
                    onClick={() => setPinVerified(false)}
                    className="ml-auto text-xs text-slate-400 hover:text-slate-300 underline"
                  >
                    Change PIN
                  </button>
                </div>
              )}

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
                    disabled={!pinVerified}
                    className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {pinVerified 
                      ? "Extract Pain Points & Save to Database"
                      : "Verify PIN to Extract Pain Points"
                    }
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
              {queryLoading && (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-slate-300">Loading pain points...</span>
                </div>
              )}

              {!queryLoading && (
                <>
                  {!selectedCompanyName ? (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                      <Building2 className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                      <p className="text-sm font-medium text-slate-300 mb-2">
                        No company selected
                      </p>
                      <p className="text-xs text-slate-400">
                        Please select a company from the dropdown above to view pain points
                      </p>
                    </div>
                  ) : (selectedCallId
                    ? queriedInsights.filter((insight) => insight.call_id === selectedCallId).length === 0
                    : queriedInsights.length === 0
                  ) ? (
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
                    /* Table View */
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-900/50 border-b border-slate-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Pain Point
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Person Mentioned
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Date Mentioned
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
                            {(selectedCallId
                              ? queriedInsights.filter((insight) => insight.call_id === selectedCallId)
                              : queriedInsights
                            ).map((insight) => {
                              // Find the call date for this insight
                              const call = queriedTranscripts.find((c) => c.id === insight.call_id);
                              const callDate = call?.call_date 
                                ? new Date(call.call_date).toLocaleDateString()
                                : "N/A";
                              
                              // Get urgency color
                              const getUrgencyColor = (urgency: number) => {
                                if (urgency >= 4) return "text-red-400";
                                if (urgency === 3) return "text-yellow-400";
                                return "text-blue-400";
                              };

                              return (
                                <tr key={insight.id} className="hover:bg-slate-800/30 align-top">
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
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
