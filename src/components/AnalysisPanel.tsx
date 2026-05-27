import React from "react";
import { ShieldAlert, Map, LandPlot, LayoutGrid, CheckCircle } from "lucide-react";
import { LandRecord } from "../types";

interface AnalysisPanelProps {
  records: LandRecord[];
}

export default function AnalysisPanel({ records }: AnalysisPanelProps) {
  // Aggregate statistics
  const totalCount = records.length;
  const verifiedCount = records.filter((r) => r.isVerified).length;
  
  // Custom parsing helper for Marathi numeric text
  const parseMarathiAreaToDouble = (areaString: string): number => {
    if (!areaString) return 0;
    // Strip text like "हे.आर.", "हे.", "आर." and commas
    let cleaned = areaString
      .replace(/[^\d\.]/g, "") // remove non-digits or non-dots
      .replace(/,/g, "");
    
    // Convert Marathi numbers standard characters to absolute english numerals
    const devanagariDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
    for (let i = 0; i < 10; i++) {
        const regex = new RegExp(devanagariDigits[i], "g");
        cleaned = cleaned.replace(regex, String(i));
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  const totalHoldingArea = records.reduce((sum, item) => {
    return sum + parseMarathiAreaToDouble(item.totalArea);
  }, 0);

  // Legal Flags Extraction Breakdown
  const flagsMapping = [
    { label: "सीलिंग (Ceiling Limit)", count: records.filter((r) => r.ceiling === "YES").length, color: "bg-red-50 text-red-600 border-red-200" },
    { label: "वन / फॉरेस्ट (Forest Land)", count: records.filter((r) => r.forest === "YES").length, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    { label: "कुळ (Tenant Enrolled)", count: records.filter((r) => r.kul === "YES").length, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
    { label: "नवीन शर्त (New Conditions)", count: records.filter((r) => r.newCondition === "YES").length, color: "bg-amber-50 text-amber-600 border-amber-200" },
    { label: "अतिक्रमण (Encroached)", count: records.filter((r) => r.encroachment === "YES").length, color: "bg-orange-50 text-orange-600 border-orange-200" },
    { label: "कलम ३६ आदिवासी (Tribal Protections)", count: records.filter((r) => r.tribal === "YES").length, color: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200" },
  ];

  // District distribution
  const districtDistribution = records.reduce((acc: { [key: string]: number }, item) => {
    const district = item.district || "Unspecified";
    acc[district] = (acc[district] || 0) + 1;
    return acc;
  }, {});

  const districtArray = Object.entries(districtDistribution).map(([name, count]) => ({
    name,
    count,
    percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
  }));

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

        {/* High Level Quick KPI Bento Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition duration-200">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <LandPlot className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-medium tracking-wider uppercase">Active Holdings</span>
            </div>
            <p className="text-lg font-bold text-gray-900 font-mono tracking-tight">
              {totalHoldingArea.toFixed(2)} <span className="text-xs font-normal text-gray-500">हे.आर</span>
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition duration-200">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CheckCircle className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-medium tracking-wider uppercase">Verified Rate</span>
            </div>
            <p className="text-lg font-bold text-gray-900 font-mono tracking-tight">
              {totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0}%
              <span className="text-[10px] font-normal text-gray-500 ml-1">({verifiedCount}/{totalCount})</span>
            </p>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {flagsMapping.map((flag, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all hover:scale-[1.01] ${flag.color}`}
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

        {/* District breaking chart */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Map className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Districts Breakdown
            </h3>
          </div>

          {districtArray.length === 0 ? (
            <div className="p-4 border border-dashed border-gray-300 rounded-xl text-center">
              <p className="text-[11px] text-gray-500">Districts will list on document match.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {districtArray.map((district) => (
                <div key={district.name} className="text-xs">
                  <div className="flex justify-between text-gray-600 font-medium mb-1">
                    <span className="truncate">{district.name}</span>
                    <span className="font-mono text-gray-500 text-[11px]">
                      {district.count} item{district.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 border border-gray-200/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${district.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
