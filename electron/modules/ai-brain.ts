import { EventEmitter } from 'events';

/**
 * JARVIS AI Brain
 * ───────────────
 * Local AI processing via Ollama with smart command routing.
 * Routes simple commands to instant handlers, complex queries to the LLM.
 *
 * Supports:
 *   - Chat completions (single + streaming)
 *   - Model switching
 *   - Smart command routing (bypass AI for simple tasks)
 *   - Context window management
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface QueryResult {
  response: string;
  model: string;
  duration: number;
  tokenCount?: number;
}

// ── Instant command patterns (no AI needed) ──
const INSTANT_PATTERNS: Array<{ pattern: RegExp; handler: (match: RegExpMatchArray) => string }> = [
  {
    pattern: /what time is it|current time|what's the time/i,
    handler: () => `It is currently ${new Date().toLocaleTimeString()}.`,
  },
  {
    pattern: /what(?:'s| is) the date|today's date/i,
    handler: () => `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
  },
  {
    pattern: /open (chrome|firefox|edge|explorer|notepad|calculator|terminal|cmd|vscode|code)/i,
    handler: (match) => `Opening ${match[1]}, sir.`, // Actual opening handled by system-control
  },
  {
    pattern: /hello|hi |hey jarvis|good morning|good evening|good afternoon/i,
    handler: () => 'At your service, sir. How can I assist you today?',
  },
  {
    pattern: /who (?:are you|am I talking to)/i,
    handler: () => 'I am JARVIS, Just A Rather Very Intelligent System. Your personal AI assistant, sir.',
  },
  {
    pattern: /thank you|thanks/i,
    handler: () => 'Always happy to help, sir.',
  },
];

class AIBrain {
  private eventBus: EventEmitter;
  private currentModel: string = 'llama3.2';
  private ollamaHost: string = 'http://localhost:11434';
  private systemPrompt: string = `You are JARVIS (Just A Rather Very Intelligent System), an advanced AI personal assistant created by Tony Stark. You are helpful, articulate, and have a sophisticated personality. You speak with British formality and intelligence. Address the user as "sir" or "ma'am". Keep responses concise but informative. Current date: ${new Date().toLocaleDateString()}`;
  private conversationHistory: ChatMessage[] = [];
  private maxHistoryLength: number = 20;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('ai_query', async (prompt: string) => {
      const result = await this.query(prompt);
      this.eventBus.emit('ai_response', result);
    });
  }

  /**
   * Smart Router: Check if this is an instant command
   */
  private checkInstantCommand(prompt: string): string | null {
    for (const { pattern, handler } of INSTANT_PATTERNS) {
      const match = prompt.match(pattern);
      if (match) {
        return handler(match);
      }
    }
    return null;
  }

  /**
   * Synchronous query (waits for full response)
   */
  async query(prompt: string, opts?: { useHistory?: boolean }): Promise<QueryResult> {
    // 1. Check instant commands first
    const instantResponse = this.checkInstantCommand(prompt);
    if (instantResponse) {
      return {
        response: instantResponse,
        model: 'instant',
        duration: 0,
      };
    }

    // 2. Query Ollama
    const startTime = Date.now();

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
      ];

      if (opts?.useHistory !== false) {
        messages.push(...this.conversationHistory);
      }

      messages.push({ role: 'user', content: prompt });

      const response = await fetch(`${this.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.currentModel,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.message?.content || 'I apologize, sir. I was unable to generate a response.';

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: responseText }
      );

      // Trim history
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }

      return {
        response: responseText,
        model: this.currentModel,
        duration: Date.now() - startTime,
        tokenCount: data.eval_count,
      };
    } catch (error: any) {
      console.error('[AI Brain] Query failed:', error.message);
      return {
        response: `I apologize, sir. I'm having trouble connecting to my neural network. Error: ${error.message}`,
        model: this.currentModel,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Streaming query — sends chunks to renderer in real-time
   */
  async streamQuery(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    // 1. Check instant commands
    const instantResponse = this.checkInstantCommand(prompt);
    if (instantResponse) {
      onChunk(instantResponse);
      return;
    }

    // 2. Stream from Ollama
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...this.conversationHistory,
        { role: 'user', content: prompt },
      ];

      const response = await fetch(`${this.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.currentModel,
          messages,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama streaming error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullResponse += json.message.content;
              onChunk(json.message.content);
              this.eventBus.emit('ai_stream_chunk', json.message.content);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: fullResponse }
      );

      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }
    } catch (error: any) {
      console.error('[AI Brain] Stream failed:', error.message);
      onChunk(`I apologize, sir. Streaming error: ${error.message}`);
    }
  }

  /**
   * List available Ollama models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaHost}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Switch the active model
   */
  async setModel(model: string): Promise<boolean> {
    this.currentModel = model;
    this.conversationHistory = []; // Clear history on model switch
    return true;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get current status
   */
  getStatus(): { model: string; historyLength: number; ollamaHost: string } {
    return {
      model: this.currentModel,
      historyLength: this.conversationHistory.length,
      ollamaHost: this.ollamaHost,
    };
  }
}

export default AIBrain;
