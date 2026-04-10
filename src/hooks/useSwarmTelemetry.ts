import { useState, useEffect } from 'react';
import { eventBus } from '../lib/EventBus';

export type AgentType = 'Drone' | 'Crawler' | 'Walker';
export type AgentStatus = 'SPAWNING' | 'ACTIVE' | 'PURGING';

export interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  task: string;
  targetNode: string;
  lifespan: number; // 0 to 100
}

export interface SwarmMetrics {
  swarmHealth: number; // percentage
  neuralLoad: number; // percentage
  velocity: number; // FPS
  purgeCount: number;
}

export interface SwarmHistory {
  health: number[];
  active: number[];
  purged: number[];
  load: number[];
}

export const useSwarmTelemetry = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<SwarmMetrics>({
    swarmHealth: 100,
    neuralLoad: 42,
    velocity: 60,
    purgeCount: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<SwarmHistory>({
    health: Array(20).fill(100),
    active: Array(20).fill(0),
    purged: Array(20).fill(0),
    load: Array(20).fill(42),
  });

  useEffect(() => {
    // Passive Observer: Mock stream interval for agent lifecycle and baseline metrics
    const interval = setInterval(() => {
      let newLogs: string[] = [];
      let purgedThisTick = 0;
      let activeCount = 0;

      setAgents(prev => {
        // 1. Update existing agents
        let next = prev.map(agent => {
          const decayRate = agent.status === 'PURGING' ? 15 : (Math.random() * 4 + 1);
          const newLifespan = Math.max(0, agent.lifespan - decayRate);
          
          let newStatus = agent.status;
          if (newLifespan < 20 && agent.status !== 'PURGING') {
            newStatus = 'PURGING';
            newLogs.push(`[${new Date().toLocaleTimeString()}] [PURGING]> [Terminating Task] [${agent.id}]`);
          } else if (agent.status === 'SPAWNING' && newLifespan < 90) {
            newStatus = 'ACTIVE';
            newLogs.push(`[${new Date().toLocaleTimeString()}] [ACTIVE]> [${agent.task}] [${agent.id}]`);
          }

          if (newStatus === 'ACTIVE') activeCount++;

          return { ...agent, lifespan: newLifespan, status: newStatus };
        }).filter(agent => {
          if (agent.lifespan <= 0) {
            purgedThisTick++;
            return false;
          }
          return true;
        }); // Remove purged agents

        // 2. Spawning logic (maintain a swarm of 8-15 agents)
        if (next.length < 12 && Math.random() > 0.4) {
          const types: AgentType[] = ['Drone', 'Crawler', 'Walker'];
          const tasks = ['Reconnaissance', 'Data Extraction', 'Perimeter Defense', 'Target Tracking', 'Signal Relay'];
          const nodes = ['Node_01', 'Node_02', 'Node_03', 'Node_04', 'Node_05'];
          
          const newAgent: Agent = {
            id: `AGT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            type: types[Math.floor(Math.random() * types.length)],
            status: 'SPAWNING',
            task: tasks[Math.floor(Math.random() * tasks.length)],
            targetNode: nodes[Math.floor(Math.random() * nodes.length)],
            lifespan: 100,
          };
          next.push(newAgent);
          newLogs.push(`[${new Date().toLocaleTimeString()}] [SPAWNING]> [Assembling] [${newAgent.id}]`);
        }

        return next;
      });

      if (newLogs.length > 0) {
        setLogs(prev => [...prev, ...newLogs].slice(-50));
      }

      // 3. Fluctuate baseline metrics
      setMetrics(prev => {
        const newHealth = Math.min(100, Math.max(0, prev.swarmHealth + (Math.random() * 2 - 1)));
        const newLoad = Math.min(100, Math.max(20, prev.neuralLoad + (Math.random() * 6 - 3)));
        const newPurged = prev.purgeCount + purgedThisTick;

        setHistory(h => ({
          health: [...h.health, newHealth].slice(-20),
          active: [...h.active, activeCount].slice(-20),
          purged: [...h.purged, newPurged].slice(-20),
          load: [...h.load, newLoad].slice(-20),
        }));

        return {
          swarmHealth: newHealth,
          neuralLoad: newLoad,
          velocity: Math.min(144, Math.max(24, prev.velocity + (Math.random() * 10 - 5))),
          purgeCount: newPurged,
        };
      });
    }, 1000);

    // 4. Subscribe to the existing system event bus to react to real telemetry
    const handleTelemetry = (data: any) => {
      if (data.detections && data.detections.length > 0) {
        // Spike neural load based on real detection volume
        setMetrics(prev => ({
          ...prev,
          neuralLoad: Math.min(100, prev.neuralLoad + (data.detections.length * 1.5))
        }));
      }
    };

    const handleForceSpawn = (data: { targetNode: string }) => {
      const types: AgentType[] = ['Drone', 'Crawler', 'Walker'];
      const newAgent: Agent = {
        id: `AGT-CMD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        type: types[Math.floor(Math.random() * types.length)],
        status: 'SPAWNING',
        task: 'Manual Override Directive',
        targetNode: data.targetNode,
        lifespan: 100,
      };
      setAgents(prev => [...prev, newAgent]);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [SPAWNING]> [Manual Override] [${newAgent.id}]`].slice(-50));
    };

    const handleForcePurge = (data: { targetNode: string }) => {
      setAgents(prev => prev.map(agent => {
        if (agent.targetNode === data.targetNode && agent.status !== 'PURGING') {
          return { ...agent, lifespan: 19 }; // Force decay to trigger purge on next tick
        }
        return agent;
      }));
    };

    const unsubscribeTelemetry = eventBus.subscribe('TELEMETRY_EVENT', handleTelemetry);
    const unsubscribeSpawn = eventBus.subscribe('FORCE_SPAWN', handleForceSpawn);
    const unsubscribePurge = eventBus.subscribe('FORCE_PURGE', handleForcePurge);

    return () => {
      clearInterval(interval);
      unsubscribeTelemetry();
      unsubscribeSpawn();
      unsubscribePurge();
    };
  }, []);

  return { agents, metrics, logs, history };
};
