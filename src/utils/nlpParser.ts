import { VisionConfig } from '../lib/yolo';

/**
 * Agentic Prompt Parser (Lightweight Synchronous Version)
 * 
 * Translates natural language requests into strict VisionConfig objects using keyword matching.
 */
export function parseVisionPrompt(promptText: string): VisionConfig {
  const query = (promptText || "").toLowerCase();
  
  const config: VisionConfig = {
    targetModel: 'YOLOv26 (Detect)',
    confidenceThreshold: 0.5,
    allowedClasses: [],
    ignoredClasses: [],
    contextualFilters: { size: 'any', colors: [] }
  };

  // Model Selection Logic
  if (query.includes('segment') || query.includes('mask') || query.includes('pixel')) {
    config.targetModel = 'YOLOv26-Seg (Segment)';
  } else if (query.includes('pose') || query.includes('skeleton') || query.includes('joint') || query.includes('body language')) {
    config.targetModel = 'YOLOv26-Pose (Pose)';
  } else if (query.includes('coco') || query.includes('standard')) {
    config.targetModel = 'COCO-SSD';
  }

  // Keyword Mapping (Typo-Tolerant)
  if (query.includes('human') || query.includes('person') || query.includes('child') || query.includes('people') || query.includes('man') || query.includes('woman') || query.includes('shirt') || query.includes('clothing')) {
    config.allowedClasses.push('person');
  }
  
  if (query.includes('car') || query.includes('vehicle') || query.includes('truck') || query.includes('bus') || query.includes('motorcycle')) {
    config.allowedClasses.push('car', 'truck', 'bus', 'motorcycle');
  }

  if (query.includes('animal') || query.includes('dog') || query.includes('cat') || query.includes('bird')) {
    config.allowedClasses.push('dog', 'cat', 'bird', 'horse', 'sheep', 'cow');
  }

  if (query.includes('item') || query.includes('bottle') || query.includes('cup') || query.includes('phone')) {
    config.allowedClasses.push('bottle', 'cup', 'cell phone', 'laptop');
  }

  // Ultimate Fail-Safe: If no classes matched, default to showing everything
  if (config.allowedClasses.length === 0) {
    config.allowAll = true;
  }

  return config;
}
