import type { InfraService } from "@/lib/api/types";

export interface InfraEdge {
  source: string;
  target: string;
}

/**
 * Infer connections between services from recursos (resources).
 * Backend does not provide connections, so we derive them from service types.
 *
 * Rules:
 * - frontend (web) → backend-api (api)
 * - backend-api → databases (postgres, mysql)
 * - backend-api → cache (redis)
 * - workers → queue / backend-api
 * - load-balancer → frontend or backend
 */
export function inferConnections(recursos: InfraService[]): InfraEdge[] {
  const byType = new Map<InfraService["type"], InfraService[]>();
  for (const r of recursos) {
    const list = byType.get(r.type) ?? [];
    list.push(r);
    byType.set(r.type, list);
  }

  const edges: InfraEdge[] = [];
  const seen = new Set<string>();

  const add = (source: string, target: string) => {
    const key = `${source}->${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source, target });
  };

  const webServices = byType.get("web") ?? [];
  const apiServices = byType.get("api") ?? [];
  const dbServices = byType.get("database") ?? [];
  const cacheServices = byType.get("cache") ?? [];
  const workerServices = byType.get("worker") ?? [];
  const lbServices = byType.get("load-balancer") ?? [];
  const storageServices = byType.get("storage") ?? [];

  // frontend → backend-api
  for (const web of webServices) {
    for (const api of apiServices) {
      add(web.name, api.name);
    }
  }

  // backend-api → databases
  for (const api of apiServices) {
    for (const db of dbServices) {
      add(api.name, db.name);
    }
  }

  // backend-api → cache
  for (const api of apiServices) {
    for (const cache of cacheServices) {
      add(api.name, cache.name);
    }
  }

  // workers → backend-api (or first api as "queue" proxy)
  for (const worker of workerServices) {
    for (const api of apiServices) {
      add(worker.name, api.name);
    }
  }

  // load-balancer → frontend or backend
  for (const lb of lbServices) {
    for (const web of webServices) {
      add(lb.name, web.name);
    }
    for (const api of apiServices) {
      add(lb.name, api.name);
    }
  }

  // backend-api → storage (e.g. S3 for file uploads)
  for (const api of apiServices) {
    for (const storage of storageServices) {
      add(api.name, storage.name);
    }
  }

  return edges;
}
