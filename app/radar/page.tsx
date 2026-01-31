"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Radar as RadarIcon,
  Sparkles,
  Lock,
  Target,
  TrendingUp,
  Eye,
  Activity,
  BarChart3,
  Building2,
  Bell,
  LayoutDashboard,
  Package,
} from "lucide-react";

const menuItems = [
  { name: "Meetings", href: "/", icon: BarChart3 },
  { name: "Companies", href: "/pain-points", icon: Building2 },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Product Vault", href: "/product-vault", icon: Package },
  { name: "Radar", href: "/radar", icon: RadarIcon },
];

const upcomingFeatures = [
  {
    icon: Target,
    title: "Opportunity Detection",
    description: "Automatically identify sales opportunities from conversation patterns",
  },
  {
    icon: TrendingUp,
    title: "Trend Analysis",
    description: "Track emerging customer needs and market shifts over time",
  },
  {
    icon: Eye,
    title: "Competitive Intel",
    description: "Monitor competitor mentions and positioning in your calls",
  },
];

export default function RadarPage() {
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
                <div className="p-2 rounded-lg bg-teal/10 border border-teal/20">
                  <RadarIcon className="h-5 w-5 text-teal-light" />
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Radar
                </h1>
              </div>
              <p className="text-sm text-slate-500 ml-12">
                Monitor customer needs and market opportunities
              </p>
            </div>

            {/* Main Coming Soon Card */}
            <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-base-100 to-base-200 overflow-hidden">
              {/* Decorative gradient orbs */}
              <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-radial from-teal/10 via-transparent to-transparent blur-3xl" />
              <div className="absolute bottom-0 right-0 w-56 h-56 bg-gradient-radial from-accent/5 via-transparent to-transparent blur-2xl" />

              <div className="relative p-8 sm:p-12 text-center">
                {/* Animated Radar Visual */}
                <div className="inline-flex items-center justify-center rounded-full bg-base-300/30 border border-slate-700/50 p-6 mb-6 backdrop-blur-sm relative">
                  {/* Radar pulse rings */}
                  <div className="absolute inset-0 rounded-full border border-teal/20 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-2 rounded-full border border-teal/15 animate-ping opacity-15" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                  <div className="absolute inset-4 rounded-full border border-teal/10 animate-ping opacity-10" style={{ animationDuration: '3s', animationDelay: '2s' }} />

                  <div className="relative">
                    <RadarIcon className="h-14 w-14 text-teal" />
                    <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-base-200 border border-slate-700">
                      <Lock className="h-3 w-3 text-teal-light" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-teal-light" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-teal-light">
                    Coming Soon
                  </span>
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-3">
                  Your Market Intelligence Radar
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
                  Stay ahead with real-time insights on customer needs, market trends, and
                  competitive positioning. Never miss an opportunity again.
                </p>

                {/* Feature Preview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {upcomingFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.title}
                        className="group p-4 rounded-xl bg-base-300/30 border border-slate-800/50 hover:border-teal/20 transition-all duration-300"
                      >
                        <div className="p-2 rounded-lg bg-base-200 w-fit mb-3 group-hover:bg-teal/10 transition-colors">
                          <Icon className="h-4 w-4 text-slate-500 group-hover:text-teal-light transition-colors" />
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal/20 border border-teal/30 text-teal-light text-sm font-medium cursor-not-allowed opacity-60"
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
