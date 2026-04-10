import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as poseDetection from '@tensorflow-models/pose-detection';

export interface VisionConfig {
  targetModel: string;
  confidenceThreshold: number;
  allowedClasses?: string[];
  ignoredClasses?: string[];
  allowAll?: boolean;
  contextualFilters?: { size: string; colors: string[] };
}

export const YOLOV26_VARIANTS = [
  'YOLOv26 (Detect)',
  'YOLOv26-Seg (Segment)',
  'YOLOv26-Pose (Pose)'
];

// SHARED NEURAL INSTANCES
let globalModelInstance: cocoSsd.ObjectDetection | null = null;
let globalPoseInstance: poseDetection.PoseDetector | null = null;
let loadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let poseLoadingPromise: Promise<poseDetection.PoseDetector> | null = null;

/**
 * SAVIS KERNEL DIAGNOSTIC
 * Multi-Engine Initialization
 */
export async function loadModel(modelName: string) {
  try {
    // --- SOVEREIGN SPEED OPTIMIZATIONS ---
    // Force WebGL to use Half-Precision (16-bit) math instead of 32-bit.
    // This dramatically increases inference FPS on consumer GPUs.
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    tf.env().set('WEBGL_PACK', true); 

    await tf.ready();
    await tf.setBackend('webgl');

    // 1. POSE ENGINE (For 17-Point Skeleton)
    if (modelName.includes('Pose')) {
      if (!globalPoseInstance) {
        if (!poseLoadingPromise) {
          console.log("[SAVIS_DIAG] Loading Skeletal Intelligence (MoveNet)...");
          poseLoadingPromise = poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
          );
        }
        globalPoseInstance = await poseLoadingPromise;
        console.log("[SAVIS_DIAG] SUCCESS: Skeletal weights locked at FP16.");
      }
      return { name: modelName, type: 'pose_engine', engine: globalPoseInstance };
    }

    // 2. STANDARD DETECTION ENGINE (COCO-SSD)
    if (!globalModelInstance) {
      if (!loadingPromise) {
        console.log("[SAVIS_DIAG] Initiating Force-Load of Edge-Native Neural Weights...");
        loadingPromise = cocoSsd.load({ base: 'lite_mobilenet_v2' });
      }
      globalModelInstance = await loadingPromise;
      console.log("[SAVIS_DIAG] SUCCESS: Neural weights locked at FP16.");
    }
    
    return { name: 'COCO-SSD', type: 'box_engine', engine: globalModelInstance };
  } catch (e) {
    console.error("[SAVIS_DIAG] CRITICAL FAILURE.", e);
    return { name: modelName, type: 'error' };
  }
}

/**
 * AGENT 1 (WORKHORSE)
 * DYNAMIC INFERENCE ROUTING
 */
export async function detectObjects(model: any, element: HTMLVideoElement, config: any) {
  if (!model || model.type === 'error' || !model.engine) return [];

  try {
    // ROUTE A: SKELETAL INFERENCE (17-Point)
    if (model.type === 'pose_engine') {
      const poses = await model.engine.estimatePoses(element);
      return poses.filter((pose: any) => pose.keypoints && pose.keypoints.length > 0).map((pose: any) => ({
        // Map pose to a bounding box for UI consistency
        bbox: [
          pose.keypoints[0].x - 50, 
          pose.keypoints[0].y - 50, 
          100, 200
        ],
        class: "Person",
        conf: pose.score,
        keypoints: pose.keypoints, // THE 17-POINT PAYLOAD
        engine: model.name
      }));
    }

    // ROUTE B: BOX INFERENCE (Standard COCO)
    const predictions = await model.engine.detect(element);
    
    // --- SOVEREIGN FIX: DYNAMIC CLASS FILTERING ---
    let validDetections = predictions;
    
    if (config.allowedClasses && config.allowedClasses.length > 0) {
      validDetections = predictions.filter((p: any) => {
        const detectedClass = p.class.toLowerCase();
        // Check if the detected class matches ANY of the user's agnostic keywords
        return config.allowedClasses.some((targetWord: string) => 
          detectedClass.includes(targetWord) || targetWord.includes(detectedClass)
        );
      });
    }

    return validDetections.map((p: any) => ({
      bbox: p.bbox,
      class: p.class.charAt(0).toUpperCase() + p.class.slice(1),
      conf: p.score,
      engine: model.name
    }));

  } catch (error) {
    console.error("[SAVIS_DIAG] Inference error:", error);
    return [];
  }
}