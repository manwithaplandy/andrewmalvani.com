/**
 * The WebGL renderer for the resume graph. Client-only: this module imports
 * three and react-force-graph-3d, so it must ONLY ever be loaded through
 * `next/dynamic(..., {ssr: false})` — anything else breaks `output: "export"`.
 *
 * Visual language ("same site, in space"): #171717 space, exponential fog as
 * the anti-clutter tool, desaturated neutral nodes, ONE orange accent
 * reserved for the selected path, cert yellow as the only secondary. Shape
 * encodes type; level only modulates luminosity.
 */
import {Dispatch, FC, memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import ForceGraph3D, {ForceGraphMethods, LinkObject, NodeObject} from 'react-force-graph-3d';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  FogExp2,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  Points,
  PointsMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import SpriteText from 'three-spritetext';

import {initialFocusId, resumeGraph} from '../../data/graphData';
import {GraphEdgeKind, GraphNode, GraphNodeKind, KIND_LABELS} from '../../data/graphDef';
import {GraphNavAction, GraphNavState} from './graphReducer';

interface CanvasNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  level?: number;
}

interface CanvasLink {
  kind: GraphEdgeKind;
}

type FGNode = NodeObject<CanvasNode>;
type FGLink = LinkObject<CanvasNode, CanvasLink>;
type FGMethods = ForceGraphMethods<FGNode, FGLink>;

type NodeVisualState = 'selected' | 'candidate' | 'hovered' | 'linked' | 'dimmed' | 'normal';

interface NodeVisual {
  group: Group;
  material: MeshLambertMaterial;
  haloMaterial: MeshBasicMaterial;
  label: SpriteText;
  baseColor: Color;
  baseOpacity: number;
  kind: GraphNodeKind;
}

const NODE_RADIUS: Record<GraphNodeKind, number> = {
  certification: 4.5,
  education: 5,
  job: 7,
  responsibility: 3,
  skill: 3.5,
  skillGroup: 13,
  tool: 2.6,
};

// Desaturated neutrals; certs carry the site's secondary yellow, and the two
// most recent roles read slightly warmer (recency → warmth).
const NODE_COLOR: Record<GraphNodeKind, string> = {
  certification: '#efc603',
  education: '#8f9bb3',
  job: '#a8a29e',
  responsibility: '#8d99ae',
  skill: '#aab2bd',
  skillGroup: '#7d8a99',
  tool: '#979ea8',
};

const WARM_JOB_COLOR: Record<string, string> = {
  'job:ga-lead-ai-ml-engineer': '#cfa183',
  'job:ga-systems-administrator': '#bda393',
};

const ALWAYS_LABELED: ReadonlySet<GraphNodeKind> = new Set<GraphNodeKind>(['job', 'skillGroup', 'education']);

const LINK_DISTANCE: Record<GraphEdgeKind, number> = {
  'earned-via': 45,
  'part-of': 38,
  related: 60,
  timeline: 110,
  uses: 75,
};

const LINK_BASE_COLOR: Record<GraphEdgeKind, string> = {
  'earned-via': 'rgba(160,140,70,0.45)',
  'part-of': 'rgba(120,128,138,0.35)',
  related: 'rgba(110,105,100,0.3)',
  timeline: 'rgba(168,162,158,0.55)',
  uses: 'rgba(125,125,130,0.35)',
};

const ORANGE = '#fb923c';
const CAMERA_DISTANCE: Partial<Record<GraphNodeKind, number>> = {job: 110, skillGroup: 140};
const DEFAULT_CAMERA_DISTANCE = 80;

// Chronological spine: jobs (and education) pinned along the x axis so the
// career always reads oldest → newest, with skill "galaxies" clustered around
// per-group anchors instead of a uniform force hairball.
const SPINE_POSITIONS: Record<string, number> = {
  'education:ucsb-psychology': -280,
  'job:ga-lead-ai-ml-engineer': 180,
  'job:ga-systems-administrator': 60,
  'job:reynolds-compliance-marketing-consultant': -180,
  'job:tillster-it-strategic-analyst': -60,
};

const GROUP_ANCHORS: Record<string, {x: number; y: number; z: number}> = {
  'skillGroup:cloud-services': {x: 60, y: -130, z: 80},
  'skillGroup:coding-languages': {x: -120, y: -110, z: -60},
  'skillGroup:devops-tools': {x: -20, y: 120, z: -110},
  'skillGroup:generative-ai': {x: 150, y: 120, z: 70},
};

/** skill/tool node id → the group anchor that attracts it. */
const memberAnchor = new Map<string, {x: number; y: number; z: number}>();
for (const edge of resumeGraph.edges) {
  if (edge.kind === 'part-of' && edge.target.startsWith('skillGroup:')) {
    const anchor = GROUP_ANCHORS[edge.target];
    if (anchor) {
      memberAnchor.set(edge.source, anchor);
    }
  }
}
for (const [groupId, anchor] of Object.entries(GROUP_ANCHORS)) {
  memberAnchor.set(groupId, anchor);
}

// Module-level singleton: the force engine mutates node objects (x/y/z), so
// the same instances must survive re-renders and context-loss remounts.
const canvasData: {nodes: FGNode[]; links: FGLink[]} = {
  links: resumeGraph.edges.map(edge => ({kind: edge.kind, source: edge.source, target: edge.target})),
  nodes: resumeGraph.nodes.map(node => {
    const spineX = SPINE_POSITIONS[node.id];
    const pinned: Partial<FGNode> = spineX !== undefined ? {fx: spineX, fy: 0, fz: 0} : {};
    return {id: node.id, kind: node.kind, label: node.label, level: node.level, ...pinned};
  }),
};

const linkEndId = (end: FGLink['source']): string =>
  typeof end === 'object' && end !== null ? String(end.id) : String(end);

const makeStarfield = (): Points => {
  const starCount = 300;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    // Random points on a large sphere shell so stars never sit between nodes.
    const radius = 900 + Math.random() * 600;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const material = new PointsMaterial({color: 0x52525b, size: 1.6, sizeAttenuation: false, transparent: true});
  material.opacity = 0.55;
  material.fog = false;
  return new Points(geometry, material);
};

const buildNodeVisual = (node: FGNode): {visual: NodeVisual; object: Group} => {
  const radius = NODE_RADIUS[node.kind];
  const level = node.level ?? 6;
  const baseColor = new Color(WARM_JOB_COLOR[node.id] ?? NODE_COLOR[node.kind]);
  // Skill level → luminosity, never a printed number.
  baseColor.lerp(new Color('#ffffff'), (level / 10) * 0.35);
  const baseOpacity = node.kind === 'skillGroup' ? 0.3 : 1;

  const material = new MeshLambertMaterial({
    color: baseColor.clone(),
    opacity: baseOpacity,
    transparent: true,
    wireframe: node.kind === 'skillGroup',
  });
  const geometry =
    node.kind === 'certification'
      ? new OctahedronGeometry(radius)
      : node.kind === 'education'
        ? new IcosahedronGeometry(radius, 0)
        : node.kind === 'responsibility'
          ? new BoxGeometry(radius * 1.7, radius * 1.7, radius * 1.7)
          : new SphereGeometry(radius, node.kind === 'skillGroup' ? 12 : 20, node.kind === 'skillGroup' ? 12 : 20);
  const mesh = new Mesh(geometry, material);

  // Selected glow / candidate ring, hidden until the state machine says so.
  // Visibility is driven through the MATERIAL (applyVisualState), never the
  // mesh, so the halo can always be re-shown by a state change.
  const haloMaterial = new MeshBasicMaterial({depthWrite: false, opacity: 0, transparent: true});
  haloMaterial.color.set(ORANGE);
  haloMaterial.visible = false;
  const halo = new Mesh(new SphereGeometry(radius * 1.45, 16, 16), haloMaterial);

  // Enlarged invisible pick proxy: easier hit target, especially on touch.
  // Sized with a floor + modest scale (NOT a large multiple) so big hubs'
  // proxies don't swallow clicks aimed at the small nodes orbiting them.
  const pickMaterial = new MeshBasicMaterial({depthWrite: false, opacity: 0, transparent: true});
  const pick = new Mesh(new SphereGeometry(Math.max(radius * 1.25, 8), 8, 8), pickMaterial);

  const label = new SpriteText(node.label, node.kind === 'skillGroup' ? 6 : node.kind === 'job' ? 5.5 : 4, '#d4d4d4');
  label.material.depthWrite = false;
  label.position.y = radius + 7;
  label.visible = ALWAYS_LABELED.has(node.kind);

  const group = new Group();
  group.add(mesh, halo, pick, label);
  return {
    object: group,
    visual: {baseColor, baseOpacity, group, haloMaterial, kind: node.kind, label, material},
  };
};

const applyVisualState = (visual: NodeVisual, state: NodeVisualState): void => {
  const {material, haloMaterial, label, baseColor, baseOpacity, kind} = visual;
  material.color.copy(baseColor);
  material.emissive.set('#000000');
  haloMaterial.visible = true;
  switch (state) {
    case 'selected':
      material.opacity = baseOpacity === 1 ? 1 : 0.6;
      material.emissive.set('#7c2d12');
      haloMaterial.color.set(ORANGE);
      haloMaterial.opacity = 0.4;
      label.visible = true;
      label.color = ORANGE;
      break;
    case 'candidate':
      material.opacity = baseOpacity === 1 ? 1 : 0.55;
      haloMaterial.color.set('#e7e5e4');
      haloMaterial.opacity = 0.28;
      label.visible = true;
      label.color = '#f5f5f4';
      break;
    case 'hovered':
      // Visibly weaker than the ←/→ candidate ring (0.28) — hover ≠ candidate.
      material.opacity = baseOpacity === 1 ? 1 : 0.5;
      haloMaterial.color.set('#e7e5e4');
      haloMaterial.opacity = 0.16;
      label.visible = true;
      label.color = '#e7e5e4';
      break;
    case 'linked':
      material.opacity = baseOpacity * 0.85;
      haloMaterial.opacity = 0;
      label.visible = true;
      label.color = '#d4d4d4';
      break;
    case 'dimmed':
      material.opacity = baseOpacity * 0.18;
      haloMaterial.opacity = 0;
      // Far tier keeps its labels readable (≥4.5:1 on #171717), others hide.
      label.visible = ALWAYS_LABELED.has(kind);
      label.color = '#9ca3af';
      break;
    case 'normal':
      material.opacity = baseOpacity;
      haloMaterial.opacity = 0;
      label.visible = ALWAYS_LABELED.has(kind);
      label.color = '#d4d4d4';
      break;
  }
  visual.haloMaterial.visible = haloMaterial.opacity > 0;
};

/**
 * Small glass card shown after ~1s of continuous hover over a non-focused
 * node. pointer-events-none so it never steals the raycast or orbit drag;
 * intentionally lighter than the FocusPanel (preview, not selection).
 */
const HoverPreview: FC<{node: GraphNode; x: number; y: number; width: number; height: number}> = memo(
  ({node, x, y, width, height}) => {
    const style = useMemo(
      () => ({
        // Offset from the projected node point, clamped inside the canvas.
        left: Math.max(8, Math.min(x + 16, width - 264)),
        top: Math.max(8, Math.min(y + 16, height - 104)),
      }),
      [x, y, width, height],
    );
    return (
      <div
        className="pointer-events-none absolute z-20 max-w-[16rem] rounded-xl border border-neutral-700 bg-neutral-900/80 p-3 backdrop-blur-md"
        style={style}>
        <p className="text-[0.65rem] font-medium uppercase tracking-wider text-orange-400/80">
          {KIND_LABELS[node.kind]}
        </p>
        <p className="text-sm font-semibold text-neutral-100">{node.label}</p>
        <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{node.description}</p>
      </div>
    );
  },
);
HoverPreview.displayName = 'HoverPreview';

const ResumeGraphCanvas: FC<{
  state: GraphNavState;
  dispatch: Dispatch<GraphNavAction>;
  reducedMotion: boolean;
}> = memo(({state, dispatch, reducedMotion}) => {
  const fgRef = useRef<FGMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef(new Map<string, NodeVisual>());
  const stateRef = useRef(state);
  const interactedRef = useRef(false);
  const reducedMotionRef = useRef(reducedMotion);
  const hoveredIdRef = useRef<string | null>(null);
  // First flight (initial load / deep link / context-loss remount) uses the
  // per-kind framing; later flights preserve the user's zoom distance.
  const hasFlownRef = useRef(false);
  const [size, setSize] = useState({height: 0, width: 0});
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewNode, setPreviewNode] = useState<{id: string; x: number; y: number} | null>(null);
  const ready = size.width > 0;

  stateRef.current = state;
  reducedMotionRef.current = reducedMotion;
  hoveredIdRef.current = hoveredId;

  // --- container sizing -----------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const measure = () =>
      setSize(previous => {
        const next = {height: container.clientHeight, width: container.clientWidth};
        return previous.width === next.width && previous.height === next.height ? previous : next;
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // --- one-time scene setup (re-runs after a context-loss remount) ----------
  useEffect(() => {
    const fg = fgRef.current;
    if (!ready || !fg) {
      return;
    }

    // Forces: per-kind link distances, mild repulsion, group-cluster anchors.
    const linkForce = fg.d3Force('link') as undefined | {distance: (accessor: (link: FGLink) => number) => void};
    linkForce?.distance((link: FGLink) => LINK_DISTANCE[link.kind ?? 'related']);
    const chargeForce = fg.d3Force('charge') as undefined | {strength: (value: number) => void};
    chargeForce?.strength(-120);
    let forceNodes: FGNode[] = [];
    const clusterForce = (alpha: number): void => {
      for (const node of forceNodes) {
        const anchor = node.id ? memberAnchor.get(String(node.id)) : undefined;
        if (!anchor) {
          continue;
        }
        node.vx = (node.vx ?? 0) + (anchor.x - (node.x ?? 0)) * 0.05 * alpha;
        node.vy = (node.vy ?? 0) + (anchor.y - (node.y ?? 0)) * 0.05 * alpha;
        node.vz = (node.vz ?? 0) + (anchor.z - (node.z ?? 0)) * 0.05 * alpha;
      }
    };
    clusterForce.initialize = (nodes: FGNode[]) => {
      forceNodes = nodes;
    };
    // NOTE: no d3ReheatSimulation() here — it flips engineRunning before the
    // (async) graph ingestion assigns the layout, crashing the first tick.
    fg.d3Force('cluster', clusterForce);

    // Atmosphere: exponential fog (primary anti-clutter tool) + sparse stars.
    const scene = fg.scene();
    scene.fog = new FogExp2(0x0d0d0d, 0.0011);
    const starfield = makeStarfield();
    scene.add(starfield);

    // Mobile perf tier: clamp DPR, then drop further if the probe fails.
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const renderer = fg.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));

    let probeFrame: number | undefined;
    if (coarse) {
      let frames = 0;
      const probeStart = performance.now();
      const probe = () => {
        frames += 1;
        if (frames < 30) {
          probeFrame = requestAnimationFrame(probe);
          return;
        }
        const fps = (frames * 1000) / (performance.now() - probeStart);
        if (fps < 40) {
          renderer.setPixelRatio(1);
          starfield.visible = false;
        }
      };
      probeFrame = requestAnimationFrame(probe);
    }

    return () => {
      if (probeFrame !== undefined) {
        cancelAnimationFrame(probeFrame);
      }
      scene.remove(starfield);
      starfield.geometry.dispose();
      (starfield.material as PointsMaterial).dispose();
    };
  }, [ready, canvasKey]);

  // --- WebGL context loss (real iOS Safari failure mode) ---------------------
  useEffect(() => {
    const fg = fgRef.current;
    if (!ready || !fg) {
      return;
    }
    const canvas = fg.renderer().domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      setHoveredId(null);
      setPreviewNode(null);
      setContextLost(true);
    };
    const handleRestored = () => setContextLost(false);
    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [ready, canvasKey]);

  // --- pause rendering while hidden or scrolled away -------------------------
  useEffect(() => {
    const fg = fgRef.current;
    const container = containerRef.current;
    if (!ready || !fg || !container) {
      return;
    }
    const handleVisibility = () => {
      document.hidden ? fg.pauseAnimation() : fg.resumeAnimation();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const observer = new IntersectionObserver(entries => {
      entries[0]?.isIntersecting ? fg.resumeAnimation() : fg.pauseAnimation();
    });
    observer.observe(container);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
      fg.resumeAnimation();
    };
  }, [ready, canvasKey]);

  // --- ambient motion: slow auto-orbit + current-role pulse ------------------
  // Both stop on first input and never start under reduced motion.
  useEffect(() => {
    const fg = fgRef.current;
    const container = containerRef.current;
    if (!ready || !fg || !container) {
      return;
    }
    const controls = fg.controls() as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    };
    controls.autoRotateSpeed = 0.12;
    controls.autoRotate = !reducedMotion && !interactedRef.current;

    const stopAmbient = () => {
      interactedRef.current = true;
      controls.autoRotate = false;
    };
    controls.addEventListener('start', stopAmbient);
    container.addEventListener('pointerdown', stopAmbient);

    let pulseFrame: number | undefined;
    const pulseVisual = () => objectsRef.current.get(initialFocusId);
    const pulse = (time: number) => {
      if (interactedRef.current || reducedMotionRef.current) {
        pulseVisual()?.group.scale.setScalar(1);
        return;
      }
      pulseVisual()?.group.scale.setScalar(1 + 0.04 * Math.sin(time / 700));
      pulseFrame = requestAnimationFrame(pulse);
    };
    if (!reducedMotion) {
      pulseFrame = requestAnimationFrame(pulse);
    }

    return () => {
      controls.removeEventListener('start', stopAmbient);
      container.removeEventListener('pointerdown', stopAmbient);
      if (pulseFrame !== undefined) {
        cancelAnimationFrame(pulseFrame);
      }
      pulseVisual()?.group.scale.setScalar(1);
    };
  }, [ready, canvasKey, reducedMotion]);

  // --- node visual states (selected / candidate / linked / dimmed) -----------
  const focusNeighbors = useMemo(
    () => new Set(state.focusedId ? resumeGraph.adjacency.get(state.focusedId) ?? [] : []),
    [state.focusedId],
  );
  useEffect(() => {
    for (const [id, visual] of objectsRef.current) {
      const visualState: NodeVisualState =
        state.focusedId === id
          ? 'selected'
          : state.highlightedId === id
            ? 'candidate'
            : hoveredId === id
              ? 'hovered'
              : state.focusedId === null
                ? 'normal'
                : focusNeighbors.has(id)
                  ? 'linked'
                  : 'dimmed';
      applyVisualState(visual, visualState);
    }
  }, [state.focusedId, state.highlightedId, hoveredId, focusNeighbors, ready, canvasKey]);

  // --- camera: fly to focus (600–800ms expo-out; instant under reduced motion)
  useEffect(() => {
    const fg = fgRef.current;
    if (!ready || !fg || !state.focusedId) {
      return;
    }
    const node = canvasData.nodes.find(candidate => candidate.id === state.focusedId);
    if (!node) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const fly = () => {
      if (cancelled) {
        return;
      }
      const {x, y, z} = node;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' || (x === 0 && y === 0 && z === 0)) {
        // Layout not warmed up yet — retry briefly (initial page load).
        if (attempts++ < 20) {
          window.setTimeout(fly, 150);
        }
        return;
      }
      // First flight frames per-kind; afterwards preserve the user's zoom,
      // lightly clamped (min: never inside a node; max: beyond ~900 the
      // target is fog-invisible anyway).
      let distance = CAMERA_DISTANCE[node.kind] ?? DEFAULT_CAMERA_DISTANCE;
      if (hasFlownRef.current) {
        const controls = fg.controls() as {target: Vector3};
        const currentDistance = fg.camera().position.distanceTo(controls.target);
        distance = Math.min(Math.max(currentDistance, 30), 900);
      }
      const norm = Math.hypot(x, y, z) || 1;
      const ratio = 1 + distance / norm;
      fg.cameraPosition({x: x * ratio, y: y * ratio, z: z * ratio}, {x, y, z}, reducedMotionRef.current ? 0 : 700);
      hasFlownRef.current = true;
    };
    fly();
    return () => {
      cancelled = true;
    };
  }, [state.focusedId, ready, canvasKey]);

  // --- camera: small ~300ms nudge toward the ←/→ candidate -------------------
  useEffect(() => {
    const fg = fgRef.current;
    if (!ready || !fg || !state.focusedId || !state.highlightedId) {
      return;
    }
    const focused = canvasData.nodes.find(node => node.id === state.focusedId);
    const candidate = canvasData.nodes.find(node => node.id === state.highlightedId);
    if (
      !focused ||
      !candidate ||
      typeof focused.x !== 'number' ||
      typeof candidate.x !== 'number' ||
      typeof focused.y !== 'number' ||
      typeof candidate.y !== 'number' ||
      typeof focused.z !== 'number' ||
      typeof candidate.z !== 'number'
    ) {
      return;
    }
    const camera = fg.camera();
    const lookAt = {
      x: focused.x + (candidate.x - focused.x) * 0.35,
      y: focused.y + (candidate.y - focused.y) * 0.35,
      z: focused.z + (candidate.z - focused.z) * 0.35,
    };
    fg.cameraPosition(
      {x: camera.position.x, y: camera.position.y, z: camera.position.z},
      lookAt,
      reducedMotionRef.current ? 0 : 300,
    );
  }, [state.highlightedId, state.focusedId, ready, canvasKey]);

  // --- hover preview: open after ~1s dwell on a non-focused node -------------
  useEffect(() => {
    setPreviewNode(null);
    if (!hoveredId || hoveredId === stateRef.current.focusedId) {
      return;
    }
    const timer = window.setTimeout(() => {
      const fg = fgRef.current;
      const node = canvasData.nodes.find(candidate => candidate.id === hoveredId);
      if (!fg || !node || typeof node.x !== 'number' || typeof node.y !== 'number' || typeof node.z !== 'number') {
        return;
      }
      const {x, y} = fg.graph2ScreenCoords(node.x, node.y, node.z);
      setPreviewNode({id: hoveredId, x, y});
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [hoveredId]);

  // Any pointer interaction (orbit, click) invalidates the projected coords.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const clearPreview = () => setPreviewNode(null);
    container.addEventListener('pointerdown', clearPreview);
    return () => container.removeEventListener('pointerdown', clearPreview);
  }, []);

  // Once a node is focused, the FocusPanel supersedes its preview.
  useEffect(() => {
    setPreviewNode(previous => (previous && previous.id === state.focusedId ? null : previous));
  }, [state.focusedId]);

  const previewGraphNode = useMemo(
    () => (previewNode ? resumeGraph.nodeById.get(previewNode.id) : undefined),
    [previewNode],
  );

  // --- graph accessors (memoized: a fresh identity re-inits the engine) ------
  const nodeThreeObject = useCallback((node: FGNode) => {
    const {visual, object} = buildNodeVisual(node);
    objectsRef.current.set(String(node.id), visual);
    const current = stateRef.current;
    const id = String(node.id);
    const neighbors = current.focusedId ? resumeGraph.adjacency.get(current.focusedId) ?? [] : [];
    applyVisualState(
      visual,
      current.focusedId === id
        ? 'selected'
        : current.highlightedId === id
          ? 'candidate'
          : hoveredIdRef.current === id
            ? 'hovered'
            : current.focusedId === null
              ? 'normal'
              : neighbors.includes(id)
                ? 'linked'
                : 'dimmed',
    );
    return object;
  }, []);

  const linkColor = useCallback(
    (link: FGLink): string => {
      const {focusedId, highlightedId} = state;
      if (!focusedId) {
        return LINK_BASE_COLOR[link.kind ?? 'related'];
      }
      const source = linkEndId(link.source);
      const target = linkEndId(link.target);
      const touchesFocus = source === focusedId || target === focusedId;
      if (touchesFocus && highlightedId !== null && (source === highlightedId || target === highlightedId)) {
        return ORANGE;
      }
      if (touchesFocus) {
        return 'rgba(251,146,60,0.5)';
      }
      return 'rgba(125,125,130,0.12)';
    },
    [state],
  );

  const linkWidth = useCallback(
    (link: FGLink): number => {
      const {focusedId} = state;
      if (!focusedId) {
        return 0;
      }
      return linkEndId(link.source) === focusedId || linkEndId(link.target) === focusedId ? 1 : 0;
    },
    [state],
  );

  const handleNodeClick = useCallback(
    (node: FGNode) => {
      interactedRef.current = true;
      const id = String(node.id);
      // Tapping the highlighted neighbor enters it; anything else focuses.
      if (stateRef.current.highlightedId === id) {
        dispatch({type: 'enter'});
      } else {
        dispatch({id, type: 'focusNode'});
      }
    },
    [dispatch],
  );

  // Hover is canvas-local visual feedback only — never touches the reducer,
  // so the keyboard candidate (highlightedId) is unaffected.
  const handleNodeHover = useCallback((node: FGNode | null) => {
    setHoveredId(node ? String(node.id) : null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    interactedRef.current = true;
    dispatch({type: 'deselect'});
  }, [dispatch]);

  // Clicks that land on an edge would otherwise be swallowed (no background
  // fallback fires) — treat them like background so there are no dead zones.
  const handleLinkClick = useCallback(() => {
    interactedRef.current = true;
    dispatch({type: 'deselect'});
  }, [dispatch]);

  const handleReload = useCallback(() => {
    objectsRef.current.clear();
    // Remount → stale camera; re-framing with the per-kind default is fine.
    hasFlownRef.current = false;
    setContextLost(false);
    setCanvasKey(key => key + 1);
  }, []);

  // Dispose GPU resources on unmount.
  useEffect(() => {
    const objects = objectsRef.current;
    return () => {
      for (const visual of objects.values()) {
        visual.group.traverse(child => {
          if (child instanceof Mesh) {
            child.geometry.dispose();
            (child.material as MeshBasicMaterial).dispose();
          }
        });
        visual.label.material.map?.dispose();
        visual.label.material.dispose();
      }
      objects.clear();
    };
  }, []);

  return (
    <div
      // Canvas drag is orbit ONLY; touch-action/overscroll scoped here so the
      // page never scrolls or pull-to-refreshes from inside the graph.
      className="absolute inset-0 touch-none overscroll-contain"
      ref={containerRef}>
      {ready && !contextLost && (
        <ForceGraph3D<CanvasNode, CanvasLink>
          backgroundColor="#171717"
          cooldownTime={10000}
          enableNodeDrag={false}
          graphData={canvasData}
          height={size.height}
          key={canvasKey}
          linkColor={linkColor}
          linkWidth={linkWidth}
          nodeThreeObject={nodeThreeObject}
          onBackgroundClick={handleBackgroundClick}
          onLinkClick={handleLinkClick}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          ref={fgRef}
          showNavInfo={false}
          warmupTicks={80}
          width={size.width}
        />
      )}
      {/* Vignette to #0d0d0d, cheaper than post-processing. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={vignetteStyle} />
      {previewNode && previewGraphNode && !contextLost && (
        <HoverPreview
          height={size.height}
          node={previewGraphNode}
          width={size.width}
          x={previewNode.x}
          y={previewNode.y}
        />
      )}
      {contextLost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-y-4 bg-neutral-900/95">
          <p className="max-w-xs text-center text-sm text-neutral-300">
            The 3D view lost its graphics context (this can happen on iOS). Nothing is broken.
          </p>
          <button
            className="rounded-full border-2 border-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            onClick={handleReload}
            type="button">
            Reload graph
          </button>
        </div>
      )}
    </div>
  );
});

const vignetteStyle = {
  background: 'radial-gradient(ellipse at center, rgba(13,13,13,0) 55%, rgba(13,13,13,0.55) 100%)',
} as const;

ResumeGraphCanvas.displayName = 'ResumeGraphCanvas';
export default ResumeGraphCanvas;
