import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as faceDetection from '@tensorflow-models/face-detection';

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
  'YOLOv26-Pose (Pose)',
  'YOLOv26-Face (Face)'
];

// SHARED NEURAL INSTANCES
let globalModelInstance: cocoSsd.ObjectDetection | null = null;
let globalPoseInstance: poseDetection.PoseDetector | null = null;
let globalFaceInstance: faceDetection.FaceDetector | null = null;
let loadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let poseLoadingPromise: Promise<poseDetection.PoseDetector> | null = null;
let faceLoadingPromise: Promise<faceDetection.FaceDetector> | null = null;

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

    // ALWAYS LOAD STANDARD DETECTION ENGINE (COCO-SSD)
    if (!globalModelInstance) {
      if (!loadingPromise) {
        console.log("[SAVIS_DIAG] Initiating Force-Load of Edge-Native Neural Weights...");
        loadingPromise = cocoSsd.load({ base: 'mobilenet_v2' });
      }
      globalModelInstance = await loadingPromise;
      console.log("[SAVIS_DIAG] SUCCESS: Neural weights locked at FP16.");
    }

    // 1. POSE ENGINE (For 17-Point Skeleton)
    if (modelName.includes('Pose')) {
      if (!globalPoseInstance) {
        if (!poseLoadingPromise) {
          console.log("[SAVIS_DIAG] Loading Skeletal Intelligence (MoveNet)...");
          poseLoadingPromise = poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING }
          );
        }
        globalPoseInstance = await poseLoadingPromise;
        console.log("[SAVIS_DIAG] SUCCESS: Skeletal weights locked at FP16.");
      }
      return { name: modelName, type: 'pose_engine', engine: globalModelInstance, poseEngine: globalPoseInstance };
    }

    // 1.5 FACE ENGINE (For Facial Analytics)
    if (modelName.includes('Face')) {
      if (!globalFaceInstance) {
        if (!faceLoadingPromise) {
          console.log("[SAVIS_DIAG] Loading Facial Intelligence (MediaPipe FaceDetector)...");
          const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
          const detectorConfig = {
            runtime: 'tfjs',
          };
          faceLoadingPromise = faceDetection.createDetector(model, detectorConfig as any);
        }
        globalFaceInstance = await faceLoadingPromise;
        console.log("[SAVIS_DIAG] SUCCESS: Facial weights locked at FP16.");
      }
      return { name: modelName, type: 'face_engine', engine: globalModelInstance, faceEngine: globalFaceInstance };
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
    // ALWAYS RUN BOX INFERENCE (Standard COCO)
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

    let results = validDetections.map((p: any) => ({
      bbox: p.bbox,
      class: p.class.charAt(0).toUpperCase() + p.class.slice(1),
      conf: p.score,
      engine: model.name
    }));

    // ROUTE A: SKELETAL INFERENCE (17-Point)
    if (model.type === 'pose_engine' && model.poseEngine) {
      const poses = await model.poseEngine.estimatePoses(element);
      
      // Match poses to detected persons
      const persons = results.filter(r => r.class.toLowerCase() === 'person');
      
      poses.forEach((pose: any) => {
        if (!pose.keypoints || pose.keypoints.length === 0) return;
        
        // Find the closest person bounding box
        let bestMatch = null;
        let minDistance = Infinity;
        
        // MoveNet Multipose returns bounding boxes in pose.box
        const poseBox = pose.box ? [pose.box.yMin, pose.box.xMin, pose.box.width, pose.box.height] : null;
        
        if (poseBox) {
            persons.forEach(person => {
                const dx = Math.abs(person.bbox[0] - poseBox[1]);
                const dy = Math.abs(person.bbox[1] - poseBox[0]);
                const dist = dx + dy;
                if (dist < minDistance && dist < 200) {
                    minDistance = dist;
                    bestMatch = person;
                }
            });
        } else {
            // Fallback to keypoint center
            const cx = pose.keypoints.reduce((sum: number, kp: any) => sum + kp.x, 0) / pose.keypoints.length;
            const cy = pose.keypoints.reduce((sum: number, kp: any) => sum + kp.y, 0) / pose.keypoints.length;
            
            persons.forEach(person => {
                const pcx = person.bbox[0] + person.bbox[2] / 2;
                const pcy = person.bbox[1] + person.bbox[3] / 2;
                const dist = Math.sqrt(Math.pow(cx - pcx, 2) + Math.pow(cy - pcy, 2));
                if (dist < minDistance && dist < 200) {
                    minDistance = dist;
                    bestMatch = person;
                }
            });
        }

        if (bestMatch) {
          bestMatch.keypoints = pose.keypoints;
        } else {
          // If no matching person found, add a new detection
          const box = pose.box ? [pose.box.xMin, pose.box.yMin, pose.box.width, pose.box.height] : [
            pose.keypoints[0].x - 50, 
            pose.keypoints[0].y - 50, 
            100, 200
          ];
          results.push({
            bbox: box,
            class: "Person",
            conf: pose.score || 0.5,
            keypoints: pose.keypoints,
            engine: model.name
          });
        }
      });
    }

    // ROUTE C: FACIAL INFERENCE
    if (model.type === 'face_engine' && model.faceEngine) {
      const faces = await model.faceEngine.estimateFaces(element);
      
      faces.forEach((face: any) => {
        const box = [face.box.xMin, face.box.yMin, face.box.width, face.box.height];
        results.push({
          bbox: box,
          class: "Face",
          conf: face.score || 0.9,
          keypoints: face.keypoints, // 6 keypoints: rightEye, leftEye, noseTip, mouthCenter, rightEarTragion, leftEarTragion
          engine: model.name
        });
      });
    }

    return results;

  } catch (error) {
    console.error("[SAVIS_DIAG] Inference error:", error);
    return [];
  }
}