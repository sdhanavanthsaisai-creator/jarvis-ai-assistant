// ══════════════════════════════════════════════════════
// N8N CLIENT — Trigger, monitor, and manage workflows
// ══════════════════════════════════════════════════════

export interface N8nConfig {
  url: string;      // e.g. http://localhost:5678
  apiKey: string;   // n8n API key
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: number;
  updatedAt: string;
  tags?: string[];
  category?: string;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
}

// ── Stored config (localStorage) ──
function getConfig(): N8nConfig {
  if (typeof window === 'undefined') return { url: '', apiKey: '' };
  return {
    url: localStorage.getItem('n8n_url') || 'http://localhost:5678',
    apiKey: localStorage.getItem('n8n_api_key') || '',
  };
}

export function setN8nConfig(url: string, apiKey: string): void {
  localStorage.setItem('n8n_url', url);
  localStorage.setItem('n8n_api_key', apiKey);
}

export function getN8nConfig(): N8nConfig {
  return getConfig();
}

export function isN8nConfigured(): boolean {
  const config = getConfig();
  return !!(config.url && config.apiKey);
}

// ── API helpers ──
async function n8nFetch(path: string, options: RequestInit = {}): Promise<any> {
  const config = getConfig();
  if (!config.apiKey) throw new Error('n8n API key not configured');

  const url = `${config.url.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-N8N-API-KEY': config.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ── List all workflows ──
export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const data = await n8nFetch('/api/v1/workflows');
  const workflows = data.data || data || [];
  return workflows.map((w: any) => ({
    id: w.id,
    name: w.name,
    active: w.active,
    nodes: w.nodes?.length || 0,
    updatedAt: w.updatedAt,
    tags: w.tags?.map((t: any) => t.name) || [],
  }));
}

// ── Get single workflow ──
export async function getWorkflow(id: string): Promise<any> {
  return n8nFetch(`/api/v1/workflows/${id}`);
}

// ── Trigger a workflow by ID ──
export async function triggerWorkflow(id: string, data?: Record<string, any>): Promise<N8nExecution> {
  const result = await n8nFetch(`/api/v1/workflows/${id}/run`, {
    method: 'POST',
    body: JSON.stringify({ data: data || {} }),
  });
  return {
    id: result.id || `exec-${Date.now()}`,
    workflowId: id,
    workflowName: result.workflow?.name || '',
    status: 'running',
    startedAt: new Date().toISOString(),
  };
}

// ── Trigger workflow by webhook (no API key needed) ──
export async function triggerWebhook(workflowId: string, payload?: Record<string, any>): Promise<any> {
  const config = getConfig();
  const url = `${config.url.replace(/\/$/, '')}/webhook/${workflowId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || { source: 'jarvis', timestamp: Date.now() }),
  });
  return res.json();
}

// ── Get recent executions ──
export async function getExecutions(workflowId?: string, limit = 20): Promise<N8nExecution[]> {
  let path = `/api/v1/executions?limit=${limit}`;
  if (workflowId) path += `&workflowId=${workflowId}`;
  const data = await n8nFetch(path);
  const execs = data.data || data || [];
  return execs.map((e: any) => ({
    id: e.id,
    workflowId: e.workflowId,
    workflowName: e.workflowData?.name || '',
    status: e.finished ? (e.success ? 'success' : 'error') : 'running',
    startedAt: e.startedAt,
    finishedAt: e.stoppedAt,
    duration: e.stoppedAt ? new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime() : undefined,
  }));
}

// ── Activate/deactivate workflow ──
export async function toggleWorkflow(id: string, active: boolean): Promise<void> {
  await n8nFetch(`/api/v1/workflows/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

// ── Import workflow from JSON ──
export async function importWorkflow(workflowJson: any): Promise<N8nWorkflow> {
  const result = await n8nFetch('/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(workflowJson),
  });
  return {
    id: result.id,
    name: result.name,
    active: result.active,
    nodes: result.nodes?.length || 0,
    updatedAt: result.updatedAt,
  };
}

// ── Test connection ──
export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const config = getConfig();
    if (!config.apiKey) return { ok: false, message: 'API key not set' };
    const res = await fetch(`${config.url.replace(/\/$/, '')}/api/v1/workflows?limit=1`, {
      headers: { 'X-N8N-API-KEY': config.apiKey },
    });
    if (res.ok) return { ok: true, message: 'Connected to n8n successfully' };
    return { ok: false, message: `n8n returned status ${res.status}` };
  } catch (e: any) {
    return { ok: false, message: `Cannot reach n8n: ${e.message}` };
  }
}
