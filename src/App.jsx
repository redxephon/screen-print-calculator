import { useState } from "react";
import ScreenPrintCalculator from "./ScreenPrintCalculator";
import WebstoreCalculator from "./WebstoreCalculator";

const MODES = [
  { id: "screenprint", label: "Screen Print Pricing", icon: "🖨" },
  { id: "webstore", label: "Webstore Pricing", icon: "🛒" },
];

export default function App() {
  const [mode, setMode] = useState("screenprint");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 mb-4 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Jersey Ink — Pricing Tools
            </h1>
            <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === m.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  <span className="mr-1.5">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Calculator */}
        {mode === "screenprint" && <ScreenPrintCalculator />}
        {mode === "webstore" && <WebstoreCalculator />}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-6 pb-4">
          Jersey Ink Custom Apparel — 1601 N. 9th St., Reading, PA 19604 — (610) 378-7844
        </div>
      </div>
    </div>
  );
}
