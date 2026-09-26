import { motion } from "framer-motion";
import {
  Building2,
  Layers,
  Map,
  Route,
  Trees,
} from "lucide-react";
import { useState } from "react";
import { loadProjectData, saveProjectData, workflowItems, deliverableItems, type ProjectData } from "../projectData";

const layers = [
  {
    name: "Site Limits",
    icon: Map,
  },
  {
    name: "Buildings",
    icon: Building2,
  },
  {
    name: "Transportation",
    icon: Route,
  },
  {
    name: "Landscaping",
    icon: Trees,
  },
];

function Site() {
  const [project, setProject] = useState<ProjectData>(loadProjectData);
  const update = (next: ProjectData) => { setProject(next); saveProjectData(next); };
  const toggle = (group: "workflow" | "deliverables", item: string) => update({ ...project, [group]: { ...project[group], [item]: !project[group][item] } });
  const updateField = (field: "siteName" | "location" | "boundaryArea" | "contextualData", value: string) => update({ ...project, [field]: value });
  return (
    <main className="page-main">
        <PageTitle
          eyebrow="SITE PLANNING"
          title="Site Plan"
          description="Track the real site and record Forma context. The illustration below is a placeholder and does not represent a verified site model."
        />

        <section className="card project-details">
          <h3>Project and site record</h3>
          <div className="project-fields">
            <label className="field-label">Site name<input value={project.siteName} onChange={(event) => updateField("siteName", event.target.value)} placeholder="Enter the selected site" /></label>
            <label className="field-label">Location<input value={project.location} onChange={(event) => updateField("location", event.target.value)} placeholder="City, region, country" /></label>
            <label className="field-label">Boundary area<input value={project.boundaryArea} onChange={(event) => updateField("boundaryArea", event.target.value)} placeholder="Enter measured area and units" /></label>
            <label className="field-label">Forma contextual data / source reference<input value={project.contextualData} onChange={(event) => updateField("contextualData", event.target.value)} placeholder="Add notes or a source link" /></label>
          </div>
        </section>

        <div className="site-layout">
          <motion.div
            className="card large-map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="city-map full-map">
              <div className="map-grid" />
              <div className="road road-horizontal" />
              <div className="road road-vertical" />

              <div className="building b1" />
              <div className="building b2" />
              <div className="building b3" />
              <div className="building b4" />
              <div className="building b5" />
              <div className="building b6" />

              <div className="green-zone">
                <Trees size={18} />
                Green Corridor
              </div>
            </div>
          </motion.div>

          <aside className="card layer-panel">
            <div className="section-heading">
              <div>
                <h3>Site Layers</h3>
                <p>Planning components</p>
              </div>

              <Layers size={20} />
            </div>

            <div className="layers">
              {layers.map((layer) => {
                const Icon = layer.icon;

                return (
                  <div className="layer" key={layer.name}>
                    <Icon size={18} />
                    <span>{layer.name}</span>
                    <i />
                  </div>
                );
              })}
            </div>

            <div className="constraint">
              <strong>Site Constraint</strong>

              <p>
                The project site must meet the minimum
                area requirement defined in the problem statement.
              </p>
            </div>
          </aside>
        </div>
        <section className="card checklist-card">
          <h3>Project workflow</h3>
          {workflowItems.map((item) => <label className="checklist-item" key={item}><input type="checkbox" checked={project.workflow[item] ?? false} onChange={() => toggle("workflow", item)} /><span>{item}</span></label>)}
        </section>
        <section className="card checklist-card">
          <h3>Presentation and deliverables</h3>
          {deliverableItems.map((item) => <label className="checklist-item" key={item}><input type="checkbox" checked={project.deliverables[item] ?? false} onChange={() => toggle("deliverables", item)} /><span>{item}</span></label>)}
          <label className="field-label">Revit / BIM export status<select value={project.bimStatus} onChange={(event) => update({ ...project, bimStatus: event.target.value })}><option>Not started</option><option>In progress</option><option>Exported</option><option>Synchronized with Forma</option></select></label>
          <label className="field-label">BIM export reference<input value={project.bimReference} onChange={(event) => update({ ...project, bimReference: event.target.value })} placeholder="File name, format, or location" /></label>
          <div className="notice"><strong>Autodesk workflow:</strong> Site creation, Forma analysis, Forma Board comparison, BIM export, and Revit synchronization are completed in their respective Autodesk tools. This tracker does not perform those actions.</div>
        </section>
    </main>
  );
}

interface PageTitleProps {
  eyebrow: string;
  title: string;
  description: string;
}

function PageTitle({
  eyebrow,
  title,
  description,
}: PageTitleProps) {
  return (
    <section className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default Site;
