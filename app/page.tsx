"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  AlertCircle,
  Building2,
  Search,
  Calendar,
  RefreshCw,
  Lock,
  CheckCircle2,
  BarChart3,
  Package,
  MoreVertical,
  ArrowUp,
  Plus,
  X,
  Clock,
  ChevronLeft,
  LayoutDashboard,
  Menu,
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
  company_name?: string; // Added to track company name for each call
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

function AnalysisPageContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // View state
  const [viewMode, setViewMode] = useState<"landing" | "detail">("landing");
  const [selectedCallForDetail, setSelectedCallForDetail] = useState<CallTranscript | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
  
  // Load all calls on mount for landing view
  const [allCalls, setAllCalls] = useState<CallTranscript[]>([]);
  const [allInsights, setAllInsights] = useState<ExtractedInsight[]>([]);
  
  // Expanded summaries state
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load companies and all calls on mount
  useEffect(() => {
    loadCompanies();
    loadAllCalls();
  }, []);

  // Open upload modal when navigating from Companies "Add Company" (?upload=1)
  useEffect(() => {
    if (searchParams.get("upload") === "1") {
      setUploadModalOpen(true);
    }
  }, [searchParams]);

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setText("");
    if (searchParams.get("upload") === "1") {
      router.replace("/companies");
    }
  };

  const loadAllCalls = async () => {
    try {
      // Get all companies first
      const companiesResponse = await fetch("/api/get-companies", { cache: "no-store" });
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        if (companiesData.companies && companiesData.companies.length > 0) {
          // Load calls for all companies
          const allCallsList: CallTranscript[] = [];
          const allInsightsList: ExtractedInsight[] = [];
          
          for (const company of companiesData.companies) {
            const analysisResponse = await fetch(`/api/get-company-analysis?company_name=${encodeURIComponent(company.name)}`);
            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              if (analysisData.calls) {
                // Add company_name to each call
                const callsWithCompany = analysisData.calls.map((call: CallTranscript) => ({
                  ...call,
                  company_name: company.name,
                }));
                allCallsList.push(...callsWithCompany);
              }
              if (analysisData.insights) {
                allInsightsList.push(...analysisData.insights);
              }
            }
          }
          
          // Sort by date, most recent first
          allCallsList.sort((a, b) => {
            const dateA = new Date(a.call_date).getTime();
            const dateB = new Date(b.call_date).getTime();
            return dateB - dateA;
          });
          
          setAllCalls(allCallsList);
          setAllInsights(allInsightsList);
        }
      }
    } catch (err) {
      console.error("Error loading all calls:", err);
    }
  };
  
  // Helper function to extract participant count from transcript
  const getParticipantCount = (transcript: string): number => {
    if (!transcript) return 1;
    
    // Split transcript into lines
    const lines = transcript.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Skip header/metadata section (usually first 5-10 lines with metadata)
    // Look for the start of actual conversation (usually marked by speaker names or timestamps)
    let conversationStartIndex = 0;
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i];
      // Conversation typically starts with speaker patterns or timestamps
      if (/^\[[\d:]+\]/.test(line) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*:/.test(line)) {
        conversationStartIndex = i;
        break;
      }
    }
    
    // Extract conversation lines only (skip metadata header)
    const conversationLines = lines.slice(conversationStartIndex);
    
    // Track speaker name occurrences
    const speakerCounts = new Map<string, number>();
    
    // Pattern 1: Lines starting with "Name:" (most common format)
    // Pattern 2: "[timestamp] Name:"
    const speakerPatterns = [
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/,  // "Name:"
      /\[[^\]]+\]\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/,  // "[00:00] Name:"
    ];
    
    // Count occurrences of each potential speaker name
    for (const line of conversationLines) {
      for (const pattern of speakerPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          // Validate name format (First Last or First)
          if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(name) && 
              name.length >= 2 && 
              name.length <= 30) {
            speakerCounts.set(name, (speakerCounts.get(name) || 0) + 1);
          }
        }
      }
    }
    
    // Filter out metadata labels and common false positives
    const metadataLabels = new Set([
      'Sales', 'Rep', 'Customer', 'Prospect', 'Company', 'Date', 'Duration', 'Time', 
      'Subject', 'Title', 'Meeting', 'Call', 'Discussion', 'Transcript', 'Account', 
      'Executive', 'Manager', 'Director', 'VP', 'CEO', 'CTO', 'CFO', 'President',
      'The', 'This', 'That', 'There', 'They', 'We', 'You', 'I', 'A', 'An', 'And', 
      'But', 'Or', 'So', 'If', 'As', 'At', 'Be', 'By', 'Do', 'Go', 'He', 'In', 
      'Is', 'It', 'My', 'No', 'Of', 'On', 'To', 'Up', 'Us', 'All', 'Are', 'Can', 
      'Did', 'For', 'Get', 'Had', 'Has', 'Her', 'Him', 'His', 'How', 'Its', 'May', 
      'New', 'Not', 'Now', 'Old', 'One', 'Our', 'Out', 'See', 'She', 'Try', 'Two',
      'Use', 'Was', 'Way', 'Who', 'Why', 'Yes', 'Yet', 'Your'
    ]);
    
    // Filter speakers: must appear multiple times (real speakers will speak multiple times)
    // and not be a metadata label
    const validSpeakers = Array.from(speakerCounts.entries())
      .filter(([name, count]) => 
        count >= 2 && // Must appear at least 2 times (real speakers speak multiple times)
        !metadataLabels.has(name) &&
        !metadataLabels.has(name.split(' ')[0]) // Check first name too
      )
      .map(([name]) => name);
    
    // Return count, minimum 1 (at least one participant)
    return Math.max(1, validSpeakers.length);
  };
  
  // Helper function to get meeting name
  const getMeetingName = (call: CallTranscript): string => {
    // Try to extract meeting name from transcript (look for patterns like "Meeting:", "Call:", etc.)
    const transcript = call.transcript_text || "";
    
    // More comprehensive patterns for meeting titles - check first few lines
    const firstLines = transcript.split('\n').slice(0, 10).join('\n');
    const meetingNamePatterns = [
      /(?:Meeting|Call|Discussion)[\s:]+(?:with|about|on)?[\s:]*([^.\n]{10,80})/i,
      /Title:?\s*([^.\n]{10,80})/i,
      /Subject:?\s*([^.\n]{10,80})/i,
      /^([A-Z][^:\n]{10,80}?)(?:\s*[-–—]|\s*:|\s*$)/m, // First line that looks like a title
    ];
    
    for (const pattern of meetingNamePatterns) {
      const match = firstLines.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Clean up common prefixes/suffixes
        const cleaned = name
          .replace(/^(Meeting|Call|Discussion)[\s:]+/i, '')
          .replace(/[\s:]+$/, '')
          .trim();
        // Validate: must be meaningful and not contain "transcript"
        if (cleaned.length > 5 && 
            cleaned.length < 80 && 
            !cleaned.toLowerCase().includes('transcript') &&
            !cleaned.toLowerCase().includes('sales call') &&
            cleaned !== 'Call Transcript') {
          return cleaned;
        }
      }
    }
    
    // Fallback: format as "Meeting with {Company} on {Date}"
    // Get company name - check if it's set, otherwise try to extract from transcript or use "Client"
    let companyName = call.company_name;
    if (!companyName || companyName.trim() === '') {
      // Try to extract company name from transcript
      const companyMatch = transcript.match(/(?:Company|Client|Organization|Prospect)[\s:]+([^\n]{3,50})/i);
      if (companyMatch && companyMatch[1]) {
        companyName = companyMatch[1].trim();
      } else {
        companyName = "Client";
      }
    }
    
    const date = call.call_date 
      ? new Date(call.call_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "unknown date";
    
    return `Meeting with ${companyName} on ${date}`;
  };

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

  // Auto-validate PIN on backend
  const validatePin = async (pinValue: string) => {
    if (pinValue.length < 4) {
      setPinVerified(false);
      setPinError(null);
      return;
    }

    try {
      const response = await fetch("/api/analyze-and-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: "",
          pin: pinValue,
          validateOnly: true,
        }),
      });

      if (response.ok) {
        setPinVerified(true);
        setPinError(null);
      } else {
        const errorData = await response.json();
        setPinError(errorData.error || "Incorrect PIN. Please try again.");
        setPinVerified(false);
      }
    } catch (err) {
      setPinError("Failed to validate PIN. Please try again.");
      setPinVerified(false);
    }
  };

  const extractAndSave = async () => {
    if (!pinVerified || !pin) {
      setError("Please enter and verify PIN before extracting pain points");
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
          pin: pin, // Send PIN with request for backend validation
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
      
      // Reload all calls for landing view
      await loadAllCalls();
      
      // Close upload modal after successful extraction
      closeUploadModal();
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


  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Meetings", href: "/", icon: BarChart3 },
    { name: "Companies", href: "/companies", icon: Building2 },
    { name: "Product Vault", href: "/product-vault", icon: Package },
  ];

  // Group calls by date for landing view
  const groupCallsByDate = (calls: CallTranscript[]) => {
    const grouped: { [key: string]: CallTranscript[] } = {};
    calls.forEach((call) => {
      if (call.call_date) {
        const date = new Date(call.call_date);
        const dateKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(call);
      }
    });
    return grouped;
  };

  const handleCallClick = (call: CallTranscript) => {
    setSelectedCallForDetail(call);
    setViewMode("detail");
    // Load insights for this specific call
    const callInsights = allInsights.filter((insight) => insight.call_id === call.id);
    setQueriedInsights(callInsights);
    setQueriedTranscripts([call]);
  };

  const handleBackToLanding = () => {
    setViewMode("landing");
    setSelectedCallForDetail(null);
    setQueriedInsights([]);
    setQueriedTranscripts([]);
  };

  // Get insights for a specific call
  const getCallInsights = (callId: string) => {
    return allInsights.filter((insight) => insight.call_id === callId);
  };

  return (
    <div className="flex h-screen flex-col bg-base text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800/50 bg-base-50 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-base-200 text-slate-400"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
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
          {/* PIN validation moved to upload modal */}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        {/* Left Navbar - Features */}
        <div className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800/50 bg-base-50 flex flex-col transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
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
        {/* Center and Right Panels */}
        {viewMode === "landing" ? (
          <>
            {/* Center Panel - Past Calls */}
            <div className="flex-1 border-r border-slate-800/50 bg-base bg-grid flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800/50 bg-base-50/80 backdrop-blur-sm px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-slate-200 tracking-wide">Past Calls</h2>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-accent text-white btn-glow"
                  title="Upload transcript"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {allCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-base-200 p-4 mb-4">
                      <FileText className="h-10 w-10 text-slate-500" />
                    </div>
                    <p className="font-display text-base font-semibold text-slate-200 mb-2">
                      No calls yet
                    </p>
                    <p className="text-sm text-slate-500 max-w-xs">
                      Click the + button to upload your first transcript and start extracting insights
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupCallsByDate(allCalls)).map(([dateKey, calls], groupIndex) => (
                      <div key={dateKey} className="space-y-3 animate-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                        <h3 className="font-mono text-xs font-medium text-slate-500 uppercase tracking-widest">
                          {dateKey}
                        </h3>
                        <div className="space-y-3 stagger-children">
                          {calls.map((call) => {
                            const callInsights = getCallInsights(call.id);
                            // Calculate approximate duration (placeholder - could be improved)
                            const duration = "1 h 2 min";

                            // Get meeting name
                            const meetingName = getMeetingName(call);

                            // Get participant count
                            const participantCount = getParticipantCount(call.transcript_text);

                            // Get summary text
                            const summaryText = call.call_summary || call.transcript_text.substring(0, 300);
                            const isExpanded = expandedSummaries.has(call.id);
                            const shouldTruncate = summaryText.length > 200;
                            const displayText = isExpanded || !shouldTruncate
                              ? summaryText
                              : summaryText.substring(0, 200) + "...";

                            // Get highest urgency for visual indicator
                            const maxUrgency = callInsights.length > 0
                              ? Math.max(...callInsights.map(i => i.urgency_level))
                              : 0;
                            const getUrgencyBarColor = (urgency: number) => {
                              if (urgency >= 4) return "bg-urgent";
                              if (urgency === 3) return "bg-warning";
                              if (urgency > 0) return "bg-accent";
                              return "bg-slate-700";
                            };

                            return (
                              <div
                                key={call.id}
                                onClick={() => handleCallClick(call)}
                                className="group relative rounded-xl border border-slate-800/80 bg-base-100 p-4 pl-5 cursor-pointer card-interactive hover:border-accent/30 hover:bg-base-200 animate-in overflow-hidden"
                              >
                                {/* Urgency indicator bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getUrgencyBarColor(maxUrgency)} ${maxUrgency >= 4 ? 'animate-pulse' : ''}`} />
                                {/* Title */}
                                <h4 className="font-display text-sm font-semibold text-slate-100 mb-2 line-clamp-1 group-hover:text-white transition-colors">
                                  {meetingName}
                                </h4>

                                {/* Details line - removed summary portion */}
                                <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="font-mono">
                                    {call.call_date
                                      ? new Date(call.call_date).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })
                                      : "Time unknown"}
                                  </span>
                                  <span className="text-slate-600">•</span>
                                  <span className="font-mono">{duration}</span>
                                  {call.customer_name && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <span>{call.customer_name}</span>
                                    </>
                                  )}
                                </div>
                                
                                {/* Summary with thumbnail area */}
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                      {displayText}
                                    </p>
                                    {shouldTruncate && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newExpanded = new Set(expandedSummaries);
                                          if (isExpanded) {
                                            newExpanded.delete(call.id);
                                          } else {
                                            newExpanded.add(call.id);
                                          }
                                          setExpandedSummaries(newExpanded);
                                        }}
                                        className="mt-1 text-xs text-accent-light hover:text-accent transition-colors"
                                      >
                                        {isExpanded ? "Show less" : "Show more"}
                                      </button>
                                    )}
                                  </div>
                                  {/* Thumbnail placeholder - could show transcript preview or icon */}
                                  <div className="w-20 h-20 flex-shrink-0 rounded-lg border border-slate-800 bg-base/50 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-slate-600" />
                                  </div>
                                </div>

                                {/* Footer with participants and metrics */}
                                <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-4">
                                  {/* Participant avatars */}
                                  {call.customer_name && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-6 w-6 rounded-full bg-gradient-accent flex items-center justify-center text-xs font-semibold text-white shadow-glow-sm">
                                        {call.customer_name.charAt(0).toUpperCase()}
                                      </div>
                                      {participantCount > 1 && (
                                        <span className="font-mono text-xs text-slate-500">+{participantCount - 1}</span>
                                      )}
                                    </div>
                                  )}
                                  {callInsights.length > 0 && (
                                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${
                                      maxUrgency >= 4 ? 'bg-urgent/10 border border-urgent/20' :
                                      maxUrgency === 3 ? 'bg-warning/10 border border-warning/20' :
                                      'bg-accent/10 border border-accent/20'
                                    }`}>
                                      <AlertCircle className={`h-3.5 w-3.5 ${
                                        maxUrgency >= 4 ? 'text-urgent' :
                                        maxUrgency === 3 ? 'text-warning' :
                                        'text-accent-light'
                                      }`} />
                                      <span className={`font-mono ${
                                        maxUrgency >= 4 ? 'text-urgent-light' :
                                        maxUrgency === 3 ? 'text-warning-light' :
                                        'text-accent-light'
                                      }`}>{callInsights.length} pain point{callInsights.length !== 1 ? "s" : ""}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Upcoming Meetings */}
            <div className="hidden lg:flex w-80 border-l border-slate-800/50 bg-base-50 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-semibold text-slate-200 tracking-wide">Meetings</h2>
                  <button className="p-1 rounded-md hover:bg-base-200 transition-colors">
                    <RefreshCw className="h-3 w-3 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Record a live meeting */}
                <div className="space-y-3">
                  <h3 className="font-display text-xs font-semibold text-slate-300">Record a live meeting</h3>
                  <p className="text-xs text-slate-500">Works with Zoom, Google Meet, or Microsoft Teams.</p>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-base-100 px-3 py-2.5 focus-within:border-accent/30 focus-within:shadow-glow-sm transition-all">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Paste meeting URL to add Otter"
                      className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Record upcoming meetings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xs font-semibold text-slate-300">Record upcoming meetings</h3>
                    <button className="text-xs text-accent-light hover:text-accent transition-colors">Settings →</button>
                  </div>

                  {/* Placeholder for upcoming meetings */}
                  <div className="rounded-lg border border-dashed border-slate-800 bg-base-100/50 p-4">
                    <p className="text-xs text-slate-500 text-center">
                      No upcoming meetings scheduled
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Detail View - Insights Table */
          <div className="flex-1 border-r border-slate-800/50 bg-base bg-grid flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800/50 bg-base-50/80 backdrop-blur-sm px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToLanding}
                  className="p-1.5 rounded-lg hover:bg-base-200 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-400" />
                </button>
                <h2 className="font-display text-sm font-semibold text-slate-200 tracking-wide">
                  {selectedCallForDetail?.customer_name || "Call"} - Pain Points
                </h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {queriedInsights.length > 0 ? (
                <div className="rounded-xl border border-slate-800/80 bg-base-100 overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-base-50 border-b border-slate-800/80">
                        <tr>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Pain Point
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Person
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Date
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Timeline
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Urgency
                          </th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Quote
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {queriedInsights.map((insight) => {
                          const call = queriedTranscripts.find((c) => c.id === insight.call_id);
                          const callDate = call?.call_date
                            ? new Date(call.call_date).toLocaleDateString()
                            : "N/A";

                          const getUrgencyStyle = (urgency: number) => {
                            if (urgency >= 4) return "text-urgent bg-urgent/10 border-urgent/30";
                            if (urgency === 3) return "text-warning bg-warning/10 border-warning/30";
                            return "text-accent-light bg-accent/10 border-accent/30";
                          };

                          return (
                            <tr key={insight.id} className="hover:bg-base-200/50 align-top transition-colors">
                              <td className="px-4 py-3.5 text-sm text-slate-200 align-top">
                                {insight.pain_point_description}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-400 align-top">
                                {insight.person_mentioned || "N/A"}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-500 align-top font-mono">
                                {callDate}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-400 align-top">
                                {insight.mentioned_timeline || "N/A"}
                              </td>
                              <td className="px-4 py-3.5 align-top">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${getUrgencyStyle(insight.urgency_level)}`}>
                                  {insight.urgency_level}/5
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-400 max-w-md align-top">
                                <p className="whitespace-normal break-words leading-relaxed italic">
                                  &ldquo;{insight.raw_quote || "N/A"}&rdquo;
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800/80 bg-base-100 p-10 text-center">
                  <div className="rounded-full bg-base-200 p-4 mx-auto w-fit mb-4">
                    <AlertCircle className="h-8 w-8 text-slate-500" />
                  </div>
                  <p className="font-display text-base font-semibold text-slate-200 mb-2">
                    No pain points found
                  </p>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    This call doesn&apos;t have any extracted pain points yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/85 backdrop-blur-xl animate-backdrop">
            <div className="relative w-full max-w-2xl mx-4 rounded-2xl glass-modal p-6 animate-modal">
              <button
                onClick={closeUploadModal}
                className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-base-200 transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>

              <h2 className="font-display mb-5 text-xl font-semibold text-slate-100 tracking-tight">
                Create transcript from <span className="text-gradient">upload</span>
              </h2>

              <div className="space-y-4">
                {/* File Upload Zone */}
                <div
                  className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                    dragActive
                      ? "border-accent bg-accent/10 shadow-glow-sm"
                      : "border-slate-800 bg-base-200/50 hover:border-slate-700 hover:bg-base-200"
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
                  <div className="rounded-full bg-base-300 p-3 mx-auto w-fit">
                    <ArrowUp className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-4 font-display text-sm font-semibold text-slate-200">
                    Drop a file here or click to upload
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Supports .txt files</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 rounded-lg bg-gradient-accent px-5 py-2 text-sm font-semibold text-white btn-glow"
                  >
                    Select File
                  </button>
                </div>

                {/* Text Area */}
                <div className="rounded-xl border border-slate-800 bg-base-200/50 p-4">
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Paste transcript here
                  </label>
                  <textarea
                    value={text}
                    onChange={handleTextChange}
                    onPaste={handlePaste}
                    placeholder="Paste customer call transcript, email, or notes here..."
                    className="h-64 w-full resize-none rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none glass-input"
                  />
                  {text && !isProcessing && (
                    <button
                      onClick={extractAndSave}
                      disabled={!pinVerified}
                      className="mt-3 w-full rounded-lg bg-gradient-accent px-4 py-2.5 text-sm font-semibold text-white hover:shadow-glow-md disabled:bg-base-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200"
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
                  <div className="flex flex-col items-center justify-center rounded-xl border border-accent/30 bg-accent/5 p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    <p className="mt-4 font-display text-sm font-semibold text-slate-200">
                      Processing and saving...
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Extracting pain points and saving to database
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-urgent/30 bg-urgent/10 p-6 text-center">
                    <AlertCircle className="h-8 w-8 text-urgent" />
                    <p className="mt-2 text-sm font-medium text-urgent-light">{error}</p>
                  </div>
                )}

                {/* PIN Validation - Moved to bottom */}
                {!pinVerified ? (
                  <div className="rounded-xl border border-slate-800 bg-base-200/50 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-lg bg-base-300 p-2">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <h3 className="font-display text-sm font-semibold text-slate-200">PIN Required</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Enter your PIN to unlock pain point extraction
                    </p>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => {
                        const newPin = e.target.value;
                        setPin(newPin);
                        setPinError(null);

                        // Auto-validate when PIN is 4 digits (debounced)
                        if (newPin.length === 4) {
                          // Small delay to avoid too many API calls
                          setTimeout(() => {
                            validatePin(newPin);
                          }, 300);
                        } else if (newPin.length > 4) {
                          // Re-validate if user continues typing
                          setTimeout(() => {
                            validatePin(newPin);
                          }, 300);
                        } else {
                          setPinVerified(false);
                        }
                      }}
                      placeholder="Enter PIN"
                      className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-200 font-mono tracking-widest placeholder-slate-600 focus:outline-none glass-input"
                      maxLength={10}
                    />
                    {pinError && (
                      <p className="mt-2 text-xs text-urgent flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        {pinError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold text-success-light">PIN Verified</span>
                    <button
                      onClick={() => {
                        setPinVerified(false);
                        setPin("");
                        setPinError(null);
                      }}
                      className="ml-auto text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
                    >
                      Change PIN
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-base text-slate-100">Loading...</div>}>
      <AnalysisPageContent />
    </Suspense>
  );
}
