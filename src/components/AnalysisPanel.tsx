import React from "react";
import { ShieldAlert, LayoutGrid } from "lucide-react";
import { LandRecord } from "../types";

interface AnalysisPanelProps {
  records: LandRecord[];
}

export default function AnalysisPanel({ records }: AnalysisPanelProps) {
  const totalCount = records.length;

  // Legal Flags Extraction Breakdown — all columns from सीलिंग to वहिवाट
  const flagsMapping: { label: string; key: keyof LandRecord; count: number }[] = [
    "ceiling", "forest", "inam", "bhoodan", "gaothan", "kul",
    "watan", "newCondition", "encroachment", "grazing", "devasthan",
    "tribal", "rehabilitation", "leasehold", "waqf", "fragmentLimit",
    "apk", "ekuk", "hypothecation", "bunding", "bhumidhari", "tagai",
    "cultivation",
  ].map((key) => {
    const labels: Record<string, string> = {
      ceiling: "सीलिंग (Ceiling)", forest: "वन/फॉरेस्ट (Forest)",
      inam: "इनाम (Inam)", bhoodan: "भूदान (Bhoodan)",
      gaothan: "गावठाण (Gaothan)", kul: "कुळ (Kul)",
      watan: "वतन (Watan)", newCondition: "नवीन शर्त (New Condition)",
      encroachment: "अतिक्रमण (Encroachment)", grazing: "गुरे चरण/चरई (Grazing)",
      devasthan: "देवस्थान (Devasthan)", tribal: "कलम ३६ आदिवासी (Tribal)",
      rehabilitation: "पुनर्वसन (Rehabilitation)", leasehold: "भाडेपट्टा (Leasehold)",
      waqf: "वक्फ (Waqf)", fragmentLimit: "तुकडा/तुकडेबंदी (Fragment)",
      apk: "अ पा क (APK)", ekuk: "एकुक (Ekuk)",
      hypothecation: "नजर गहाण (Hypothecation)", bunding: "बडिंग (Bunding)",
      bhumidhari: "भूमीधारी हक्क (Bhumidhari)", tagai: "तगाई (Tagai)",
      cultivation: "वहिवाट (Cultivation)",
    };
    return {
      label: labels[key] || key,
      key: key as keyof LandRecord,
      count: records.filter((r) => r[key as keyof LandRecord] === "YES").length,
    };
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full flex flex-col justify-between animate-fade-in shadow-sm" id="analytics-panel">
      <div>
        {/* Module Header */}
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900 leading-tight flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-600" />
            Land Record Intelligence
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time analytics and revenue metrics parsed from uploaded Extracts.
          </p>
        </div>



        {/* Legal Risk and Restrictions Monitoring */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Legal Flags & Restrictions
            </h3>
          </div>

          {totalCount === 0 ? (
            <div className="p-4 border border-dashed border-gray-300 rounded-xl text-center">
              <p className="text-[11px] text-gray-500">No active legal flags detected.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
              {flagsMapping.map((flag, index) => (
                <div
                  key={index}
                  className="p-2 rounded-lg border border-blue-200 bg-blue-50 text-gray-900 text-xs flex items-center justify-between transition-all hover:scale-[1.01]"
                >
                  <span className="font-medium truncate mr-1">{flag.label}</span>
                  <span className="font-bold text-xs font-mono shrink-0 px-2 py-0.5 bg-white border border-gray-300/60 rounded-md shadow-xs">
                    {flag.count} {flag.count === 1 ? "File" : "Files"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
