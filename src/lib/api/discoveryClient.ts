import type {
  Project,
  CreateProjectResponse,
} from "./types";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "https://vibeclouding-ingestion-service-production.up.railway.app";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    const message =
      (detail as { detail?: string })?.detail ??
      (detail as { message?: string })?.message ??
      res.statusText;
    throw new ApiError(message, res.status, detail);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function createProject(
  projectName: string,
  summary?: string
): Promise<CreateProjectResponse> {
  const body: { project_name: string; summary?: string } = {
    project_name: projectName,
  };
  if (summary) body.summary = summary;

  const data = await request<CreateProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data;
}

export async function getProjects(): Promise<Project[]> {
  try {
    const data = await request<{ projects?: Project[] }>("/projects");
    return data.projects ?? [];
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

export interface ContextResponse {
  project?: { project_name?: string; summary?: string };
  repo_url?: string;
  overview?: { project_type?: string; repo_url?: string };
  stack?: { languages?: string[]; frameworks?: string[] };
  understanding_summary?: {
    items: Array<{ key: string; label: string; value: string; source: "confirmed" | "inferred" }>;
  };
  next_best_step?: {
    title: string;
    description: string;
    type?: "repo" | "question" | "clarification" | "review";
  };
}

export async function getContext(
  projectId: string
): Promise<ContextResponse> {
  return request<ContextResponse>(`/projects/${projectId}/context`);
}

export async function linkRepo(
  projectId: string,
  repoUrl: string
): Promise<{ repo_url?: string }> {
  return request(`/projects/${projectId}/repo`, {
    method: "PATCH",
    body: JSON.stringify({ repo_url: repoUrl }),
  });
}

export async function startArchitecture(projectId: string): Promise<void> {
  await request(`/projects/${projectId}/start-architecture`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export interface ActivityEvent {
  type: string;
  label: string;
  timestamp: string;
}

export interface ActivityResponse {
  events: ActivityEvent[];
}

export async function getActivity(
  projectId: string
): Promise<ActivityResponse> {
  try {
    const data = await request<ActivityResponse>(`/projects/${projectId}/activity`);
    return data ?? { events: [] };
  } catch {
    return { events: [] };
  }
}

export interface Diagram {
  id?: string;
  name?: string;
  type?: string;
  content?: string;
  [key: string]: unknown;
}

export interface DiagramsResponse {
  diagrams?: Diagram[];
}

export async function getDiagrams(
  projectId: string
): Promise<DiagramsResponse> {
  return request<DiagramsResponse>(`/projects/${projectId}/architecture-result`);
}

export type { TerraformFile } from "./terraform";
export { adaptTerraformResponse } from "./terraform";

import type { TerraformFile } from "./terraform";
import { adaptTerraformResponse } from "./terraform";
import { MOCK_TERRAFORM_FILES } from "./mock-terraform";

export async function getTerraformFiles(projectId: string): Promise<TerraformFile[]> {
  try {
    const raw = await request<unknown>(`/projects/${projectId}/terraform`);
    return adaptTerraformResponse(raw);
  } catch {
    return MOCK_TERRAFORM_FILES;
  }
}

export type {
  ArchitectureResult,
  ArchitectureUIData,
  GraphEdge,
  GraphNode,
  RevisionOption,
  VibeOption,
} from "./architectureResult";
export {
  adaptArchitectureResult,
  toArchitectureUIData,
} from "./architectureResult";

import { adaptArchitectureResult } from "./architectureResult";
import type { ArchitectureResult, RevisionOption } from "./architectureResult";

export async function getArchitectureResult(
  projectId: string
): Promise<ArchitectureResult | null> {
  try {
    const raw = await request<unknown>(
      `/projects/${projectId}/architecture-result`
    );
    return adaptArchitectureResult(raw);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return null;
    }
    throw e;
  }
}

/** Maps UI option to backend value (vibe-economica / vibe-performace) */
function toBackendOption(option: RevisionOption): string {
  return option === "vibe_economica" ? "vibe-economica" : "vibe-performace";
}

export async function postRevisionDecision(
  projectId: string,
  selectedOption: RevisionOption
): Promise<void> {
  await request(`/projects/${projectId}/revision-decision`, {
    method: "POST",
    body: JSON.stringify({ selected_option: toBackendOption(selectedOption) }),
  });
}
