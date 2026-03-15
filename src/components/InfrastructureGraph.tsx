import { useLayoutEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  MarkerType,
} from "reactflow";
import ELK from "elkjs/lib/elk.bundled.js";
import type { InfraService, ServiceStatus } from "@/lib/api/types";
import { inferConnections } from "@/lib/infra/inferConnections";
import StatusBadge from "./StatusBadge";
import {
  Globe,
  Server,
  Database,
  HardDrive,
  Cog,
  Shield,
  Archive,
} from "lucide-react";
import "reactflow/dist/style.css";

const elk = new ELK();

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.nodeNode": "60",
  "elk.direction": "DOWN",
};

const iconMap: Record<string, React.ElementType> = {
  web: Globe,
  api: Server,
  database: Database,
  cache: HardDrive,
  worker: Cog,
  "load-balancer": Shield,
  storage: Archive,
};

function configSummary(service: InfraService): string {
  const parts: string[] = [];
  if (service.provider) parts.push(service.provider);
  if (service.region) parts.push(service.region);
  if (service.estimatedCost) parts.push(service.estimatedCost);
  return parts.length ? parts.join(" · ") : service.type;
}

interface ServiceNodeData {
  service: InfraService;
  status: ServiceStatus;
  onStatusChange?: (serviceId: string, status: ServiceStatus) => void;
}

const STATUS_CYCLE: ServiceStatus[] = ["draft", "up", "down"];

function ServiceNode({ data }: NodeProps<ServiceNodeData>) {
  const { service, status, onStatusChange } = data;
  const Icon = iconMap[service.type] ?? Server;

  const handleBadgeClick = () => {
    if (!onStatusChange) return;
    const idx = STATUS_CYCLE.indexOf(status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onStatusChange(service.id, next);
  };

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-sm min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-medium text-foreground">
              {service.name}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {configSummary(service)}
            </p>
          </div>
        </div>
        {onStatusChange ? (
          <button
            type="button"
            onClick={handleBadgeClick}
            className="cursor-pointer rounded transition-opacity hover:opacity-80"
            title="Clique para alternar status (simulado)"
          >
            <StatusBadge status={status} />
          </button>
        ) : (
          <StatusBadge status={status} />
        )}
      </div>
    </div>
  );
}

const nodeTypes = { service: ServiceNode };

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

async function getLayoutedElements(
  nodes: Node<ServiceNodeData>[],
  edges: Edge[],
  options: Record<string, string> = elkOptions
) {
  const graph = {
    id: "root",
    layoutOptions: options,
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layouted = await elk.layout(graph);

  return {
    nodes: layouted.children!.map((child) => {
      const node = nodes.find((n) => n.id === child.id)!;
      return {
        ...node,
        position: { x: child.x ?? 0, y: child.y ?? 0 },
      };
    }),
    edges,
  };
}

interface InfrastructureGraphProps {
  services: InfraService[];
  statusMap: Record<string, ServiceStatus>;
  onStatusChange?: (serviceId: string, status: ServiceStatus) => void;
}

export default function InfrastructureGraph({
  services,
  statusMap,
  onStatusChange,
}: InfrastructureGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const inferredEdges = inferConnections(services);

    const nodes: Node<ServiceNodeData>[] = services.map((svc) => ({
      id: svc.name,
      type: "service",
      data: {
        service: svc,
        status: statusMap[svc.id] ?? statusMap[svc.name] ?? svc.status ?? "draft",
        onStatusChange,
      },
      position: { x: 0, y: 0 },
      sourcePosition: "bottom",
      targetPosition: "top",
    }));

    const edges: Edge[] = inferredEdges.map((e, i) => ({
      id: `e-${e.source}-${e.target}-${i}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
    }));

    return { nodes, edges };
  }, [services, statusMap, onStatusChange]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useLayoutEffect(() => {
    if (initialNodes.length > 0) {
      getLayoutedElements(initialNodes, initialEdges).then(
        ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
        }
      );
    }
  }, [initialNodes, initialEdges]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={12} size={1} color="hsl(var(--border))" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
