"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Sparkles,
  Lock,
  Layers,
  Zap,
  ArrowRight,
  BarChart3,
  Building2,
  LayoutDashboard,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Meetings", href: "/", icon: BarChart3 },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Product Vault", href: "/product-vault", icon: Package },
];

const upcomingFeatures = [
  {
    icon: Layers,
    title: "Product Catalog",
    description: "Centralized repository of all your product features and capabilities",
  },
  {
    icon: Zap,
    title: "Smart Matching",
    description: "AI-powered mapping of customer pain points to relevant products",
  },
  {
    icon: ArrowRight,
    title: "Sales Enablement",
    description: "Quick access to product info during customer conversations",
  },
];

export default function ProductVaultPage() {
  const pathname = usePathname();

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
        <div className="flex-1 overflow-y-auto bg-base bg-grid">
          <div className="mx-auto max-w-4xl p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                  <Package className="h-5 w-5 text-accent-light" />
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Product Vault
                </h1>
              </div>
              <p className="text-sm text-slate-500 ml-12">
                Manage your product features and capabilities
              </p>
            </div>

            {/* Main Coming Soon Card */}
            <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-base-100 to-base-200 overflow-hidden">
              {/* Decorative gradient orb */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-accent/10 via-transparent to-transparent blur-2xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-radial from-teal/10 via-transparent to-transparent blur-2xl" />

              <div className="relative p-8 sm:p-12 text-center">
                {/* Lock Icon */}
                <div className="inline-flex items-center justify-center rounded-2xl bg-base-300/50 border border-slate-700/50 p-5 mb-6 backdrop-blur-sm">
                  <div className="relative">
                    <Package className="h-12 w-12 text-slate-400" />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-base-200 border border-slate-700">
                      <Lock className="h-3.5 w-3.5 text-accent-light" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-accent-light" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-accent-light">
                    Coming Soon
                  </span>
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-3">
                  Your Product Intelligence Hub
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
                  Track your product capabilities and automatically match them to customer pain points.
                  Turn every conversation into a sales opportunity.
                </p>

                {/* Feature Preview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {upcomingFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.title}
                        className="group p-4 rounded-xl bg-base-300/30 border border-slate-800/50 hover:border-slate-700/50 transition-all duration-300"
                      >
                        <div className="p-2 rounded-lg bg-base-200 w-fit mb-3 group-hover:bg-accent/10 transition-colors">
                          <Icon className="h-4 w-4 text-slate-500 group-hover:text-accent-light transition-colors" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-200 mb-1">{feature.title}</h3>
                        <p className="text-xs text-slate-500">{feature.description}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Notify Button */}
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent/20 border border-accent/30 text-accent-light text-sm font-medium cursor-not-allowed opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  Get Notified When Ready
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
