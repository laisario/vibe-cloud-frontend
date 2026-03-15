import { useLayoutEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type Position,
  MarkerType,
} from "reactflow";
import ELK from "elkjs/lib/elk.bundled.js";
import type { GraphNode, GraphEdge } from "@/lib/api/architectureResult";
import { Globe, Server, Database, HardDrive, Cog } from "lucide-react";
import "reactflow/dist/style.css";

const elk = new ELK();

const elkOptions: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.layered.spacing.nodeNodeBetweenLayers": "120",
  "elk.spacing.nodeNode": "80",
  "elk.spacing.componentComponent": "80",
};

function pickIcon(serviceName: string): React.ElementType {
  const s = serviceName.toLowerCase();
  if (s.includes("frontend") || s.includes("web")) return Globe;
  if (s.includes("api")) return Server;
  if (s.includes("database") || s.includes("postgres") || s.includes("mysql"))
    return Database;
  if (s.includes("cache") || s.includes("redis")) return HardDrive;
  if (s.includes("worker") || s.includes("rq")) return Cog;
  return Server;
}

interface GraphNodeData {
  node: GraphNode;
}

function GraphNodeComponent({ data }: NodeProps<GraphNodeData>) {
  const { node } = data;
  const Icon = pickIcon(node.serviceName);

  return (
    <div className="min-w-[160px] rounded-lg border bg-card px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium text-foreground">
            {node.serviceName}
          </p>
          {node.configSummary && (
            <p className="line-clamp-2 text-[10px] text-muted-foreground">
              {node.configSummary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { resource: GraphNodeComponent };

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

async function getLayoutedElements(
  nodes: Node<GraphNodeData>[],
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

interface ArchitectureDiagramProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function ArchitectureDiagram({
  nodes,
  edges,
}: ArchitectureDiagramProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const flowNodes: Node<GraphNodeData>[] = nodes.map((n) => ({
      id: n.id,
      type: "resource",
      data: { node: n },
      position: { x: 0, y: 0 },
      sourcePosition: "right" as Position,
      targetPosition: "left" as Position,
    }));

    const flowEdges: Edge[] = edges.map((e, i) => ({
      id: `edge-${i}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
    }));

    return { initialNodes: flowNodes, initialEdges: flowEdges };
  }, [nodes, edges]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

  useLayoutEffect(() => {
    if (initialNodes.length > 0) {
      getLayoutedElements(initialNodes, initialEdges).then(
        ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
          setFlowNodes(layoutedNodes);
          setFlowEdges(layoutedEdges);
        }
      );
    }
  }, [initialNodes, initialEdges, setFlowNodes, setFlowEdges]);

  if (nodes.length === 0) return null;

  return (
    <div className="h-[280px] w-full min-w-0 overflow-hidden rounded-lg border bg-muted/30">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.35,
          minZoom: 0.5,
          maxZoom: 1,
        }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="hsl(var(--border))" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
