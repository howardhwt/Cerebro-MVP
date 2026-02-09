"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  BarChart3,
  Package,
  LayoutDashboard,
  Search,
  Plus,
  Loader2,
  ArrowUpDown,
  Phone,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";

interface CompanyOverview {
  id: string;
  name: string;
  contactPerson: string | null;
  lastContactDate: string | null;
  callCount: number;
  painPointCount: number;
  customerType: "existing" | "new";
  createdAt: string;
}

type SortField = "name" | "lastContactDate" | "callCount" | "painPointCount";
type SortDirection = "asc" | "desc";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Meetings", href: "/", icon: BarChart3 },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Product Vault", href: "/product-vault", icon: Package },
];

export default function CompaniesOverviewPage() {
  const pathname = usePathname();
  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastContactDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/get-companies-overview", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      } else {
        const data = await response.json().catch(() => ({}));
        const message = data.error || `Failed to load companies (${response.status})`;
        setError(message);
        setCompanies([]);
      }
    } catch (err) {
      console.error("Error loading companies:", err);
      setError(err instanceof Error ? err.message : "Failed to load companies. Check your connection and try again.");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedCompanies = useMemo(() => {
    let filtered = companies;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(query) ||
          company.contactPerson?.toLowerCase().includes(query)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "lastContactDate":
          const dateA = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
          const dateB = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case "callCount":
          comparison = a.callCount - b.callCount;
          break;
        case "painPointCount":
          comparison = a.painPointCount - b.painPointCount;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [companies, searchQuery, sortField, sortDirection]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
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

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 hover:text-slate-200 transition-colors ${
        sortField === field ? "text-accent-light" : ""
      }`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-accent" : "opacity-50"}`} />
    </button>
  );

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
          <span className="font-display text-lg font-semibold tracking-tight text-white hidden sm:inline">
            Cerebro
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 sm:w-64 rounded-lg border border-slate-800 bg-base-100 pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:shadow-glow-sm transition-all"
            />
          </div>
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
        {/* Left Navbar */}
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
          <div className="p-4 border-t border-slate-800/30">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-600">
              Trust = Revenue
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-base bg-grid flex flex-col overflow-hidden">
          {/* Page Header */}
          <div className="border-b border-slate-800/50 bg-base-50/80 backdrop-blur-sm px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Companies</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Manage and track all your accounts
                </p>
              </div>
              <Link
                href="/?upload=1"
                className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium text-sm transition-all shadow-glow-sm hover:shadow-glow-md"
              >
                <Plus className="h-4 w-4" />
                Add Transcript
              </Link>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <span className="mt-4 text-sm text-slate-400">Loading companies...</span>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-urgent/30 bg-urgent/5 p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-urgent mx-auto mb-4" />
                <p className="font-display text-lg font-semibold text-urgent-light mb-2">
                  Couldn&apos;t load companies
                </p>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
                <button
                  onClick={loadCompanies}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-dark text-white text-sm font-medium transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-base-100 p-16 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                  <div className="rounded-2xl bg-gradient-to-br from-base-200 to-base-300 p-6 mx-auto w-fit mb-5">
                    <Building2 className="h-12 w-12 text-slate-400" />
                  </div>
                  <p className="font-display text-xl font-bold text-white mb-3">
                    No companies yet
                  </p>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Upload call transcripts to automatically create company profiles and extract insights
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800/80 bg-base-100 overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-base-50 border-b border-slate-800/80">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          <SortButton field="name" label="Company Name" />
                        </th>
                        <th className="hidden md:table-cell px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          Contact Person
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          <SortButton field="lastContactDate" label="Last Contact" />
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          <SortButton field="callCount" label="# Calls" />
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          <SortButton field="painPointCount" label="# Pain Points" />
                        </th>
                        <th className="hidden lg:table-cell px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          Type
                        </th>
                        <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">

                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredAndSortedCompanies.map((company) => (
                        <tr
                          key={company.id}
                          className="table-row-hover transition-colors group cursor-pointer"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/companies/${company.id}`}
                              className="text-sm font-medium text-accent-light hover:text-accent transition-colors"
                            >
                              {company.name}
                            </Link>
                          </td>
                          <td className="hidden md:table-cell px-5 py-4 text-sm text-slate-300">
                            {company.contactPerson || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-400 font-mono">
                            {formatDate(company.lastContactDate)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-300 font-mono">
                              <Phone className="h-3.5 w-3.5 text-slate-500" />
                              {company.callCount}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-sm font-mono ${
                              company.painPointCount > 5 ? "text-warning-light" : "text-slate-300"
                            }`}>
                              <AlertTriangle className={`h-3.5 w-3.5 ${
                                company.painPointCount > 5 ? "text-warning" : "text-slate-500"
                              }`} />
                              {company.painPointCount}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-5 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                company.customerType === "existing"
                                  ? "bg-success/10 text-success-light border-success/30"
                                  : "bg-warning/10 text-warning-light border-warning/30"
                              }`}
                            >
                              {company.customerType === "existing" ? "Existing" : "New"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/companies/${company.id}`}
                              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-accent-light transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              View
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Table Footer */}
                <div className="px-5 py-3 border-t border-slate-800/50 bg-base-50/50 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    {filteredAndSortedCompanies.length} of {companies.length} companies
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
