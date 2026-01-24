"use client";

import Sidebar from "@/components/Sidebar";
import { Radar as RadarIcon } from "lucide-react";

export default function RadarPage() {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full sm:ml-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Radar</h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Monitor customer needs and opportunities
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 p-8 sm:p-12 text-center">
            <RadarIcon className="h-12 w-12 text-slate-500" />
            <p className="mt-4 text-sm font-medium text-slate-300">
              Radar coming soon
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
