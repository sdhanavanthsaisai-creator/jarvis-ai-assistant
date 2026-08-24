import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow, Play, Pause, RefreshCw, Upload, CheckCircle, XCircle,
  Loader2, Zap, Clock, Settings, ExternalLink, AlertTriangle,
} from 'lucide-react';
import {
  listWorkflows, triggerWorkflow, getExecutions, importWorkflow,
  isN8nConfigured, testConnection, setN8nConfig,
  type N8nWorkflow, type N8nExecution,
} from '../lib/n8n';

// ══════════════════════════════════════════════════════
// WORKFLOWS PAGE — n8n Integration
// ══════════════════════════════════════════════════════

const BUNDLED_WORKFLOWS = [
  { name: 'HubSpot Customer Onboarding', file: 'crm/hubspot-webhook-onboard.json', category: 'CRM', desc: 'Webhook → welcome email → schedule call → assign CSM' },
  { name: 'HubSpot Automation', file: 'crm/hubspot-automate.json', category: 'CRM', desc: 'Contact sync and deal stage management' },
  { name: 'Facebook Lead Ads', file: 'lead-gen/facebook-lead-ads.json', category: 'Lead Gen', desc: 'Captures Facebook leads and routes them' },
  { name: 'Jotform Trigger', file: 'lead-gen/jotform-trigger.json', category: 'Lead Gen', desc: 'Form submission → creates contact/task' },
  { name: 'Typeform → ClickUp', file: 'lead-gen/typeform-clickup.json', category: 'Lead Gen', desc: 'Form → ClickUp task + spreadsheet log' },
  { name: 'Mailchimp Newsletter', file: 'email/mailchimp-cron.json', category: 'Email', desc: 'Scheduled newsletter creation and sending' },
  { name: 'ConvertKit Sequences', file: 'email/convertkit-triggered.json', category: 'Email', desc: 'Email sequence automation' },
  { name: 'Gmail + Calendar', file: 'email/gmail-calendar.json', category: 'Email', desc: 'Auto-sends meeting invites and follow-ups' },
  { name: 'Shopify → Twitter', file: 'ecommerce/shopify-twitter.json', category: 'E-Commerce', desc: 'New order → auto-announces on Twitter' },
  { name: 'Google Analytics Report', file: 'seo/google-analytics-report.json', category: 'SEO', desc: 'Scheduled website analytics pull' },
  { name: 'ClickUp Webhook', file: 'project-mgmt/clickup-webhook.json', category: 'PM', desc: 'Task update automations' },
  { name: 'Asana Webhook', file: 'project-mgmt/asana-webhook.json', category: 'PM', desc: 'Task creation/update triggers' },
  { name: 'Calendly → Notion', file: 'website/calendly-notion.json', category: 'Website', desc: 'Booking → creates Notion client page' },
  { name: 'WordPress Webhook', file: 'website/wordpress-webhook.json', category: 'Website', desc: 'Content automation on publish' },
  { name: 'Google Sheets Webhook', file: 'website/sheets-webhook.json', category: 'Website', desc: 'Form data → spreadsheet logging' },
  { name: 'Facebook Page Update', file: 'social/facebook-update.json', category: 'Social', desc: 'Page update notifications' },
];

const CATEGORY_COLORS: Record<string, string> = {
  CRM: 'text-jarvis-cyan',
  'Lead Gen': 'text-green-400',
  Email: 'text-jarvis-gold',
  'E-Commerce': 'text-purple-400',
  SEO: 'text-orange-400',
  PM: 'text-blue-400',
  Website: 'text-pink-400',
  Social: 'text-cyan-300',
};

type Tab = 'bundled' | 'installed' | 'executions';

export default function Workflows() {
  const [tab, setTab] = useState<Tab>('bundled');
  const [configured, setConfigured] = useState(isN8nConfigured());
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(!configured);
  const [n8nUrl, setN8nUrl] = useState('http://localhost:5678');
  const [n8nKey, setN8nKey] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  // ── Load installed workflows ──
  const loadWorkflows = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const list = await listWorkflows();
      setWorkflows(list);
    } catch (e: any) {
      setStatusMsg(`Failed to load: ${e.message}`);
    }
    setLoading(false);
  }, [configured]);

  // ── Load executions ──
  const loadExecutions = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const execs = await getExecutions(undefined, 20);
      setExecutions(execs);
    } catch { /* */ }
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    if (tab === 'installed' && configured) loadWorkflows();
    if (tab === 'executions' && configured) loadExecutions();
  }, [tab, configured, loadWorkflows, loadExecutions]);

  // ── Save n8n settings ──
  const handleSaveSettings = async () => {
    setN8nConfig(n8nUrl, n8nKey);
    const result = await testConnection();
    if (result.ok) {
      setConfigured(true);
      setShowSettings(false);
      setStatusMsg('Connected to n8n!');
      loadWorkflows();
    } else {
      setStatusMsg(result.message);
    }
  };

  // ── Import a bundled workflow ──
  const handleImport = async (filePath: string, name: string) => {
    if (!configured) { setShowSettings(true); return; }
    setImporting(name);
    try {
      const res = await fetch(`/n8n-workflows/${filePath}`);
      const json = await res.json();
      await importWorkflow(json);
      setStatusMsg(`Imported: ${name}`);
      loadWorkflows();
    } catch (e: any) {
      setStatusMsg(`Import failed: ${e.message}`);
    }
    setImporting(null);
  };

  // ── Trigger a workflow ──
  const handleTrigger = async (id: string, name: string) => {
    setStatusMsg(`Triggering: ${name}...`);
    try {
      await triggerWorkflow(id, { source: 'jarvis', timestamp: Date.now() });
      setStatusMsg(`Triggered: ${name}`);
      loadExecutions();
    } catch (e: any) {
      setStatusMsg(`Trigger failed: ${e.message}`);
    }
  };

  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle size={14} className="text-green-400" />;
    if (s === 'error') return <XCircle size={14} className="text-red-400" />;
    return <Loader2 size={14} className="text-jarvis-cyan animate-spin" />;
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Workflow size={20} className="text-jarvis-cyan" />
          <h1 className="font-hud text-lg tracking-[0.15em] text-jarvis-cyan uppercase glow-text-cyan">
            n8n Workflows
          </h1>
          {configured && (
            <span className="text-[0.6rem] font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded">CONNECTED</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="btn-hud text-xs">
            <Settings size={14} /> Config
          </button>
          <a href={n8nUrl} target="_blank" rel="noopener noreferrer" className="btn-hud text-xs">
            <ExternalLink size={14} /> Open n8n
          </a>
        </div>
      </div>

      {/* ── Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="glass-card neon-border p-4 overflow-hidden">
            <h3 className="font-hud text-xs tracking-[0.15em] text-jarvis-gold uppercase mb-3">n8n Connection</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={n8nUrl} onChange={e => setN8nUrl(e.target.value)}
                placeholder="n8n URL (e.g. http://localhost:5678)"
                className="settings-input" />
              <input value={n8nKey} onChange={e => setN8nKey(e.target.value)} type="password"
                placeholder="n8n API Key"
                className="settings-input" />
              <button onClick={handleSaveSettings} className="btn-hud justify-center">
                <Zap size={14} /> Test & Connect
              </button>
            </div>
            <p className="text-[0.6rem] text-jarvis-text-dim/50 mt-2">
              Get your API key from n8n Settings → API → Create API Key
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status ── */}
      {statusMsg && (
        <div className="glass-card border border-jarvis-gold/20 px-4 py-2 rounded-lg flex items-center gap-2">
          <Zap size={14} className="text-jarvis-gold" />
          <span className="text-xs text-jarvis-gold">{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-auto text-jarvis-text-dim hover:text-jarvis-text">✕</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {([
          ['bundled', '📦 Bundled Workflows (16)'],
          ['installed', '🔗 Installed on n8n'],
          ['executions', '⚡ Recent Executions'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
              tab === key
                ? 'bg-jarvis-cyan/15 border border-jarvis-cyan/40 text-jarvis-cyan'
                : 'border border-jarvis-border text-jarvis-text-dim hover:text-jarvis-text'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex items-center gap-2 text-jarvis-cyan"><Loader2 size={16} className="animate-spin" /> Loading...</div>}

        {/* ── Bundled Tab ── */}
        {tab === 'bundled' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {BUNDLED_WORKFLOWS.map((wf) => (
              <motion.div key={wf.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card neon-border p-4 group hover:border-jarvis-cyan/40 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`text-[0.6rem] font-mono uppercase tracking-wider ${CATEGORY_COLORS[wf.category] || 'text-jarvis-text-dim'}`}>
                      {wf.category}
                    </span>
                    <h3 className="text-sm font-semibold text-jarvis-text group-hover:text-jarvis-cyan transition-colors mt-1">
                      {wf.name}
                    </h3>
                  </div>
                  <button onClick={() => handleImport(wf.file, wf.name)} disabled={importing === wf.name}
                    className="btn-hud text-[0.6rem] px-2 py-1 disabled:opacity-40">
                    {importing === wf.name ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Import
                  </button>
                </div>
                <p className="text-xs text-jarvis-text-dim leading-relaxed">{wf.desc}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Installed Tab ── */}
        {tab === 'installed' && !configured && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <AlertTriangle size={24} className="text-jarvis-gold" />
            <p className="text-sm text-jarvis-text-dim">Configure n8n connection first</p>
            <button onClick={() => setShowSettings(true)} className="btn-hud text-xs"><Settings size={14} /> Configure</button>
          </div>
        )}
        {tab === 'installed' && configured && (
          <div className="space-y-2">
            {workflows.map((wf) => (
              <div key={wf.id} className="glass-card neon-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${wf.active ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-jarvis-text-dim'}`} />
                  <div>
                    <h3 className="text-sm font-semibold text-jarvis-text">{wf.name}</h3>
                    <p className="text-[0.6rem] text-jarvis-text-dim font-mono">{wf.nodes} nodes · {wf.active ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTrigger(wf.id, wf.name)} className="btn-hud text-[0.6rem] px-2 py-1">
                    <Play size={12} /> Trigger
                  </button>
                </div>
              </div>
            ))}
            {workflows.length === 0 && !loading && (
              <p className="text-sm text-jarvis-text-dim text-center py-8">No workflows found. Import from the Bundled tab first.</p>
            )}
          </div>
        )}

        {/* ── Executions Tab ── */}
        {tab === 'executions' && !configured && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <AlertTriangle size={24} className="text-jarvis-gold" />
            <p className="text-sm text-jarvis-text-dim">Configure n8n connection first</p>
          </div>
        )}
        {tab === 'executions' && configured && (
          <div className="space-y-2">
            {executions.map((e) => (
              <div key={e.id} className="glass-card neon-border p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(e.status)}
                  <div>
                    <h3 className="text-sm text-jarvis-text">{e.workflowName || `Workflow #${e.workflowId}`}</h3>
                    <p className="text-[0.6rem] text-jarvis-text-dim font-mono">
                      {new Date(e.startedAt).toLocaleString()}
                      {e.duration ? ` · ${(e.duration / 1000).toFixed(1)}s` : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-[0.6rem] font-mono px-2 py-0.5 rounded ${
                  e.status === 'success' ? 'text-green-400 bg-green-400/10' :
                  e.status === 'error' ? 'text-red-400 bg-red-400/10' :
                  'text-jarvis-cyan bg-jarvis-cyan/10'
                }`}>{e.status}</span>
              </div>
            ))}
            {executions.length === 0 && !loading && (
              <p className="text-sm text-jarvis-text-dim text-center py-8">No executions yet. Trigger a workflow to see results here.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
