export const ANALYSIS_NAMES = [
  "Area Metrics",
  "Embodied Carbon",
  "Sun Hours",
  "Daylight Potential",
  "Wind Analysis",
  "Microclimate Analysis",
  "Noise Analysis",
  "Solar Energy",
] as const;

export type AnalysisName = (typeof ANALYSIS_NAMES)[number];
export interface ProposalData {
  name: string;
  subtitle: string;
  formaBoardReference: string;
  metrics: Record<string, string>;
}
export interface ProjectData {
  siteName: string;
  location: string;
  boundaryArea: string;
  contextualData: string;
  proposals: [ProposalData, ProposalData];
  analyses: Record<AnalysisName, string>;
  bimStatus: string;
  bimReference: string;
  workflow: Record<string, boolean>;
  deliverables: Record<string, boolean>;
}

const workflowItems = [
  "Select a real-world site of at least 1 km²",
  "Define site boundary and record Forma contextual data",
  "Create the site layout in Forma: limits, buildings, roads and green space",
  "Create two distinct site design proposals in Forma",
  "Analyze both proposals with Forma analysis tools",
  "Compare proposals in Forma Board",
  "Export the site BIM model for Revit development",
  "Develop and synchronize a detailed office building in Revit",
];
const deliverableItems = [
  "Verified Forma analysis reports",
  "Site BIM export (IFC or other supported format)",
  "Rendered images",
  "30-second walkthrough video",
];

export const createProjectData = (): ProjectData => ({
  siteName: "", location: "", boundaryArea: "", contextualData: "",
  proposals: [1, 2].map((number) => ({
    name: `Proposal ${number === 1 ? "A" : "B"}`,
    subtitle: "", formaBoardReference: "", metrics: {},
  })) as [ProposalData, ProposalData],
  analyses: Object.fromEntries(ANALYSIS_NAMES.map((name) => [name, ""])) as Record<AnalysisName, string>,
  bimStatus: "Not started", bimReference: "",
  workflow: Object.fromEntries(workflowItems.map((item) => [item, false])),
  deliverables: Object.fromEntries(deliverableItems.map((item) => [item, false])),
});

const STORAGE_KEY = "urbanforma-sih-26114";
export function loadProjectData(): ProjectData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...createProjectData(), ...JSON.parse(raw) as Partial<ProjectData> } : createProjectData();
  } catch {
    return createProjectData();
  }
}
export function saveProjectData(data: ProjectData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export { workflowItems, deliverableItems };
