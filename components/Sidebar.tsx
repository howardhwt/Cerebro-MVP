"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  Package,
  Radar,
  Menu,
  X,
  Bell,
  LayoutDashboard,
  Building2,
  Sparkles,
} from "lucide-react";

const menuItems = [
  {
    name: "Meetings",
    href: "/",
    icon: BarChart3,
    description: "Call transcripts",
  },
  {
    name: "Companies",
    href: "/companies",
    icon: Building2,
    description: "Account overview",
  },
  {
    name: "Alerts",
    href: "/alerts",
    icon: Bell,
    description: "Action items",
    badge: "Live",
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Metrics & widgets",
  },
  {
    name: "Product Vault",
    href: "/product-vault",
    icon: Package,
    description: "Coming soon",
    disabled: true,
  },
  {
    name: "Radar",
    href: "/radar",
    icon: Radar,
    description: "Coming soon",
    disabled: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="sm:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-base-100 border border-slate-800 text-white"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-base/90 backdrop-blur-md"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed sm:static h-screen w-64 flex-col border-r border-slate-800/50 bg-base-50 z-40 transform transition-transform duration-200 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } sm:translate-x-0 sm:flex`}>
        {/* Logo Header */}
        <div className="flex h-16 items-center border-b border-slate-800/50 px-4 sm:px-6">
          <div className="relative">
            <Image
              src="/cerebro-logo.png"
              alt="Cerebro"
              width={28}
              height={28}
              className="h-7 w-7"
              priority
            />
            {/* Subtle glow behind logo */}
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
          </div>
          <span className="ml-3 font-display text-xl font-bold tracking-tight text-cerebro">
            Cerebro
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* Section Label */}
          <div className="px-3 py-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Navigation
            </span>
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isDisabled = item.disabled;

            if (isDisabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 cursor-not-allowed opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider bg-base-300 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-accent/15 to-transparent text-white nav-active-bar"
                    : "text-slate-400 hover:bg-base-200/50 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-accent/20 text-accent-light"
                      : "text-slate-500 group-hover:text-slate-400"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className={isActive ? "text-white" : ""}>{item.name}</span>
                    <span className={`text-[10px] transition-opacity ${
                      isActive ? "text-slate-400" : "text-slate-600 opacity-0 group-hover:opacity-100"
                    }`}>
                      {item.description}
                    </span>
                  </div>
                </div>

                {/* Badge for special items */}
                {item.badge && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded border border-teal-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-slate-800/50 p-4">
          <div className="rounded-xl bg-gradient-to-br from-base-200 to-base-300 p-4 relative overflow-hidden">
            {/* Corner decoration */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent/10 to-transparent" />

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent-light" />
              <span className="text-xs font-semibold text-slate-200">Pro Tip</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upload transcripts to extract pain points automatically with AI.
            </p>
          </div>

          {/* Trust tagline */}
          <div className="mt-4 text-center">
            <span className="tagline text-[10px] font-mono uppercase tracking-widest text-slate-600">
              Trust = Revenue
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
