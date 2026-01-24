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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="sm:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-800 border border-slate-700 text-white"
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
          className="sm:hidden fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed sm:static h-screen w-64 flex-col border-r border-slate-700 bg-slate-900 z-40 transform transition-transform duration-200 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } sm:translate-x-0 sm:flex`}>
        <div className="flex h-16 items-center border-b border-slate-700 px-4 sm:px-6">
          <Image
            src="/cerebro-logo.png"
            alt="Cerebro"
            width={24}
            height={24}
            className="h-6 w-6"
            priority
          />
          <span className="ml-2 text-xl font-semibold text-white">Cerebro</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
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
    </>
  );
}
