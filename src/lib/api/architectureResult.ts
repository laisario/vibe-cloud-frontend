/**
 * Architecture result types and adapter.
 * Endpoint: GET /projects/:projectId/architecture-result
 * Consumes direct object format (not response[0].output).
 */

export interface ArchitectureResource {
  servico: string;
  /** Display string (API may return string or object) */
  config?: string | Record<string, unknown>;
}

export interface VibeOption {
  descricao: string;
  custo_estimado: string;
  recursos: ArchitectureResource[];
  /** From backend; do not infer. */
  relationships?: Array<{ source: string; target: string }>;
}

export interface ArchitectureResult {
  analiseEntrada: string;
  vibeEconomica: VibeOption;
  vibePerformance: VibeOption;
}

/** UI-friendly graph node */
export interface GraphNode {
  id: string;
  label: string;
  serviceName: string;
  configSummary: string;
}

/** UI-friendly graph edge (from backend relationships only) */
export interface GraphEdge {
  source: string;
  target: string;
}

/** UI-friendly architecture data for diagram rendering */
export interface ArchitectureUIData {
  analysis: string;
  economy: {
    description: string;
    estimatedCost: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  performance: {
    description: string;
    estimatedCost: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

type RawResource = {
  servico?: string;
  config?: string | Record<string, unknown>;
};

type RawRelationship = {
  source?: string;
  target?: string;
};

type RawVibe = {
  descricao?: string;
  custo_estimado?: string;
  recursos?: RawResource[];
  relationships?: RawRelationship[];
};

type RawResponse = {
  architecture_result_id?: string;
  project_id?: string;
  schema_version?: string;
  analise_entrada?: string;
  vibe_economica?: RawVibe;
  vibe_performance?: RawVibe;
  raw_payload_storage_key?: string;
  status?: string;
  created_at?: string;
};

function configToSummary(config: RawResource["config"]): string {
  if (config == null) return "";
  if (typeof config === "string") return config;
  const obj = config as Record<string, unknown>;
  const display = obj.display;
  if (typeof display === "string") return display;
  try {
    const s = JSON.stringify(config);
    return s.length > 80 ? s.slice(0, 77) + "..." : s;
  } catch {
    return "";
  }
}

function recursosToNodes(recursos: RawResource[]): GraphNode[] {
  const seen = new Map<string, number>();
  return recursos.map((r, i) => {
    const servico = String(r.servico ?? "");
    const count = seen.get(servico) ?? 0;
    seen.set(servico, count + 1);
    const id = count === 0 ? servico : `${servico}-${count}`;
    return {
      id,
      label: servico,
      serviceName: servico,
      configSummary: configToSummary(r.config),
    };
  });
}

function relationshipsToEdges(
  relationships: RawRelationship[] | undefined,
  nodeIds: Set<string>
): GraphEdge[] {
  if (!relationships?.length) return [];
  return relationships
    .filter((r) => {
      const s = String(r.source ?? "").trim();
      const t = String(r.target ?? "").trim();
      return s && t && nodeIds.has(s) && nodeIds.has(t);
    })
    .map((r) => ({
      source: String(r.source ?? "").trim(),
      target: String(r.target ?? "").trim(),
    }));
}

function mapVibeToUIData(
  raw: RawVibe | undefined,
  relationships?: Array<{ source: string; target: string }>
): ArchitectureUIData["economy"] {
  const recursos = raw?.recursos ?? [];
  const nodes = recursosToNodes(recursos);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const rawRels = relationships ?? raw?.relationships;
  const edges = relationshipsToEdges(rawRels, nodeIds);

  return {
    description: String(raw?.descricao ?? ""),
    estimatedCost: String(raw?.custo_estimado ?? ""),
    nodes,
    edges,
  };
}

/**
 * Adapts raw API response to ArchitectureResult.
 * New contract: direct object. Fallback: response[0].output for backward compatibility.
 */
export function adaptArchitectureResult(raw: unknown): ArchitectureResult | null {
  if (!raw || typeof raw !== "object") return null;

  let obj: RawResponse;
  if (Array.isArray(raw) && raw.length > 0) {
    const item = raw[0] as { output?: RawResponse };
    obj = item?.output ?? (item as RawResponse);
  } else {
    obj = raw as RawResponse;
  }
  const econ = obj.vibe_economica;
  const perf = obj.vibe_performance;

  if (!econ && !perf) return null;

  const mapResource = (r: RawResource): ArchitectureResource => ({
    servico: String(r.servico ?? ""),
    config: r.config,
  });

  const mapRelationships = (rels: RawRelationship[] | undefined): Array<{ source: string; target: string }> =>
    (rels ?? [])
      .filter((r) => r.source != null && r.target != null)
      .map((r) => ({ source: String(r.source), target: String(r.target) }));

  return {
    analiseEntrada: String(obj.analise_entrada ?? ""),
    vibeEconomica: {
      descricao: String(econ?.descricao ?? ""),
      custo_estimado: String(econ?.custo_estimado ?? ""),
      recursos: (econ?.recursos ?? []).map(mapResource),
      relationships: mapRelationships(econ?.relationships),
    },
    vibePerformance: {
      descricao: String(perf?.descricao ?? ""),
      custo_estimado: String(perf?.custo_estimado ?? ""),
      recursos: (perf?.recursos ?? []).map(mapResource),
      relationships: mapRelationships(perf?.relationships),
    },
  };
}

/**
 * Transforms ArchitectureResult to UI-friendly format for diagrams.
 * Nodes from recursos; edges only from backend relationships.
 */
export function toArchitectureUIData(
  result: ArchitectureResult | null
): ArchitectureUIData | null {
  if (!result) return null;

  const econ = mapVibeToUIData(
    {
      descricao: result.vibeEconomica.descricao,
      custo_estimado: result.vibeEconomica.custo_estimado,
      recursos: result.vibeEconomica.recursos.map((r) => ({
        servico: r.servico,
        config: r.config,
      })),
    },
    result.vibeEconomica.relationships
  );

  const perf = mapVibeToUIData(
    {
      descricao: result.vibePerformance.descricao,
      custo_estimado: result.vibePerformance.custo_estimado,
      recursos: result.vibePerformance.recursos.map((r) => ({
        servico: r.servico,
        config: r.config,
      })),
    },
    result.vibePerformance.relationships
  );

  return {
    analysis: result.analiseEntrada,
    economy: econ,
    performance: perf,
  };
}

export type RevisionOption = "vibe_economica" | "vibe_performance";
