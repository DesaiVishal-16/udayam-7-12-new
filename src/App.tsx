import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  HelpCircle, 
  Activity, 
  Lock, 
  Coins, 
  TrendingUp, 
  Server,
  Globe,
  LayoutDashboard,
  History,
  ChevronLeft
} from "lucide-react";
import { LandRecord } from "./types";
import logoUrl from "../assets/logo.png";
import UploadSection from "./components/UploadSection";
import AnalysisPanel from "./components/AnalysisPanel";
import RecordsTable from "./components/RecordsTable";
import ManualRecordDialog from "./components/ManualRecordDialog";

// Initial seed record to showcase features on fresh start
const SEED_RECORD: LandRecord = {
  id: "seed-item-1",
  date: "2026-05-27",
  fileName: "seed_saoatbara_sample.pdf",
  bgTenure: "नवीन शर्त (अविभाज्य)",
  village: "वाकडी",
  taluka: "कोपरगाव",
  district: "अहमदनगर",
  totalArea: "२.४५ हे.आर.",
  lastMutation: "४५३२",
  
  // Specific Seeds
  ceiling: "NO",
  forest: "YES",  // Forest indicator YES
  inam: "NO",
  bhoodan: "NO",
  gaothan: "NO",
  kul: "YES",     // Tenant rights YES
  watan: "NO",
  newCondition: "YES", // Condition YES
  encroachment: "NO",
  grazing: "NO",
  devasthan: "NO",
  tribal: "NO",
  rehabilitation: "NO",
  leasehold: "NO",
  waqf: "NO",
  fragmentLimit: "NO",
  apk: "NO",
  ekuk: "NO",
  hypothecation: "NO",
  bunding: "NO",
  bhumidhari: "NO",
  tagai: "NO",
  cultivation: "YES", // Cultivated YES

  isVerified: false,
  confidenceScore: 92,
};

const SEED_RECORD_2: LandRecord = {
  id: "seed-item-2",
  date: "2026-05-26",
  fileName: "7-12_mula_extract.jpeg",
  bgTenure: "भोगवटदार वर्ग - १", // Occupant Class 1
  village: "मुळाणे",
  taluka: "सिन्नर",
  district: "नाशिक",
  totalArea: "१.८५ हे.आर.",
  lastMutation: "३१९२",
  
  // Specific Seeds
  ceiling: "NO",
  forest: "NO",
  inam: "NO",
  bhoodan: "NO",
  gaothan: "NO",
  kul: "NO",
  watan: "NO",
  newCondition: "NO",
  encroachment: "NO",
  grazing: "YES",  // Grazing land
  devasthan: "NO",
  tribal: "YES", // Tribal land check YES
  rehabilitation: "NO",
  leasehold: "NO",
  waqf: "NO",
  fragmentLimit: "YES", // Fragment limit YES
  apk: "NO",
  ekuk: "NO",
  hypothecation: "YES", // Hypothecated YES
  bunding: "NO",
  bhumidhari: "NO",
  tagai: "NO",
  cultivation: "YES", 

  isVerified: true,
  confidenceScore: 96,
};

export default function App() {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [utcDate, setUtcDate] = useState("");

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      setUtcDate(now.toISOString().split("T")[0]);
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  // Synchronise localStorage on startup
  useEffect(() => {
    const cached = localStorage.getItem("maharashtra_7_12_extracted_records");
    if (cached) {
      try {
        setRecords(JSON.parse(cached));
      } catch (err) {
        console.error("Failed to parse cached 7_12 records:", err);
        setRecords([SEED_RECORD, SEED_RECORD_2]);
      }
    } else {
      setRecords([SEED_RECORD, SEED_RECORD_2]);
    }

    // Ping Backend API Connection status checker
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok" && data.hasApiKey) {
          setApiConnected(true);
        }
      })
      .catch((err) => console.log("Host connection is offline, running local server fallbacks: ", err));
  }, []);

  // Sync cache changes
  const updateCache = (newRecords: LandRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem("maharashtra_7_12_extracted_records", JSON.stringify(newRecords));
  };

  // Callback: records extracted from UploadSection
  const handleRecordsExtracted = (newExtracted: LandRecord[]) => {
    updateCache([...newExtracted, ...records]);
  };

  // Callback: edit record
  const handleUpdateRecord = (id: string, updatedRecord: LandRecord) => {
    const next = records.map((r) => (r.id === id ? updatedRecord : r));
    updateCache(next);
  };

  // Callback: batch delete records
  const handleDeleteRecords = (ids: string[]) => {
    const next = records.filter((r) => !ids.includes(r.id));
    updateCache(next);
  };

  // Callback: save manual entry
  const handleSaveManualRecord = (record: LandRecord) => {
    updateCache([record, ...records]);
  };

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans selection:bg-indigo-100 selection:text-indigo-700 antialiased flex" id="applet-container">
      
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? "w-16" : "w-60"} shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 transition-all duration-200`} id="sidebar">
        {/* Logo Section */}
        <div className={`${sidebarCollapsed ? "p-3" : "p-5"} border-b border-gray-100`}>
          <div className={`flex ${sidebarCollapsed ? "justify-center" : "items-center gap-3"}`}>
            <div className="w-12 h-12 shrink-0 overflow-hidden">
              <img src={logoUrl} alt="Udayam AI Labs" className="w-full h-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Udayam AI Labs</p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Intelligence Redefined</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${sidebarCollapsed ? "p-2 space-y-2" : "p-3 space-y-1"}`}>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
            title={sidebarCollapsed ? "Dashboard" : undefined}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              activeTab === "history"
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
            title={sidebarCollapsed ? "History" : undefined}
          >
            <History className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>History</span>}
          </button>
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 cursor-pointer`}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`w-4 h-4 shrink-0 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`} />
            {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 py-6 px-6 md:px-8 max-w-7xl mx-auto flex flex-col gap-6">
        {activeTab === "dashboard" ? (
          <>
            {/* Dashboard Header */}
            <header className="border border-gray-200 bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between" id="dashboard-header">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                Dashboard
                <span className="text-gray-300 font-light text-xl md:text-2xl">-</span>
                <span className="text-base md:text-lg font-bold text-gray-900">7/12 Smart Scan</span>
              </h1>
              <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-600 font-mono text-[10px]">{utcDate}</span>
              </div>
            </header>

            {/* Main split interactive section */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-main">
              {/* Upload module (Col 5) */}
              <div className="lg:col-span-5 flex flex-col gap-6 h-full">
                <UploadSection 
                  onRecordsExtracted={handleRecordsExtracted} 
                  apiConnected={apiConnected}
                />
              </div>

              {/* Real-time Analytics Visualisation Board (Col 7) */}
              <div className="lg:col-span-7 h-full">
                <AnalysisPanel records={records} />
              </div>
            </main>

            {/* Interactive 31-column Editable Table View */}
            <section id="extraction-spreadsheet-section">
              <RecordsTable
                records={records}
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecords={handleDeleteRecords}
                onAddManualRecord={() => setIsManualOpen(true)}
              />
            </section>

            {/* Manual Creation Slides dialog */}
            <ManualRecordDialog
              isOpen={isManualOpen}
              onClose={() => setIsManualOpen(false)}
              onSave={handleSaveManualRecord}
            />

            {/* Footer System Details */}
            <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-200 mt-4 flex flex-col sm:flex-row items-center justify-between gap-2" id="primary-footer">
              <p>© 2026 Udayam AI Labs. All rights reserved.</p>
              <p>
                Powered by{" "}
                <a href="https://udayam.co.in" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Udayam AI Labs
                </a>
              </p>
            </footer>
          </>
        ) : (
          <>
            {/* History Header */}
            <header className="border border-gray-200 bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between" id="history-header">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <History className="w-6 h-6 text-indigo-600" />
                History
              </h1>
              <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-600 font-mono text-[10px]">{utcDate}</span>
              </div>
            </header>

            <section id="history-spreadsheet-section" className="flex-1">
              <RecordsTable
                records={records}
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecords={handleDeleteRecords}
                onAddManualRecord={() => setIsManualOpen(true)}
              />
            </section>

            <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-200 mt-4 flex flex-col sm:flex-row items-center justify-between gap-2" id="history-footer">
              <p>© 2026 Udayam AI Labs. All rights reserved.</p>
              <p>
                Powered by{" "}
                <a href="https://udayam.co.in" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Udayam AI Labs
                </a>
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
