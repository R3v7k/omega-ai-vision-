import { eventBus } from '../lib/EventBus';

class OTELCollector {
  private static isInitialized = false;

  static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log("[OTEL_EXPORTER] Global Telemetry Collector Initialized.");

    // Subscribe to all events globally
    eventBus.subscribe('*', (event: { type: string; payload: any }) => {
      this.export(event.type, event.payload);
    });
  }

  static export(eventType: string, eventData: any) {
    // In a real app, this would send data to an OpenTelemetry endpoint
    // e.g., fetch('https://otel-collector.example.com/v1/traces', ...)
    console.log(`[OTEL_EXPORTER] Exporting telemetry [${eventType}]:`, eventData);
  }
}

export const telemetry = OTELCollector;
