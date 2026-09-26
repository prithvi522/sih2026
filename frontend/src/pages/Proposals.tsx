import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowDownToLine, CheckCircle2, ExternalLink, FileUp, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { ANALYSIS_NAMES } from "../projectData";
import { api, getOrCreateProject, type AnalysisInput, type ComparisonRecord, type ProjectRecord, type ProposalInput, type ProposalRecord } from "../api";

type ProposalDraft = {
  name: string; design_summary: string; site_location: string; site_area_km2: string;
  site_boundary_reference: string; building_count: string; green_space_area_m2: string;
  road_network: string; forma_board_url: string; forma_board_reference: string;
};
const blankDraft = (label: "A" | "B"): ProposalDraft => ({ name: `Proposal ${label}`, design_summary: "", site_location: "", site_area_km2: "", site_boundary_reference: "", building_count: "", green_space_area_m2: "", road_network: "", forma_board_url: "", forma_board_reference: "" });
const fromRecord = (record: ProposalRecord): ProposalDraft => ({ name: record.name, design_summary: record.design_summary ?? "", site_location: record.site_location ?? "", site_area_km2: record.site_area_km2?.toString() ?? "", site_boundary_reference: record.site_boundary_reference ?? "", building_count: record.building_count?.toString() ?? "", green_space_area_m2: record.green_space_area_m2?.toString() ?? "", road_network: record.road_network ?? "", forma_board_url: record.forma_board_url ?? "", forma_board_reference: record.forma_board_reference ?? "" });
const optionalNumber = (value: string) => value.trim() === "" ? null : Number(value);
const decimalFits = (value: string | null, integerDigits: number, decimalPlaces: number) => {
  if (value === null || value.trim() === "") return true;
  const normalized = value.trim();
  if (["nan", "infinity", "+infinity", "-infinity"].includes(normalized.toLowerCase())) return false;
  const match = normalized.match(/^[+-]?(?:\d+(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
  if (!match) return true;
  const number = Number(normalized); const exponent = Number(match[3] ?? 0);
  const fractionLength = (match[1] ?? match[2] ?? "").length;
  return Number.isFinite(number) && Math.abs(number) < 10 ** integerDigits && Math.max(0, fractionLength - exponent) <= decimalPlaces;
};
const toInput = (draft: ProposalDraft): Omit<ProposalInput, "label"> => ({
  name: draft.name.trim(), design_summary: draft.design_summary || null, site_location: draft.site_location || null,
  site_area_km2: optionalNumber(draft.site_area_km2), site_boundary_reference: draft.site_boundary_reference || null,
  building_count: optionalNumber(draft.building_count), green_space_area_m2: optionalNumber(draft.green_space_area_m2),
  road_network: draft.road_network || null, forma_board_url: draft.forma_board_url || null,
  forma_board_reference: draft.forma_board_reference || null,
});
const metrics = ["Site area", "Building count", "Green space", "Road network", ...ANALYSIS_NAMES];

function Proposals() {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [saved, setSaved] = useState<[ProposalRecord | null, ProposalRecord | null]>([null, null]);
  const [drafts, setDrafts] = useState<[ProposalDraft, ProposalDraft]>([blankDraft("A"), blankDraft("B")]);
  const [selected, setSelected] = useState<0 | 1>(0);
  const [comparison, setComparison] = useState<ComparisonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<0 | 1 | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const current = await getOrCreateProject();
      const records = await api.proposals(current.id);
      const ordered: [ProposalRecord | null, ProposalRecord | null] = [records.find((p) => p.label === "A") ?? null, records.find((p) => p.label === "B") ?? null];
      setProject(current); setSaved(ordered);
      setDrafts([ordered[0] ? fromRecord(ordered[0]) : blankDraft("A"), ordered[1] ? fromRecord(ordered[1]) : blankDraft("B")]);
      if (ordered[0] && ordered[1]) setComparison(await api.comparison(current.id)); else setComparison(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load project data"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const updateDraft = (index: 0 | 1, field: keyof ProposalDraft, value: string) => {
    setDrafts((current) => { const next = [...current] as typeof current; next[index] = { ...next[index], [field]: value }; return next; });
  };
  const save = async (index: 0 | 1) => {
    const draft = drafts[index];
    const area = Number(draft.site_area_km2);
    if (!draft.name.trim()) { setError("Enter a proposal name."); return; }
    if (!draft.site_area_km2.trim() || !/^\d+(?:\.\d{1,4})?$/.test(draft.site_area_km2.trim()) || !Number.isFinite(area) || area < 1 || area > 99_999_999.9999) { setError("Site area must be a valid value from 1 to 99,999,999.9999 km², with no more than four decimal places."); return; }
    if (draft.building_count && (!Number.isInteger(Number(draft.building_count)) || Number(draft.building_count) < 0)) { setError("Building count must be a whole number zero or greater."); return; }
    if (draft.green_space_area_m2 && (!Number.isFinite(Number(draft.green_space_area_m2)) || Number(draft.green_space_area_m2) < 0)) { setError("Green space area must be a non-negative number."); return; }
    if (draft.forma_board_url && !/^https?:\/\//i.test(draft.forma_board_url)) { setError("Enter a full Forma Board URL beginning with http:// or https://."); return; }
    if (!project) return;
    setSaving(index); setError(""); setMessage("");
    try {
      const input = toInput(draft);
      const record = saved[index]
        ? await api.updateProposal(saved[index]!.id, input)
        : await api.createProposal(project.id, { ...input, label: index === 0 ? "A" : "B" });
      setSaved((current) => { const next = [...current] as typeof current; next[index] = record; return next; });
      setDrafts((current) => { const next = [...current] as typeof current; next[index] = fromRecord(record); return next; });
      setMessage(`Proposal ${index === 0 ? "A" : "B"} saved to the project database.`);
      if (saved[1 - index] && project) setComparison(await api.comparison(project.id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save proposal"); }
    finally { setSaving(null); }
  };

  const readCell = (proposal: ProposalRecord | null, metric: string): { value: string; unit: string; status: string; source: string; updated: string } => {
    if (!proposal) return { value: "Not entered", unit: "", status: "Not saved", source: "", updated: "" };
    const analysis = proposal.analyses?.find((entry) => entry.category === metric);
    if (analysis) return { value: analysis.value || "Not analyzed", unit: analysis.unit || "", status: analysis.status.replaceAll("_", " "), source: analysis.data_source || "", updated: analysis.updated_at };
    const values: Record<string, [unknown, string]> = {
      "Site area": [proposal.site_area_km2, "km²"], "Building count": [proposal.building_count, "buildings"],
      "Green space": [proposal.green_space_area_m2, "m²"], "Road network": [proposal.road_network, ""],
    };
    const [value, unit] = values[metric] ?? [null, ""];
    return { value: value === null || value === undefined || value === "" ? "Not entered" : String(value), unit, status: value === null || value === undefined || value === "" ? "Not entered" : "Entered", source: "", updated: proposal.updated_at };
  };
  const differences = useMemo(() => new Map((comparison?.comparable_differences ?? []).map((item) => [item.category, item])), [comparison]);

  const exportJson = () => {
    const payload = { project, proposals: saved.filter((proposal): proposal is ProposalRecord => proposal !== null) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = href; anchor.download = "urbanforma-project.json"; anchor.click(); URL.revokeObjectURL(href);
  };
  const exportCsv = () => {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [["Metric", "Proposal A value", "Proposal A unit", "Proposal A status", "Proposal A source", "Proposal A updated at", "Proposal B value", "Proposal B unit", "Proposal B status", "Proposal B source", "Proposal B updated at", "Comparable difference"], ...metrics.map((metric) => {
      const a = readCell(saved[0], metric); const b = readCell(saved[1], metric); const diff = differences.get(metric);
      return [metric, a.value, a.unit, a.status, a.source, a.updated, b.value, b.unit, b.status, b.source, b.updated, diff ? `${diff.difference_a_minus_b}${diff.unit ? ` ${diff.unit}` : ""}` : "Not comparable"];
    })];
    const csv = rows.map((row) => row.map((cell) => quote(String(cell))).join(",")).join("\r\n");
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = href; anchor.download = "urbanforma-comparison.csv"; anchor.click(); URL.revokeObjectURL(href);
  };
  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { proposals?: unknown }).proposals)) throw new Error("The JSON must contain a proposals array.");
      const proposals = (parsed as { proposals: unknown[] }).proposals;
      if (proposals.length < 1 || proposals.length > 2 || !proposals.every((entry) => entry && typeof entry === "object" && ["A", "B"].includes((entry as { label?: string }).label ?? ""))) throw new Error("Import must contain one or two proposal records labelled A or B.");
      const labels = proposals.map((entry) => (entry as { label: string }).label);
      if (new Set(labels).size !== labels.length) throw new Error("Import must not contain duplicate proposal labels.");
      const isTextOrNull = (value: unknown) => value === null || typeof value === "string";
      for (const raw of proposals) {
        const entry = raw as ProposalRecord;
        if (typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 200 || !/^\d+(?:\.\d{1,4})?$/.test(String(entry.site_area_km2)) || !Number.isFinite(Number(entry.site_area_km2)) || Number(entry.site_area_km2) < 1 || Number(entry.site_area_km2) > 99_999_999.9999) throw new Error("Each proposal needs a name and a site area from 1 to 99,999,999.9999 km² with at most four decimal places.");
        if ([entry.design_summary, entry.site_location, entry.site_boundary_reference, entry.road_network, entry.forma_board_url, entry.forma_board_reference].some((value) => !isTextOrNull(value))) throw new Error(`Proposal ${entry.label} contains a field with an invalid type.`);
        if (entry.forma_board_url) { const url = new URL(entry.forma_board_url); if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Proposal ${entry.label} has an invalid Forma Board URL.`); }
        if (entry.building_count !== null && (!Number.isInteger(Number(entry.building_count)) || Number(entry.building_count) < 0)) throw new Error(`Proposal ${entry.label} has an invalid building count.`);
        if (entry.building_count !== null && Number(entry.building_count) > 2_147_483_647) throw new Error(`Proposal ${entry.label} building count is out of range.`);
        if (entry.green_space_area_m2 !== null && (entry.green_space_area_m2 === undefined || !decimalFits(String(entry.green_space_area_m2), 12, 2) || Number(entry.green_space_area_m2) < 0)) throw new Error(`Proposal ${entry.label} has an invalid green space area.`);
        if ((entry.site_location?.length ?? 0) > 300 || (entry.site_boundary_reference?.length ?? 0) > 1000 || (entry.road_network?.length ?? 0) > 500 || (entry.forma_board_url?.length ?? 0) > 2000 || (entry.forma_board_reference?.length ?? 0) > 1000) throw new Error(`Proposal ${entry.label} contains a field that exceeds its allowed length.`);
        if (entry.analyses !== undefined && !Array.isArray(entry.analyses)) throw new Error(`Proposal ${entry.label} analyses must be an array.`);
        for (const analysis of entry.analyses ?? []) {
          if (!ANALYSIS_NAMES.includes(analysis.category as typeof ANALYSIS_NAMES[number]) || !["not_analyzed", "analyzed", "imported"].includes(analysis.status) || !isTextOrNull(analysis.value) || !decimalFits(analysis.value, 12, 6) || !isTextOrNull(analysis.unit) || (analysis.unit?.length ?? 0) > 40 || !isTextOrNull(analysis.notes) || !isTextOrNull(analysis.data_source) || (analysis.data_source?.length ?? 0) > 1000 || !isTextOrNull(analysis.scope) || (analysis.scope?.length ?? 0) > 200 || !isTextOrNull(analysis.reporting_period) || (analysis.reporting_period?.length ?? 0) > 200 || (analysis.analysis_date !== null && !Number.isFinite(Date.parse(analysis.analysis_date)))) throw new Error(`Proposal ${entry.label} contains an invalid analysis record.`);
        }
        if (new Set((entry.analyses ?? []).map((analysis) => analysis.category)).size !== (entry.analyses ?? []).length) throw new Error(`Proposal ${entry.label} contains duplicate analysis categories.`);
      }
      if (!project) throw new Error("Project is not ready yet.");
      for (const entry of proposals as ProposalRecord[]) {
        const index = entry.label === "A" ? 0 : 1;
        const input = toInput(fromRecord(entry));
        const persisted = saved[index]
          ? await api.updateProposal(saved[index]!.id, input)
          : await api.createProposal(project.id, { ...input, label: entry.label });
        if (Array.isArray(entry.analyses)) {
          const existingAnalyses = await api.analyses(persisted.id);
          for (const imported of entry.analyses) {
            if (!ANALYSIS_NAMES.includes(imported.category as typeof ANALYSIS_NAMES[number])) throw new Error(`Unsupported analysis category in Proposal ${entry.label}.`);
            const fields: AnalysisInput = { category: imported.category, value: imported.value, unit: imported.unit, status: imported.status, notes: imported.notes, data_source: imported.data_source, scope: imported.scope, reporting_period: imported.reporting_period, analysis_date: imported.analysis_date };
            const existing = existingAnalyses.find((analysis) => analysis.category === imported.category);
            if (existing) await api.updateAnalysis(existing.id, { value: fields.value, unit: fields.unit, status: fields.status, notes: fields.notes, data_source: fields.data_source, scope: fields.scope, reporting_period: fields.reporting_period, analysis_date: fields.analysis_date });
            else await api.createAnalysis(persisted.id, fields);
          }
        }
      }
      setMessage("JSON proposals validated and imported."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not import JSON data"); }
  };

  return <main className="page-main">
    <section className="page-heading"><p className="eyebrow">FORMA BOARD WORKFLOW</p><h2>Proposal Comparison</h2><p>Save proposal details and verified results in the project database. Analysis values are entered from Forma; this application does not connect to Autodesk Forma.</p></section>
    <div className="data-toolbar"><button className="button button--primary" type="button" onClick={exportJson} disabled={!saved.some(Boolean)}><ArrowDownToLine size={15} /> Export JSON</button><button className="button data-button" type="button" onClick={exportCsv} disabled={!saved.some(Boolean)}><ArrowDownToLine size={15} /> Export comparison CSV</button><label className="button data-button" htmlFor="proposal-import"><FileUp size={15} /> Import JSON</label><input id="proposal-import" type="file" accept="application/json,.json" onChange={(event) => void importJson(event)} hidden /></div>
    {error && <div className="notice" role="alert"><strong>Could not complete request:</strong> {error}<button type="button" className="retry-button" onClick={() => void load()}><RefreshCw size={13} /> Retry</button></div>}
    {message && <div className="notice" role="status">{message}</div>}
    {loading ? <div className="notice" role="status">Loading project proposals…</div> : <div className="proposal-grid">
      {drafts.map((draft, index) => { const i = index as 0 | 1; const label = i === 0 ? "A" : "B"; const field = (key: keyof ProposalDraft, title: string, type = "text", unit = "") => <label className="field-label" key={key}>{title}{unit && <span>({unit})</span>}<input aria-label={`Proposal ${label} ${title}${unit ? ` in ${unit}` : ""}`} type={type} min={key === "site_area_km2" ? 1 : type === "number" ? 0 : undefined} step={key === "site_area_km2" ? "0.0001" : type === "number" ? "any" : undefined} value={draft[key]} onChange={(event) => updateDraft(i, key, event.target.value)} placeholder="Not entered" /></label>;
        return <motion.section className={`proposal${selected === i ? " selected" : ""}`} key={label} onClick={() => setSelected(i)} whileHover={{ y: -2 }}>
          <div className="proposal-header"><div><span>PROPOSAL {label}</span><h3>{draft.name || `Proposal ${label}`}</h3></div><button type="button" className={`selection-dot selection-button${selected === i ? " active" : ""}`} aria-label={`Select Proposal ${label}`} aria-pressed={selected === i} onClick={(event) => { event.stopPropagation(); setSelected(i); }} /></div>
          {field("name", "Proposal name")}{field("design_summary", "Design summary")}{field("site_location", "Site location")}{field("site_area_km2", "Site area", "number", "km²")}
          <p className="field-hint">Minimum 1 km². The API applies the same validation when saving.</p>
          {field("site_boundary_reference", "Site boundary / reference")}{field("building_count", "Number of buildings", "number", "count")}{field("green_space_area_m2", "Green space area", "number", "m²")}{field("road_network", "Road network information")}{field("forma_board_url", "Forma Board URL", "url")}{field("forma_board_reference", "Forma Board report reference")}
          {saved[i]?.forma_board_url && <a className="text-link forma-open-link" href={saved[i]!.forma_board_url!} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Open Forma Board <ExternalLink size={13} /></a>}
          {saved[i]?.forma_board_reference && <p className="field-hint">Report reference: {saved[i]!.forma_board_reference}</p>}
          <button className="button button--primary save-proposal" type="button" disabled={saving !== null} onClick={(event) => { event.stopPropagation(); void save(i); }}>{saving === i ? "Saving…" : saved[i] ? "Save changes" : "Save proposal"}</button>
        </motion.section>;
      })}
    </div>}
    <section className="card comparison"><div className="comparison-header"><div><CheckCircle2 size={20} /><div><h3>Side-by-side comparison</h3><p>Differences appear only when the API confirms numeric values use matching units, scope and reporting period.</p></div></div></div>
      <div className="table-wrapper"><table><thead><tr><th>Metric</th><th>Proposal A</th><th>Proposal B</th><th>Difference (A − B)</th></tr></thead><tbody>{metrics.map((metric) => { const a = readCell(saved[0], metric); const b = readCell(saved[1], metric); const diff = differences.get(metric); return <tr key={metric}><td>{metric}</td><td>{a.value}{a.unit && ` ${a.unit}`}<small className="comparison-meta">{a.status}{a.source && ` · ${a.source}`}{a.updated && ` · Updated ${new Date(a.updated).toLocaleString()}`}</small></td><td>{b.value}{b.unit && ` ${b.unit}`}<small className="comparison-meta">{b.status}{b.source && ` · ${b.source}`}{b.updated && ` · Updated ${new Date(b.updated).toLocaleString()}`}</small></td><td>{diff ? `${diff.difference_a_minus_b}${diff.unit ? ` ${diff.unit}` : ""}` : "Not comparable"}</td></tr>; })}</tbody></table></div>
    </section>
    <div className="notice"><strong>Forma Board:</strong> Create and compare designs in Autodesk Forma. Links open saved references only; they do not synchronize live data. Add metric details and provenance on the Analysis page.</div>
  </main>;
}
export default Proposals;
