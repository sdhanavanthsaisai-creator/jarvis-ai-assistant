"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const INSTANT_PATTERNS = [
  {
    pattern: /what time is it|current time|what's the time/i,
    handler: () => `It is currently ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}.`
  },
  {
    pattern: /what(?:'s| is) the date|today's date/i,
    handler: () => `Today is ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`
  },
  {
    pattern: /open (chrome|firefox|edge|explorer|notepad|calculator|terminal|cmd|vscode|code)/i,
    handler: (match) => `Opening ${match[1]}, sir.`
    // Actual opening handled by system-control
  },
  {
    pattern: /hello|hi |hey jarvis|good morning|good evening|good afternoon/i,
    handler: () => "At your service, sir. How can I assist you today?"
  },
  {
    pattern: /who (?:are you|am I talking to)/i,
    handler: () => "I am JARVIS, Just A Rather Very Intelligent System. Your personal AI assistant, sir."
  },
  {
    pattern: /thank you|thanks/i,
    handler: () => "Always happy to help, sir."
  }
];
class AIBrain {
  constructor(eventBus) {
    __publicField(this, "eventBus");
    __publicField(this, "currentModel", "llama3.2");
    __publicField(this, "ollamaHost", "http://localhost:11434");
    __publicField(this, "systemPrompt", `You are JARVIS (Just A Rather Very Intelligent System), an advanced AI personal assistant created by Tony Stark. You are helpful, articulate, and have a sophisticated personality. You speak with British formality and intelligence. Address the user as "sir" or "ma'am". Keep responses concise but informative. Current date: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`);
    __publicField(this, "conversationHistory", []);
    __publicField(this, "maxHistoryLength", 20);
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.eventBus.on("ai_query", async (prompt) => {
      const result = await this.query(prompt);
      this.eventBus.emit("ai_response", result);
    });
  }
  /**
   * Smart Router: Check if this is an instant command
   */
  checkInstantCommand(prompt) {
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
  async query(prompt, opts) {
    var _a;
    const instantResponse = this.checkInstantCommand(prompt);
    if (instantResponse) {
      return {
        response: instantResponse,
        model: "instant",
        duration: 0
      };
    }
    const startTime = Date.now();
    try {
      const messages = [
        { role: "system", content: this.systemPrompt }
      ];
      if ((opts == null ? void 0 : opts.useHistory) !== false) {
        messages.push(...this.conversationHistory);
      }
      messages.push({ role: "user", content: prompt });
      const response = await fetch(`${this.ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.currentModel,
          messages,
          stream: false
        })
      });
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      const data = await response.json();
      const responseText = ((_a = data.message) == null ? void 0 : _a.content) || "I apologize, sir. I was unable to generate a response.";
      this.conversationHistory.push(
        { role: "user", content: prompt },
        { role: "assistant", content: responseText }
      );
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }
      return {
        response: responseText,
        model: this.currentModel,
        duration: Date.now() - startTime,
        tokenCount: data.eval_count
      };
    } catch (error) {
      console.error("[AI Brain] Query failed:", error.message);
      return {
        response: `I apologize, sir. I'm having trouble connecting to my neural network. Error: ${error.message}`,
        model: this.currentModel,
        duration: Date.now() - startTime
      };
    }
  }
  /**
   * Streaming query — sends chunks to renderer in real-time
   */
  async streamQuery(prompt, onChunk) {
    var _a;
    const instantResponse = this.checkInstantCommand(prompt);
    if (instantResponse) {
      onChunk(instantResponse);
      return;
    }
    try {
      const messages = [
        { role: "system", content: this.systemPrompt },
        ...this.conversationHistory,
        { role: "user", content: prompt }
      ];
      const response = await fetch(`${this.ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.currentModel,
          messages,
          stream: true
        })
      });
      if (!response.ok || !response.body) {
        throw new Error(`Ollama streaming error: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if ((_a = json.message) == null ? void 0 : _a.content) {
              fullResponse += json.message.content;
              onChunk(json.message.content);
              this.eventBus.emit("ai_stream_chunk", json.message.content);
            }
          } catch {
          }
        }
      }
      this.conversationHistory.push(
        { role: "user", content: prompt },
        { role: "assistant", content: fullResponse }
      );
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }
    } catch (error) {
      console.error("[AI Brain] Stream failed:", error.message);
      onChunk(`I apologize, sir. Streaming error: ${error.message}`);
    }
  }
  /**
   * List available Ollama models
   */
  async listModels() {
    var _a;
    try {
      const response = await fetch(`${this.ollamaHost}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return ((_a = data.models) == null ? void 0 : _a.map((m) => m.name)) || [];
    } catch {
      return [];
    }
  }
  /**
   * Switch the active model
   */
  async setModel(model) {
    this.currentModel = model;
    this.conversationHistory = [];
    return true;
  }
  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }
  /**
   * Get current status
   */
  getStatus() {
    return {
      model: this.currentModel,
      historyLength: this.conversationHistory.length,
      ollamaHost: this.ollamaHost
    };
  }
}
exports.default = AIBrain;
