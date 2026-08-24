"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const events = require("events");
const _JarvisEventBus = class _JarvisEventBus extends events.EventEmitter {
  constructor() {
    super();
    __publicField(this, "eventLog", []);
    __publicField(this, "maxLogSize", 100);
    this.setMaxListeners(50);
  }
  static getInstance() {
    if (!_JarvisEventBus.instance) {
      _JarvisEventBus.instance = new _JarvisEventBus();
    }
    return _JarvisEventBus.instance;
  }
  /**
   * Override emit to add logging for debugging
   */
  emit(event, ...args) {
    this.eventLog.push({
      event: String(event),
      timestamp: Date.now(),
      data: args[0]
    });
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
    if (process.env.NODE_ENV === "development") {
      console.log(`[EVENT BUS] ${String(event)}`, args.length ? args[0] : "");
    }
    return super.emit(event, ...args);
  }
  /**
   * Get recent event log for debugging
   */
  getRecentEvents(count = 20) {
    return this.eventLog.slice(-count);
  }
  /**
   * Listen for an event once and return a promise
   */
  waitForEvent(event, timeout = 1e4) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);
      this.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
};
__publicField(_JarvisEventBus, "instance");
let JarvisEventBus = _JarvisEventBus;
const eventBus = JarvisEventBus.getInstance();
exports.default = eventBus;
