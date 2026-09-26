const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) { super(message); this.status = status; }
}

async function request<T>(path: string, init: RequestInit = {}, retry = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  } catch (error) {
    if (retry) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      return request<T>(path, init, false);
    }
    throw new ApiError(error instanceof Error ? error.message : "Backend is unreachable");
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json() as { detail?: unknown };
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((entry) => entry && typeof entry === "object" && "msg" in entry ? String(entry.msg) : "Invalid request data").join("; ");
    } catch { /* retain status message */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface ProjectRecord {
  id: string; name: string; problem_statement_id: string; site_location: string | null;
  site_area_km2: number | null; site_boundary_reference: string | null; description: string | null;
  created_at: string; updated_at: string;
}
export interface ProposalRecord {
  id: string; project_id: string; label: "A" | "B"; name: string; design_summary: string | null;
  site_location: string | null; site_area_km2: number | null; site_boundary_reference: string | null;
  building_count: number | null; green_space_area_m2: number | null; road_network: string | null;
  forma_board_url: string | null; forma_board_reference: string | null; created_at: string; updated_at: string;
  analyses: AnalysisRecord[];
}
export interface ProposalInput {
  label?: "A" | "B"; name: string; design_summary: string | null; site_location: string | null;
  site_area_km2: number | null; site_boundary_reference: string | null; building_count: number | null;
  green_space_area_m2: number | null; road_network: string | null; forma_board_url: string | null;
  forma_board_reference: string | null;
}
export interface AnalysisRecord {
  id: string; proposal_id: string; category: string; value: string | null; unit: string | null;
  status: "not_analyzed" | "analyzed" | "imported"; notes: string | null; data_source: string | null;
  scope: string | null; reporting_period: string | null; analysis_date: string | null; updated_at: string;
}
export interface AnalysisInput {
  category: string; value: string | null; unit: string | null; status: AnalysisRecord["status"];
  notes: string | null; data_source: string | null; scope: string | null;
  reporting_period: string | null; analysis_date: string | null;
}
export interface ComparisonRecord {
  project_id: string; proposal_a: ProposalRecord; proposal_b: ProposalRecord;
  comparable_differences: { category: string; proposal_a: string; proposal_b: string; difference_a_minus_b: string; unit: string | null }[];
}
export type WalkthroughStatus = "not_started" | "recording" | "editing" | "review" | "completed";
export type SceneStatus = "not_started" | "recorded" | "edited";
export interface WalkthroughScene {
  id: string; scene_key: string; order_index: number; title: string; duration_seconds: number;
  start_seconds: number; end_seconds: number; objective: string; recording_instructions: string;
  camera_movement: string; status: SceneStatus; notes: string | null; reference_url: string | null; updated_at: string;
}
export interface WalkthroughSceneInput extends Omit<WalkthroughScene, "id" | "start_seconds" | "end_seconds" | "updated_at"> {}
export interface WalkthroughChecklistItem { id: string; task_key: string; order_index: number; label: string; is_complete: boolean }
export interface WalkthroughPlan {
  id: string; project_id: string; status: WalkthroughStatus; scenes: WalkthroughScene[];
  checklist: WalkthroughChecklistItem[]; created_at: string; updated_at: string;
}

export const api = {
  projects: () => request<ProjectRecord[]>("/api/projects?limit=100", {}, true),
  createProject: (input: { name: string; problem_statement_id: string }) => request<ProjectRecord>("/api/projects", { method: "POST", body: JSON.stringify(input) }),
  updateProject: (id: string, input: Partial<ProjectRecord>) => request<ProjectRecord>(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  proposals: (projectId: string) => request<ProposalRecord[]>(`/api/projects/${projectId}/proposals`, {}, true),
  createProposal: (projectId: string, input: ProposalInput) => request<ProposalRecord>(`/api/projects/${projectId}/proposals`, { method: "POST", body: JSON.stringify(input) }),
  updateProposal: (id: string, input: ProposalInput) => request<ProposalRecord>(`/api/proposals/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  analyses: (proposalId: string) => request<AnalysisRecord[]>(`/api/proposals/${proposalId}/analyses`, {}, true),
  createAnalysis: (proposalId: string, input: AnalysisInput) => request<AnalysisRecord>(`/api/proposals/${proposalId}/analyses`, { method: "POST", body: JSON.stringify(input) }),
  updateAnalysis: (id: string, input: Omit<AnalysisInput, "category">) => request<AnalysisRecord>(`/api/analyses/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteAnalysis: (id: string) => request<void>(`/api/analyses/${id}`, { method: "DELETE" }),
  comparison: (projectId: string) => request<ComparisonRecord>(`/api/projects/${projectId}/comparison`, {}, true),
  walkthroughPlan: (projectId: string) => request<WalkthroughPlan>(`/api/projects/${projectId}/walkthrough-plan`, {}, true),
  updateWalkthroughPlan: (projectId: string, input: { status: WalkthroughStatus; scenes: WalkthroughSceneInput[]; checklist: { task_key: string; is_complete: boolean }[] }) => request<WalkthroughPlan>(`/api/projects/${projectId}/walkthrough-plan`, { method: "PUT", body: JSON.stringify(input) }),
  resetWalkthroughPlan: (projectId: string) => request<WalkthroughPlan>(`/api/projects/${projectId}/walkthrough-plan/reset`, { method: "POST", body: "{}" }),
};

let projectRequest: Promise<ProjectRecord> | null = null;
export function getOrCreateProject(): Promise<ProjectRecord> {
  projectRequest ??= (async () => {
    const projects = await api.projects();
    const existing = projects.find((project) => project.problem_statement_id === "26114");
    return existing ?? api.createProject({ name: "UrbanForma SIH 2026", problem_statement_id: "26114" });
  })().catch((error: unknown) => { projectRequest = null; throw error; });
  return projectRequest;
}
