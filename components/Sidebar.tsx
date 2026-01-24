"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Package,
  Radar,
  Menu,
  X
} from "lucide-react";

const menuItems = [
  {
    name: "Analysis",
    href: "/",
    icon: BarChart3,
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

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0a192f] px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image
              src="/logo.png"
              alt="Cerebro Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-display text-lg font-bold text-white">Cerebro</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 top-16 bg-[#0a192f] p-4 md:hidden">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r border-white/5 bg-[#0a192f] md:flex">
        {/* Brand Section */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative h-6 w-6">
              <Image
                src="/logo.png"
                alt="Cerebro Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Cerebro
            </span>
          </div>
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">v1.0</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Menu
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                    ? "bg-brand-500 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer/User Section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
            <div className="h-9 w-9 rounded-full bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">Demo User</span>
              <span className="text-xs text-slate-400">Admin</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
