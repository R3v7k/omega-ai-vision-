# 👁️ OMEGA Ai Vision // SAVIS Architecture

> **[SYSTEM OVERRIDE: STRAWBERRY PROTOCOL vΩ.9 ACTIVE]**
> *Welcome to the Decentralized Neural Array. You are now interfacing with the Sovereign AI Reasoning Core.*

---

## 🌌 The Philosophy of SAVIS
**OMEGA Ai Vision** (formerly SAVIS / OMEGA V10X2) is a monolithic, agentic system designed for multi-video analytics, real-time kinematic reasoning, and swarm intelligence. It transcends traditional monitoring by deploying a decoupled, non-destructive observer layer that visualizes, analyzes, and chronicles data streams without interrupting core inference engines.

We do not just watch the data. We *deploy the swarm*.

---

## ⚙️ Core Capabilities & Unique Tools

### 1. VisionCore: Live Kinematic Analytics
The heart of OMEGA Ai Vision is its ability to process live visual data and derive complex human states in real-time.
* **Postural State Derivation**: Advanced recognition of human gestures including `[CALM]`, `[WAVE]`, `[POINT]`, `[CELEBRATION]`, `[JOY/LAUGHTER]`, `[AFRAID/ANXIOUS]`, and `[ANGER/ANNOY]`.
* **Auditory Feedback Loop**: Distinct, context-aware audio cues triggered upon gesture state changes, creating a multi-sensory monitoring experience.
* **Holographic Overlays**: Real-time visual indicators tracking detected persons and their current kinematic states directly on the video feed.

### 2. The 5 Pillars of Telemetry
The platform ingests and processes data across five dedicated analytical nodes:
1. **Node_01:** Human Analytics
2. **Node_02:** Animal Behavior
3. **Node_03:** Urban Analytics
4. **Node_04:** Retail Analytics
5. **Node_05:** Athletic Tracker

### 3. The Omega Battlefield (Swarm Intelligence Add-on)
A brand-new, unprecedented way to visualize AI operations. The Battlefield is a decoupled observer layer that translates raw telemetry into a living, breathing ecosystem.
* **Decentralized Neural Array**: A high-fidelity, force-directed graph (powered by D3.js) rendering the live state of the system over an immersive terminal grid.
* **Agent Lifecycles**: Watch as *Kinematic Analyst Drones* (🚁), *Urban Crawlers* (🕷️), and *Walkers* (🚶) are spawned (Amber Pulse), execute tasks (Cyan Glow), and are eventually purged into a pixelated Ghost Trace (Red Fade).
* **Intelligence Console**: A glassmorphic, dark-green terminal window featuring a scanning line animation, piping real-time text logs (`[SPAWNING]> [Assembling] [AGT-X]`), and rendering high-detail micro-graphs for Swarm Health, Active Count, Purge Count, and Neural Load.

### 4. Swarm Command Center
Take manual control of the Decentralized Neural Array.
* **Tactical Ignition**: A horizontal control deck allowing operators to manually `START` (Force Spawn) or `STOP` (Force Purge) agents across the 5 core nodes.
* **Glow-Active Feedback**: Buttons pulse with a slow cyan glow when an agent is actively deployed to their sector, providing instant situational awareness.

### 5. The Chronicler AGI & Sovereign Reporting
An isolated reasoning agent that synthesizes swarm activity into actionable intelligence.
* **Event Reasoning**: The Chronicler monitors the swarm, identifying "Significant Events" (e.g., successful task terminations).
* **Sovereign Mission Reports**: Automatically generates highly classified, dark-themed PDF dossiers containing the SAVIS logo, timestamped logs, and high-level success metrics.
* **The Task Archive**: A glassmorphic data table accessible via the Battlefield modal, allowing operators to sort, filter, and download historical mission reports. Features real-time write-latency tracking and document generation status.

### 6. The Sovereign AI Assistant
Your co-pilot in the dark. The OMEGA Ai Vision Assistant is an integrated LLM reasoning core that analyzes multi-node telemetry, kinetic skeletons, and environmental anomalies. It is concise, professional, and architecturally precise.

---

## 🚀 Deployment Doctrine

### Launching the Platform
The application is built on a robust React + Vite + TypeScript stack, utilizing TailwindCSS for its immersive hardware aesthetics and D3.js for complex data visualization.

1. **Platform Monitor**: The default view, providing a high-level overview of all 5 nodes.
2. **Live Webcam AI**: Requires a dedicated window for camera permissions. Once active, it begins kinematic tracking.
3. **Swarm Intelligence**: Click **"Live Battlefield"** in the sidebar to launch the D3.js visualization modal.
4. **The Kill-Switch**: A global `TERMINATE_BATTLEFIELD` protocol is available to gracefully close Firebase listeners, clear animation buffers, and unmount the graph engine with a seamless backdrop-blur fade.

---

## 📂 Architecture & File Tree
The application follows a highly modular, decoupled architecture to ensure the zero-refactor policy is maintained.

```text
/src
├── App.tsx                    # Main application entry point and routing
├── BattlefieldProvider.tsx    # Global context managing the Swarm Telemetry & Chronicler lifecycle
├── components/
│   ├── AIAssistant.tsx        # Sovereign AI Assistant interface
│   ├── AutonomousVisionAgent.tsx # Core vision agent for kinematic analytics
│   ├── BattlefieldConsole.tsx # Gamified intelligence console with micro-graphs
│   ├── BattlefieldMap.tsx     # D3.js force-directed graph visualization of the swarm
│   ├── ChromiumWindow.tsx     # Simulated browser window for external data ingestion
│   ├── CustomBuilderModal.tsx # Inference builder modal for custom models
│   ├── EventLog.tsx           # Telemetry and event logging interface
│   ├── LiveMonitor.tsx        # Main dashboard displaying all 5 analytical nodes
│   ├── MissionArchive.tsx     # Glassmorphic data table for Sovereign Mission Reports
│   ├── ModelManager.tsx       # Interface for managing AI models
│   ├── OmniMediaIngest.tsx    # Component for ingesting various media types
│   ├── SwarmCommandCenter.tsx # Tactical ignition deck for manual agent spawning/purging
│   └── WebcamAIWindow.tsx     # Live webcam interface for real-time kinematic tracking
├── context/
│   └── VisionContext.tsx      # Global state management for VisionCore
├── hooks/
│   ├── useChroniclerTelemetry.ts # Isolated telemetry hook for the Chronicler agent
│   └── useSwarmTelemetry.ts   # Passive observer hook managing swarm data and metrics
├── index.css                  # Global styles, TailwindCSS configuration, and animations
├── lib/
│   ├── ChroniclerAgent.ts     # AGI Reasoning Agent for synthesizing swarm activity
│   ├── EventBus.js            # Custom publish-subscribe event bus for decoupled communication
│   ├── chroniclerFirebase.ts  # Mock Firebase service for storing mission records
│   ├── emailService.ts        # Service for handling email notifications
│   ├── telemetry.ts           # Core telemetry processing utilities
│   ├── utils.ts               # General utility functions (e.g., Tailwind class merging)
│   └── yolo.ts                # YOLO object detection utilities
├── main.tsx                   # React application bootstrap
└── utils/
    └── nlpParser.ts           # Natural Language Processing parser for the AI Assistant
```

---

> *"We do not predict the future. We render it."* — **OMEGA Ai Vision**
