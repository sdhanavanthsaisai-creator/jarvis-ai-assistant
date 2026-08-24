import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Cpu, FolderOpen, Palette, Mic, Bell, Shield, Save } from 'lucide-react';
import { useJarvisStore } from '../lib/store';

// ══════════════════════════════════════════════════════
// SETTINGS PAGE — Configuration Hub
// ══════════════════════════════════════════════════════

type SettingsTab = 'ai' | 'vault' | 'theme' | 'voice' | 'system';

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'ai', label: 'AI Engine', icon: Cpu },
  { id: 'vault', label: 'Vault Paths', icon: FolderOpen },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'system', label: 'System', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const { currentModel, setCurrentModel } = useJarvisStore();

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <SettingsIcon size={20} className="text-jarvis-text-dim" />
        <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-text uppercase">Settings</h1>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* ── Tab Sidebar ── */}
        <div className="w-48 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-item w-full ${activeTab === id ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'ai' && <AITab currentModel={currentModel} setCurrentModel={setCurrentModel} />}
            {activeTab === 'vault' && <VaultTab />}
            {activeTab === 'theme' && <ThemeTab />}
            {activeTab === 'voice' && <VoiceTab />}
            {activeTab === 'system' && <SystemTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── AI Engine Tab ──
function AITab({ currentModel, setCurrentModel }: { currentModel: string; setCurrentModel: (m: string) => void }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Ollama Configuration" />

      <div className="glass-card neon-border p-5 space-y-4">
        <Field label="Ollama Host">
          <input
            type="text"
            defaultValue="http://localhost:11434"
            className="settings-input"
          />
        </Field>

        <Field label="Active Model">
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="settings-input"
          >
            <option value="llama3.2">Llama 3.2 (Fast)</option>
            <option value="llama3.2:1b">Llama 3.2 1B (Ultra-Fast)</option>
            <option value="llama3.2:3b">Llama 3.2 3B (Fast)</option>
            <option value="phi3:mini">Phi-3 Mini (Fast)</option>
            <option value="mistral">Mistral 7B (Smart)</option>
            <option value="codellama">CodeLlama (Coding)</option>
          </select>
        </Field>

        <Field label="System Prompt">
          <textarea
            defaultValue="You are JARVIS, an advanced AI personal assistant. You are helpful, articulate, and speak with British formality."
            rows={3}
            className="settings-input resize-none"
          />
        </Field>

        <Field label="Max History Length">
          <input type="number" defaultValue={20} className="settings-input w-24" />
        </Field>
      </div>
    </div>
  );
}

// ── Vault Paths Tab ──
function VaultTab() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Obsidian Vault" />
      <div className="glass-card neon-border p-5 space-y-4">
        <Field label="Vault Path">
          <div className="flex gap-2">
            <input
              type="text"
              defaultValue="C:\\Users\\User\\Documents\\ObsidianVault"
              className="settings-input flex-1"
            />
            <button className="btn-hud text-xs">Browse</button>
          </div>
        </Field>
        <Field label="Auto-sync on file change">
          <Toggle defaultChecked />
        </Field>
        <Field label="Watch pattern">
          <input type="text" defaultValue="**/*.md" className="settings-input" />
        </Field>
      </div>

      <SectionTitle title="File Search" />
      <div className="glass-card neon-border p-5 space-y-4">
        <Field label="Search directories">
          <textarea
            defaultValue="C:\Users\User\Documents\nC:\Users\User\Desktop"
            rows={2}
            className="settings-input resize-none"
          />
        </Field>
      </div>
    </div>
  );
}

// ── Theme Tab ──
function ThemeTab() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Appearance" />
      <div className="glass-card neon-border p-5 space-y-4">
        <Field label="Theme">
          <select className="settings-input">
            <option value="hud-dark">Iron Man HUD Dark (Default)</option>
            <option value="hud-light">Iron Man HUD Light</option>
            <option value="stark-dark">Stark Dark</option>
          </select>
        </Field>
        <Field label="Primary Accent">
          <div className="flex gap-2">
            {['#00d4ff', '#ffd700', '#ff4444', '#00ff88'].map((color) => (
              <div
                key={color}
                className="w-8 h-8 rounded-lg cursor-pointer border-2 border-transparent hover:border-white/20 transition-all"
                style={{ background: color, boxShadow: `0 0 10px ${color}40` }}
              />
            ))}
          </div>
        </Field>
        <Field label="Scan-line overlay">
          <Toggle defaultChecked />
        </Field>
        <Field label="HUD grid background">
          <Toggle defaultChecked />
        </Field>
        <Field label="Glassmorphism intensity">
          <input type="range" min={0} max={100} defaultValue={60} className="w-full accent-jarvis-cyan" />
        </Field>
      </div>
    </div>
  );
}

// ── Voice Tab ──
function VoiceTab() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Voice Configuration" />
      <div className="glass-card neon-border p-5 space-y-4">
        <Field label="Wake Word">
          <input type="text" defaultValue="JARVIS" className="settings-input" />
        </Field>
        <Field label="Language">
          <select className="settings-input">
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
          </select>
        </Field>
        <Field label="TTS Rate">
          <input type="range" min={0.5} max={2} step={0.1} defaultValue={1} className="w-full accent-jarvis-cyan" />
        </Field>
        <Field label="TTS Pitch">
          <input type="range" min={0.5} max={1.5} step={0.1} defaultValue={0.9} className="w-full accent-jarvis-cyan" />
        </Field>
        <Field label="Auto-listen after response">
          <Toggle />
        </Field>
      </div>
    </div>
  );
}

// ── System Tab ──
function SystemTab() {
  return (
    <div className="space-y-6">
      <SectionTitle title="System" />
      <div className="glass-card neon-border p-5 space-y-4">
        <Field label="Start on system boot">
          <Toggle />
        </Field>
        <Field label="Minimize to tray">
          <Toggle defaultChecked />
        </Field>
        <Field label="Notifications">
          <Toggle defaultChecked />
        </Field>
      </div>

      <SectionTitle title="Danger Zone" />
      <div className="glass-card border border-jarvis-arc/30 p-5 space-y-4">
        <Field label="Clear conversation history">
          <button className="btn-hud text-xs border-jarvis-arc/30 text-jarvis-arc hover:bg-jarvis-arc/10">
            Clear History
          </button>
        </Field>
        <Field label="Reset all settings">
          <button className="btn-hud text-xs border-jarvis-arc/30 text-jarvis-arc hover:bg-jarvis-arc/10">
            Reset to Defaults
          </button>
        </Field>
      </div>
    </div>
  );
}

// ── Reusable Components ──

function SectionTitle({ title }: { title: string }) {
  return <h2 className="font-hud text-xs tracking-[0.15em] text-jarvis-cyan uppercase">{title}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-jarvis-text-dim min-w-[160px]">{label}</label>
      <div className="flex-1 max-w-md">{children}</div>
    </div>
  );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-jarvis-cyan/30' : 'bg-jarvis-border'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
          checked
            ? 'left-[calc(100%-18px)] bg-jarvis-cyan shadow-[0_0_8px_rgba(0,212,255,0.5)]'
            : 'left-0.5 bg-jarvis-text-dim'
        }`}
      />
    </button>
  );
}
