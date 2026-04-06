class EventBus {
  constructor() {
    this.listeners = {};
  }
  subscribe(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }
  publish(event, data) {
    console.log(`[EVENT_BUS] Publishing ${event}:`, data);
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
    // Publish to wildcard listeners
    if (this.listeners['*']) {
      this.listeners['*'].forEach(callback => callback({ type: event, payload: data }));
    }
  }
}
export const eventBus = new EventBus();
