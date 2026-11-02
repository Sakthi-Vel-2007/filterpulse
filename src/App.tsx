import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import SimBadge from "./components/SimBadge";
import DemoControls from "./components/DemoControls";

// Pages
import Overview from "./pages/Overview";
import WaterQuality from "./pages/WaterQuality";
import PumpLoad from "./pages/PumpLoad";
import FilterHealth from "./pages/FilterHealth";
import Alerts from "./pages/Alerts";
import Compare from "./pages/Compare";
import About from "./pages/About";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-16 md:pl-60 min-w-0 transition-all duration-200">
        {/* Sticky Top Bar with Persistent Badge */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1e3a5f] bg-[#0a1628]/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-wide text-gray-200">
              FilterPulse <span className="text-cyan-400 font-normal">| Prognostics Engine</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <SimBadge />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/water" element={<WaterQuality />} />
            <Route path="/pump" element={<PumpLoad />} />
            <Route path="/filters" element={<FilterHealth />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>

      {/* Floating Demo Controls Panel */}
      <DemoControls />
    </div>
  );
}
