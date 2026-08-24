import React, { useCallback } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import StartupBriefing from './components/StartupBriefing';
import FloatingMic from './components/FloatingMic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Newspaper,
  FolderOpen,
  CheckSquare,
  Settings,
  Cloud,
  Workflow,
  Power,
  Minus,
  Square,
} from 'lucide-react';

// ── Page imports (lazy loaded) ──
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Stocks = React.lazy(() => import('./pages/Stocks'));
const News = React.lazy(() => import('./pages/News'));
const Files = React.lazy(() => import('./pages/Files'));
const Habits = React.lazy(() => import('./pages/Habits'));
const Weather = React.lazy(() => import('./pages/Weather'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const WorkflowsPage = React.lazy(() => import('./pages/Workflows'));

// ══════════════════════════════════════════════════════
// NAVIGATION CONFIG
// ══════════════════════════════════════════════════════

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/stocks', label: 'Stocks', icon: TrendingUp },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/weather', label: 'Weather', icon: Cloud },
  { path: '/files', label: 'Files', icon: FolderOpen },
  { path: '/habits', label: 'Habits', icon: CheckSquare },
  { path: '/workflows', label: 'Workflows', icon: Workflow },
  { path: '/settings', label: 'Settings', icon: Settings },
];

// ══════════════════════════════════════════════════════
// TITLE BAR
// ══════════════════════════════════════════════════════

function TitleBar() {
  const handleMinimize = () => window.electronAPI?.window.minimize();
  const handleMaximize = () => window.electronAPI?.window.maximize();
  const handleClose = () => window.electronAPI?.window.close();

  return (
    <div className="h-9 bg-jarvis-bg border-b border-jarvis-border flex items-center justify-between px-4 select-none"
         style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-jarvis-cyan shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
        <span className="font-hud text-xs tracking-[0.2em] text-jarvis-cyan uppercase">
          J.A.R.V.I.S
        </span>
      </div>

      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button onClick={handleMinimize} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors">
          <Minus size={14} className="text-jarvis-text-dim" />
        </button>
        <button onClick={handleMaximize} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors">
          <Square size={12} className="text-jarvis-text-dim" />
        </button>
        <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-jarvis-arc/20 transition-colors group">
          <Power size={14} className="text-jarvis-text-dim group-hover:text-jarvis-arc" />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════

function Sidebar() {
  return (
    <aside className="w-56 bg-jarvis-bg-elevated border-r border-jarvis-border flex flex-col py-4">
      {/* ── Arc Reactor Logo ── */}
      <div className="flex flex-col items-center mb-6 px-4">
        <div className="relative w-14 h-14 mb-3">
          <div className="absolute inset-0 rounded-full border-2 border-jarvis-cyan/40 animate-glow-breathe" />
          <div className="absolute inset-1 rounded-full border border-jarvis-cyan/20" />
          <div className="absolute inset-2 rounded-full bg-jarvis-cyan/10 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-jarvis-cyan/60 shadow-[0_0_12px_rgba(0,212,255,0.6)]" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-hud text-[0.6rem] tracking-[0.25em] text-jarvis-cyan/80 uppercase">STARK INDUSTRIES</p>
          <p className="font-mono text-[0.55rem] text-jarvis-text-dim mt-0.5">Neural Network v3.2</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Status Footer ── */}
      <div className="px-4 pt-4 border-t border-jarvis-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="status-dot status-dot-green" />
          <span className="text-xs text-jarvis-text-dim font-mono">Ollama Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-dot" />
          <span className="text-xs text-jarvis-text-dim font-mono">System Ready</span>
        </div>
        <p className="text-[0.6rem] text-jarvis-text-dim/50 font-mono mt-2">
          UPTIME: {Math.floor(Date.now() / 1000 % 86400 / 3600)}h {Math.floor(Date.now() / 1000 % 3600 / 60)}m
        </p>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════
// MAIN CONTENT AREA
// ══════════════════════════════════════════════════════

function ContentArea() {
  const location = useLocation();

  return (
    <main className="flex-1 overflow-hidden relative hud-grid-bg">
      {/* ── Radial background glow ── */}
      <div className="absolute inset-0 pointer-events-none hud-radial-bg" />

      {/* ── Page Content with transitions ── */}
      <div className="relative h-full overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            <React.Suspense fallback={<LoadingScreen />}>
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/stocks" element={<Stocks />} />
                <Route path="/news" element={<News />} />
                <Route path="/weather" element={<Weather />} />
                <Route path="/files" element={<Files />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/workflows" element={<WorkflowsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

// ══════════════════════════════════════════════════════
// LOADING SCREEN
// ══════════════════════════════════════════════════════

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-jarvis-cyan/40 animate-spin mx-auto mb-4 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border border-jarvis-cyan/20" />
        </div>
        <p className="font-hud text-xs tracking-[0.2em] text-jarvis-cyan/60 uppercase">Loading Module</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════

export default function App() {
  return (
    <HashRouter>
      <div className="h-screen w-screen flex flex-col bg-jarvis-bg overflow-hidden">
        {/* ── Custom Title Bar ── */}
        <TitleBar />

        {/* ── Main Layout ── */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <ContentArea />
        </div>

        {/* ── Floating Arc Reactor Mic ── */}
        <FloatingMic />

        {/* ── Startup Voice Briefing ── */}
        <StartupBriefing />

        {/* ── Scan-line Overlays ── */}
        <div className="scan-line-overlay" />
        <div className="scanlines" />
      </div>
    </HashRouter>
  );
}
