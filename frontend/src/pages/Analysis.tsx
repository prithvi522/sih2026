import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ANALYSIS_NAMES } from "../projectData";
import { api, getOrCreateProject, type AnalysisInput, type AnalysisRecord, type ProposalRecord } from "../api";

type Draft = Omit<AnalysisInput, "category">;
const blank = (): Draft => ({ value: null, unit: "", status: "not_analyzed", notes: "", data_source: "", scope: "", reporting_period: "", analysis_date: null });
const fromRecord = (record: AnalysisRecord): Draft => ({ value: record.value, unit: record.unit ?? "", status: record.status, notes: record.notes ?? "", data_source: record.data_source ?? "", scope: record.scope ?? "", reporting_period: record.reporting_period ?? "", analysis_date: record.analysis_date?.slice(0, 10) ?? null });
const toDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).toISOString() : null;
const guidance: Record<typeof ANALYSIS_NAMES[number], string> = {
  "Area Metrics": "Use the report's area units (for example, m²) and identify the measured scope.",
  "Embodied Carbon": "Use kgCO₂e or tCO₂e and record the reporting scope.",
  "Sun Hours": "Use hours and include the analyzed period or date range.",
  "Daylight Potential": "Use the source measurement or a descriptive result with its method.",
  "Wind Analysis": "Use m/s where available; retain source-specific units and conditions.",
  "Microclimate Analysis": "Use the source's descriptive or measured result and state the method.",
  "Noise Analysis": "Use dB or dB(A) as reported and include measurement conditions.",
  "Solar Energy": "Use kWh or kWh/m² and specify the reporting period.",
};

function Analysis() {
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAnalyses = useCallback(async (proposalId: string) => {
    const loaded = await api.analyses(proposalId); setRecords(loaded);
    setDrafts(Object.fromEntries(ANALYSIS_NAMES.map((name) => {
      const record = loaded.find((item) => item.category === name);
      return [name, record ? fromRecord(record) : blank()];
    })));
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const current = await getOrCreateProject(); const savedProposals = await api.proposals(current.id);
      setProposals(savedProposals);
      const initial = savedProposals[0];
      setSelectedId(initial?.id ?? "");
      if (initial) await loadAnalyses(initial.id); else { setRecords([]); setDrafts({}); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load analysis records"); }
    finally { setLoading(false); }
  }, [loadAnalyses]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);
  const chooseProposal = async (id: string) => {
    setSelectedId(id); setError("");
    try { await loadAnalyses(id); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load analysis results"); }
  };
  const update = <K extends keyof Draft>(category: string, field: K, value: Draft[K]) => {
    setDrafts((current) => ({ ...current, [category]: { ...(current[category] ?? blank()), [field]: value } }));
  };
  const save = async (category: typeof ANALYSIS_NAMES[number]) => {
    const draft = drafts[category] ?? blank();
    if (!selectedId) return;
    setSaving(category); setError(""); setMessage("");
    const payload: AnalysisInput = { ...draft, category, value: draft.value?.trim() || null, unit: draft.unit?.trim() || null, notes: draft.notes?.trim() || null, data_source: draft.data_source?.trim() || null, scope: draft.scope?.trim() || null, reporting_period: draft.reporting_period?.trim() || null, analysis_date: toDate(draft.analysis_date), status: draft.value?.trim() ? (draft.status === "not_analyzed" ? "analyzed" : draft.status) : "not_analyzed" };
    try {
      const existing = records.find((record) => record.category === category);
      const saved = existing ? await api.updateAnalysis(existing.id, payload) : await api.createAnalysis(selectedId, payload);
      setRecords((current) => [...current.filter((record) => record.category !== category), saved]);
      setMessage(`${category} saved for ${proposals.find((proposal) => proposal.id === selectedId)?.name ?? "proposal"}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save analysis"); }
    finally { setSaving(null); }
  };

  return <main className="page-main">
    <section className="page-heading"><p className="eyebrow">SITE PERFORMANCE</p><h2>Urban Analysis</h2><p>Store values, units, scope, reporting period, source, notes, and date from the verified Forma report. This page does not run simulations or connect live to Autodesk Forma.</p></section>
    {error && <div className="notice" role="alert"><strong>Request failed:</strong> {error}<button type="button" className="retry-button" onClick={() => void load()}>Retry</button></div>}
    {message && <div className="notice" role="status">{message}</div>}
    {loading ? <div className="notice" role="status">Loading analysis records…</div> : proposals.length === 0 ? <div className="notice"><strong>No saved proposals yet.</strong> Save Proposal A or B on the comparison page, then enter its verified analysis results here.</div> : <>
      <div className="proposal-tabs" role="tablist" aria-label="Select proposal">{proposals.map((proposal) => <button type="button" role="tab" aria-selected={proposal.id === selectedId} className={`proposal-tab${proposal.id === selectedId ? " active" : ""}`} key={proposal.id} onClick={() => void chooseProposal(proposal.id)}>Proposal {proposal.label}</button>)}</div>
      <div className="analysis-grid">{ANALYSIS_NAMES.map((name, index) => { const draft = drafts[name] ?? blank(); const field = (label: string, key: keyof Draft, placeholder: string, type = "text") => <label className="field-label">{label}<input aria-label={`${name} ${label}`} type={type} value={draft[key] ?? ""} placeholder={placeholder} onChange={(event) => update(name, key, event.target.value)} /></label>;
        return <motion.section className="card analysis-card analysis-entry" key={name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
          <div className="analysis-card-header"><div><h3>{name}</h3><p>{records.find((record) => record.category === name)?.status.replaceAll("_", " ") ?? "Not analyzed"}</p><p>{guidance[name]}</p></div></div>
          {field("Result / value", "value", "Not analyzed")}{field("Unit", "unit", "For example, hours, dB(A), kgCO₂e")}{field("Data source", "data_source", "Forma report or source URL")}{field("Reporting scope", "scope", "For example, material scope")}{field("Reporting period", "reporting_period", "For example, annual or date range")}{field("Analysis date", "analysis_date", "", "date")}{field("Notes", "notes", "Optional explanation")}
          <label className="field-label">Status<select value={draft.status} onChange={(event) => update(name, "status", event.target.value as Draft["status"])}><option value="not_analyzed">Not analyzed</option><option value="analyzed">Analyzed</option><option value="imported">Imported</option></select></label>
          <button type="button" className="button button--primary save-proposal" disabled={saving !== null} onClick={() => void save(name)}>{saving === name ? "Saving…" : "Save result"}</button>
        </motion.section>;
      })}</div>
    </>}
    <div className="notice"><strong>Manual record:</strong> Enter the actual values from Autodesk Forma. “Imported” describes manually entered report data; native Forma reports/models are not parsed by this app.</div>
  </main>;
}
export default Analysis;
