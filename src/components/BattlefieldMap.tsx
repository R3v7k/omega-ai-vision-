import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Agent, SwarmMetrics, SwarmHistory, AgentType } from '../hooks/useSwarmTelemetry';
import { BattlefieldConsole } from './BattlefieldConsole';
import { useChroniclerTelemetry } from '../hooks/useChroniclerTelemetry';
import { ChroniclerAgent } from '../lib/ChroniclerAgent';
import { MissionArchive } from './MissionArchive';
import { SwarmCommandCenter } from './SwarmCommandCenter';

interface BattlefieldMapProps {
  agents: Agent[];
  metrics: SwarmMetrics;
  logs: string[];
  history: SwarmHistory;
}

const SAVIS_NODES = [
  { id: 'Node_01', label: 'Human', group: 'core' },
  { id: 'Node_02', label: 'Animal', group: 'core' },
  { id: 'Node_03', label: 'Urban', group: 'core' },
  { id: 'Node_04', label: 'Retail', group: 'core' },
  { id: 'Node_05', label: 'System', group: 'core' },
];

export const BattlefieldMap: React.FC<BattlefieldMapProps> = ({ agents, metrics, logs, history }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<any>(null);
  const ghostsRef = useRef<Map<string, any>>(new Map());
  const prevAgentsRef = useRef<Agent[]>([]);
  const nodePositionsRef = useRef<Map<string, {x: number, y: number}>>(new Map());
  const { telemetry, updateTelemetry } = useChroniclerTelemetry();
  const chroniclerRef = useRef<ChroniclerAgent | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; task: string; lifespan: number; id: string; status: string } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<AgentType>>(new Set(['Drone', 'Crawler', 'Walker']));

  useEffect(() => {
    if (!chroniclerRef.current) {
      chroniclerRef.current = new ChroniclerAgent(updateTelemetry);
    }
    chroniclerRef.current.processSwarmData(agents, metrics, logs);
  }, [agents, metrics, logs, updateTelemetry]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear on mount

    // Define defs for glows and patterns
    const defs = svg.append('defs');

    // Grid pattern
    const pattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 40)
      .attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern.append('path')
      .attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.03)')
      .attr('stroke-width', 1);

    // Glow filters
    const createGlow = (id: string, color: string) => {
      const filter = defs.append('filter').attr('id', id);
      filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    };
    createGlow('glow-cyan', '#22d3ee');
    createGlow('glow-amber', '#fbbf24');
    createGlow('glow-red', '#ef4444');

    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#grid)');

    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // Initialize simulation
    simRef.current = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(40));

    // Core nodes fixed positions
    const coreNodes = SAVIS_NODES.map((n, i) => ({
      ...n,
      fx: width / 2 + 200 * Math.cos((i * 2 * Math.PI) / 5),
      fy: height / 2 + 200 * Math.sin((i * 2 * Math.PI) / 5),
    }));

    simRef.current.nodes(coreNodes);

    const handleResize = () => {
      if (!containerRef.current || !simRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      simRef.current.force('center', d3.forceCenter(w / 2, h / 2));
      
      const updatedCore = SAVIS_NODES.map((n, i) => ({
        ...n,
        fx: w / 2 + Math.min(w, h) * 0.35 * Math.cos((i * 2 * Math.PI) / 5),
        fy: h / 2 + Math.min(w, h) * 0.35 * Math.sin((i * 2 * Math.PI) / 5),
      }));
      
      const currentNodes = simRef.current.nodes();
      currentNodes.forEach((node: any) => {
        if (node.group === 'core') {
          const updated = updatedCore.find(c => c.id === node.id);
          if (updated) {
            node.fx = updated.fx;
            node.fy = updated.fy;
          }
        }
      });
      simRef.current.alpha(0.3).restart();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (simRef.current) simRef.current.stop();
      ghostsRef.current.clear(); // Clear Ghost Trace animation buffers
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!simRef.current || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const now = Date.now();

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // 1. Manage Ghosts
    const currentIds = new Set(agents.map(a => a.id));
    prevAgentsRef.current.forEach(pa => {
      if (!currentIds.has(pa.id)) {
        // Agent was purged
        ghostsRef.current.set(pa.id, { ...pa, ghostSince: now, group: 'ghost' });
      }
    });
    
    // Clean up old ghosts (> 5s)
    for (const [id, ghost] of ghostsRef.current.entries()) {
      if (now - ghost.ghostSince > 5000) {
        ghostsRef.current.delete(id);
      }
    }
    prevAgentsRef.current = agents;

    // 2. Prepare Nodes and Links
    const coreNodes = simRef.current.nodes().filter((n: any) => n.group === 'core');
    const agentNodes = agents
      .filter(a => activeFilters.has(a.type))
      .map(a => {
        const existing = simRef.current.nodes().find((n: any) => n.id === a.id);
        const lastPos = nodePositionsRef.current.get(a.id);
        if (existing) return { ...existing, ...a, group: 'agent' };
        if (lastPos) return { ...a, group: 'agent', x: lastPos.x, y: lastPos.y };
        return { ...a, group: 'agent', x: width / 2, y: height / 2 };
      });
    const ghostNodes = Array.from(ghostsRef.current.values())
      .filter(g => activeFilters.has(g.type))
      .map(g => {
        const existing = simRef.current.nodes().find((n: any) => n.id === g.id);
        const lastPos = nodePositionsRef.current.get(g.id);
        if (existing) return { ...existing, ...g };
        if (lastPos) return { ...g, x: lastPos.x, y: lastPos.y };
        return { ...g, x: width / 2, y: height / 2 };
      });

    const allNodes = [...coreNodes, ...agentNodes, ...ghostNodes];
    
    const links = [...agentNodes, ...ghostNodes].map(a => ({
      source: a.id,
      target: a.targetNode,
      id: `${a.id}-${a.targetNode}`,
      targetNode: a.targetNode,
    })).filter(l => coreNodes.some((cn: any) => cn.id === l.targetNode));

    // 3. Update Simulation
    simRef.current.nodes(allNodes);
    const linkForce = simRef.current.force('link');
    if (linkForce) linkForce.links(links);
    simRef.current.alpha(0.3).restart();

    // 4. Render Links
    const linkSelection = svg.select('.links')
      .selectAll('line')
      .data(links, (d: any) => d.id);

    linkSelection.exit().remove();

    const linkEnter = linkSelection.enter()
      .append('line')
      .attr('stroke', 'rgba(34, 211, 238, 0.3)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    const linkMerge = linkEnter.merge(linkSelection as any);

    // 5. Render Nodes
    const nodeSelection = svg.select('.nodes')
      .selectAll('g.node')
      .data(allNodes, (d: any) => d.id);

    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node');

    // Add shapes based on group/type
    nodeEnter.each(function(d: any) {
      const el = d3.select(this);
      if (d.group === 'core') {
        el.append('rect')
          .attr('width', 64).attr('height', 64)
          .attr('x', -32).attr('y', -32)
          .attr('fill', '#0f172a')
          .attr('stroke', '#334155')
          .attr('stroke-width', 2)
          .attr('rx', 12)
          .style('transition', 'all 0.3s ease');
        el.append('text')
          .text(d.label)
          .attr('fill', '#94a3b8')
          .attr('text-anchor', 'middle')
          .attr('dy', 5)
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace');
      } else {
        // Agent or Ghost
        el.append('circle')
          .attr('class', 'bg-circle')
          .attr('r', 18)
          .attr('fill', '#0f172a')
          .attr('stroke-width', 2)
          .style('transition', 'all 0.3s ease');
          
        el.append('text')
          .attr('class', 'icon')
          .attr('text-anchor', 'middle')
          .attr('dy', 5)
          .attr('font-size', '16px')
          .style('transition', 'all 0.3s ease');
          
        el.append('text')
          .attr('class', 'label')
          .attr('text-anchor', 'middle')
          .attr('dy', 32)
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .attr('fill', '#64748b')
          .style('transition', 'all 0.3s ease');
      }

      // Add hover events
      el.on('mouseover', function(event) {
        const node = d3.select(this);
        const currentData: any = node.datum();
        if (currentData.group === 'core') {
          node.select('rect')
            .attr('stroke', '#94a3b8')
            .attr('fill', '#1e293b')
            .attr('transform', 'scale(1.05)');
        } else {
          node.select('.bg-circle')
            .attr('r', 22)
            .attr('fill', '#1e293b');
          node.select('.label')
            .attr('fill', '#e2e8f0')
            .attr('font-weight', 'bold');
          node.select('.icon')
            .attr('font-size', '20px');
            
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            task: currentData.task || 'Terminated',
            lifespan: currentData.lifespan || 0,
            id: currentData.id,
            status: currentData.status || 'GHOST'
          });
        }
      }).on('mousemove', function(event) {
        const node = d3.select(this);
        const currentData: any = node.datum();
        if (currentData.group !== 'core') {
          setTooltip(prev => prev ? {
            ...prev,
            x: event.clientX,
            y: event.clientY,
            lifespan: currentData.lifespan || 0,
            status: currentData.status || 'GHOST'
          } : prev);
        }
      }).on('mouseout', function() {
        const node = d3.select(this);
        const currentData: any = node.datum();
        if (currentData.group === 'core') {
          node.select('rect')
            .attr('stroke', '#334155')
            .attr('fill', '#0f172a')
            .attr('transform', 'scale(1)');
        } else {
          node.select('.bg-circle')
            .attr('r', 18)
            .attr('fill', '#0f172a');
          node.select('.label')
            .attr('fill', '#64748b')
            .attr('font-weight', 'normal');
          node.select('.icon')
            .attr('font-size', '16px');
            
          setTooltip(null);
        }
      });
    });

    const nodeMerge = nodeEnter.merge(nodeSelection as any);

    // Update node visuals
    nodeMerge.each(function(d: any) {
      const el = d3.select(this);
      el.attr('data-group', d.group);
      el.attr('data-status', d.status || '');

      if (d.group === 'core') return;
      
      const circle = el.select('.bg-circle');
      const icon = el.select('.icon');
      const label = el.select('.label');

      label.text(d.id);

      if (d.group === 'ghost') {
        circle.attr('stroke', '#475569').attr('filter', null).attr('fill', 'rgba(71, 85, 105, 0.1)');
        icon.text(d.type === 'Drone' ? '🚁' : d.type === 'Crawler' ? '🕷️' : '🚶').style('filter', 'grayscale(100%) opacity(50%)');
        label.attr('fill', '#475569');
      } else {
        el.attr('opacity', 1);
        if (d.status === 'SPAWNING') {
          circle.attr('stroke', '#fbbf24').attr('filter', 'url(#glow-amber)').attr('fill', 'rgba(251, 191, 36, 0.1)');
          icon.text('⚡').style('filter', null);
          label.attr('fill', '#64748b');
        } else if (d.status === 'ACTIVE') {
          circle.attr('stroke', '#22d3ee').attr('filter', 'url(#glow-cyan)').attr('fill', 'rgba(34, 211, 238, 0.1)');
          icon.text(d.type === 'Drone' ? '🚁' : d.type === 'Crawler' ? '🕷️' : '🚶').style('filter', null);
          label.attr('fill', '#64748b');
        } else if (d.status === 'PURGING') {
          el.attr('opacity', 0.5);
          circle.attr('stroke', '#475569').attr('filter', null).attr('fill', 'rgba(71, 85, 105, 0.1)');
          icon.text(d.type === 'Drone' ? '🚁' : d.type === 'Crawler' ? '🕷️' : '🚶').style('filter', 'grayscale(100%)');
          label.attr('fill', '#475569');
        }
      }
    });

    // 6. Tick function
    simRef.current.on('tick', () => {
      linkMerge
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeMerge
        .attr('transform', (d: any) => {
          nodePositionsRef.current.set(d.id, { x: d.x, y: d.y });
          return `translate(${d.x},${d.y})`;
        });
    });

  }, [agents, activeFilters]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0f172a] relative overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
        .links line {
          animation: dash 1s linear infinite;
        }
        @keyframes pulse-amber {
          0% { transform: scale(0.9); stroke-width: 2px; }
          50% { transform: scale(1.2); stroke-width: 4px; }
          100% { transform: scale(0.9); stroke-width: 2px; }
        }
        .node[data-status="SPAWNING"] .bg-circle {
          animation: pulse-amber 1.5s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes pixelate-fade {
          0% { filter: contrast(1) blur(0px); opacity: 1; }
          100% { filter: contrast(3) blur(4px); opacity: 0; }
        }
        .node[data-group="ghost"] {
          animation: pixelate-fade 5s forwards;
        }
      `}</style>
      <svg ref={svgRef} className="w-full h-full absolute inset-0" />
      
      {/* Tooltip */}
      {tooltip && tooltip.visible && (
        <div 
          className="fixed z-[1000] pointer-events-none bg-slate-900/95 border border-cyan-500/50 p-3 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.2)] backdrop-blur-md transform -translate-x-1/2 -translate-y-[calc(100%+20px)] transition-opacity duration-150"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${tooltip.status === 'ACTIVE' ? 'bg-cyan-400 animate-pulse' : tooltip.status === 'SPAWNING' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`} />
            <div className="text-cyan-400 font-mono text-xs font-bold">{tooltip.id}</div>
          </div>
          <div className="text-slate-300 font-mono text-[10px] uppercase tracking-wider mb-1 border-b border-slate-700/50 pb-1">Task: {tooltip.task}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 font-mono text-[10px]">Lifespan</span>
            <span className={`font-mono text-[10px] font-bold ${tooltip.lifespan > 50 ? 'text-emerald-400' : tooltip.lifespan > 20 ? 'text-amber-400' : 'text-red-400'}`}>
              {Math.round(tooltip.lifespan)}%
            </span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${tooltip.lifespan > 50 ? 'bg-emerald-400' : tooltip.lifespan > 20 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${Math.max(0, Math.min(100, tooltip.lifespan))}%` }}
            />
          </div>
        </div>
      )}

      <BattlefieldConsole logs={logs} metrics={metrics} activeCount={agents.filter(a => a.status === 'ACTIVE').length} history={history} />
      <MissionArchive telemetry={telemetry} />
      <SwarmCommandCenter agents={agents} />

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 z-50 flex gap-3">
        {(['Drone', 'Crawler', 'Walker'] as AgentType[]).map(type => {
          const isActive = activeFilters.has(type);
          return (
            <button
              key={type}
              onClick={() => {
                setActiveFilters(prev => {
                  const next = new Set(prev);
                  if (next.has(type)) next.delete(type);
                  else next.add(type);
                  return next;
                });
              }}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-all duration-300 border flex items-center gap-2 ${
                isActive 
                  ? 'bg-slate-800/80 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' 
                  : 'bg-slate-900/50 border-slate-700/50 text-slate-500 hover:border-slate-600 hover:text-slate-400'
              } backdrop-blur-md`}
            >
              <span className="text-sm">{type === 'Drone' ? '🚁' : type === 'Crawler' ? '🕷️' : '🚶'}</span>
              {type}
            </button>
          );
        })}
      </div>
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <h2 className="text-cyan-400 font-mono text-sm font-bold tracking-widest uppercase">Omega Battlefield</h2>
        <p className="text-slate-500 font-mono text-xs mt-1">Decentralized Neural Array</p>
      </div>
    </div>
  );
};
