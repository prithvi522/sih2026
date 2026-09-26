import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Clapperboard, ExternalLink, Film, RefreshCw, RotateCcw, Save, Video } from "lucide-react";
import { motion } from "framer-motion";
import { api, getOrCreateProject, type SceneStatus, type WalkthroughPlan, type WalkthroughScene, type WalkthroughStatus } from "../api";

const videoStatuses: { value: WalkthroughStatus; label: string }[] = [
  { value: "not_started", label: "Video not started" },
  { value: "recording", label: "Recording in progress" },
  { value: "editing", label: "Editing in progress" },
  { value: "review", label: "Ready for review" },
  { value: "completed", label: "Final video completed" },
];
const sceneStatuses: { value: SceneStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "recorded", label: "Recorded" },
  { value: "edited", label: "Edited" },
];
const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

function Walkthrough() {
  const [plan, setPlan] = useState<WalkthroughPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const project = await getOrCreateProject();
      const savedPlan = await api.walkthroughPlan(project.id);
      setPlan(savedPlan); setDirty(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the walkthrough plan");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const orderedScenes = useMemo(() => plan ? [...plan.scenes].sort((a, b) => a.order_index - b.order_index) : [], [plan]);
  const timeline = useMemo(() => {
    return orderedScenes.map((scene, index) => {
      const start = orderedScenes.slice(0, index).reduce((total, previous) => total + previous.duration_seconds, 0);
      return { ...scene, start_seconds: start, end_seconds: start + scene.duration_seconds };
    });
  }, [orderedScenes]);
  const totalDuration = timeline.reduce((sum, scene) => sum + scene.duration_seconds, 0);
  const recorded = orderedScenes.filter((scene) => scene.status === "recorded" || scene.status === "edited").length;
  const edited = orderedScenes.filter((scene) => scene.status === "edited").length;
  const completion = orderedScenes.length ? Math.round((edited / orderedScenes.length) * 100) : 0;
  const remaining = orderedScenes.length - edited;

  const editScene = (sceneKey: string, changes: Partial<WalkthroughScene>) => {
    setPlan((current) => current ? { ...current, scenes: current.scenes.map((scene) => scene.scene_key === sceneKey ? { ...scene, ...changes } : scene) } : current);
    setDirty(true); setMessage("");
  };
  const reorder = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (!plan || target < 0 || target >= orderedScenes.length) return;
    const reordered = [...orderedScenes]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setPlan({ ...plan, scenes: reordered.map((scene, order_index) => ({ ...scene, order_index })) }); setDirty(true); setMessage("");
  };
  const updateStatus = (status: WalkthroughStatus) => {
    if (plan) { setPlan({ ...plan, status }); setDirty(true); setMessage(""); }
  };
  const toggleTask = (taskKey: string) => {
    if (plan) {
      setPlan({ ...plan, checklist: plan.checklist.map((task) => task.task_key === taskKey ? { ...task, is_complete: !task.is_complete } : task) });
      setDirty(true); setMessage("");
    }
  };
  const save = async () => {
    if (!plan) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await api.updateWalkthroughPlan(plan.project_id, {
        status: plan.status,
        scenes: orderedScenes.map((scene, order_index) => ({ scene_key: scene.scene_key, order_index, title: scene.title, duration_seconds: scene.duration_seconds, objective: scene.objective, recording_instructions: scene.recording_instructions, camera_movement: scene.camera_movement, status: scene.status, notes: scene.notes, reference_url: scene.reference_url?.trim() || null })),
        checklist: plan.checklist.map(({ task_key, is_complete }) => ({ task_key, is_complete })),
      });
      setPlan(saved); setDirty(false); setMessage("Walkthrough plan saved to the project database.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the walkthrough plan"); }
    finally { setSaving(false); }
  };
  const reset = async () => {
    if (!plan || !window.confirm("Reset all five scenes and checklist items to the original plan? This clears your edits.")) return;
    setSaving(true); setError(""); setMessage("");
    try { setPlan(await api.resetWalkthroughPlan(plan.project_id)); setDirty(false); setMessage("Walkthrough plan reset to its original five-scene structure."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not reset the walkthrough plan"); }
    finally { setSaving(false); }
  };

  const checklistDone = plan?.checklist.filter((task) => task.is_complete).length ?? 0;

  return <main className="page-main walkthrough-page">
    <section className="page-heading"><p className="eyebrow">SIH 26114 <span>/</span> GRAND FINALE</p><h2>Walkthrough Video Plan</h2><p>Plan and track your team’s 30-second site walkthrough. Record footage directly from the actual Autodesk Forma model; this page does not render or generate video.</p></section>
    {error && <div className="notice" role="alert"><strong>Backend unavailable or request failed:</strong> {error}<button className="retry-button" type="button" onClick={() => void load()}><RefreshCw size={13} /> Retry</button></div>}
    {message && <div className="notice walkthrough-message" role="status"><Check size={14} /> {message}</div>}
    {loading ? <div className="notice" role="status">Loading saved video plan…</div> : plan && <>
      <section className="video-summary-grid">
        <article className="card video-spec-card"><div className="video-card-icon"><Clapperboard size={18} /></div><p className="eyebrow">PROJECT</p><h3>UrbanForma</h3><p>Problem Statement ID 26114</p></article>
        <article className="card video-spec-card"><div className="video-card-icon"><Film size={18} /></div><p className="eyebrow">OUTPUT SETTINGS</p><h3>30 sec <span>·</span> MP4</h3><p>1920 × 1080 <span>·</span> 30 FPS <span>·</span> 16:9</p></article>
        <article className="card video-spec-card"><div className="video-card-icon"><Video size={18} /></div><p className="eyebrow">DELIVERABLE STATUS</p><label className="field-label">Video status<select value={plan.status} onChange={(event) => updateStatus(event.target.value as WalkthroughStatus)}>{videoStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></article>
      </section>

      <section className="card video-progress-card">
        <div className="video-section-heading"><div><p className="eyebrow">PROJECT PROGRESS</p><h3>Recording and edit status</h3></div><strong className="video-progress-percent">{completion}%</strong></div>
        <div className="progress video-progress" role="progressbar" aria-label="Walkthrough scenes edited" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><div className="progress-value" style={{ width: `${completion}%` }} /></div>
        <div className="video-progress-stats"><span><strong>{orderedScenes.length}</strong> total scenes</span><span><strong>{recorded}</strong> recorded</span><span><strong>{edited}</strong> edited</span><span><strong>{remaining}</strong> remaining</span><span><strong>{totalDuration} sec</strong> planned</span></div>
        <p className="video-total-note">{totalDuration === 30 ? "Planned duration matches the 30-second target." : `Duration warning: this plan is ${totalDuration} seconds; adjust scenes to total exactly 30 seconds.`}</p>
      </section>

      <section className="card timeline-card">
        <div className="video-section-heading"><div><p className="eyebrow">SCENE TIMELINE</p><h3>Five-scene sequence</h3></div><span className="timeline-total">{totalDuration} sec total</span></div>
        <div className="video-timeline" role="list" aria-label="Walkthrough scene timeline">{timeline.map((scene) => <div className={`video-timeline-segment status-${scene.status}`} role="listitem" key={scene.scene_key} style={{ flexGrow: scene.duration_seconds }}>
          <span className="timeline-timing">{formatTime(scene.start_seconds)}–{formatTime(scene.end_seconds)}</span><strong>{scene.title}</strong><span>{scene.duration_seconds} sec <i>·</i> {sceneStatuses.find((status) => status.value === scene.status)?.label}</span>
        </div>)}</div>
      </section>

      <section className="video-scenes-section"><div className="video-section-heading"><div><p className="eyebrow">EDITABLE SHOT LIST</p><h3>Scene plan</h3></div><button type="button" className="button data-button" disabled={saving} onClick={() => void reset()}><RotateCcw size={14} /> Reset plan</button></div>
        <div className="video-scene-list">{timeline.map((scene, index) => <motion.article className="card video-scene-card" key={scene.scene_key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
          <div className="video-scene-top"><div className="scene-number">{String(index + 1).padStart(2, "0")}</div><div className="video-scene-title"><p className="eyebrow">SCENE {index + 1} <span>/</span> {formatTime(scene.start_seconds)}–{formatTime(scene.end_seconds)}</p><h4>{scene.title}</h4></div><div className="scene-order-controls"><button type="button" className="icon-button" aria-label={`Move ${scene.title} earlier`} disabled={index === 0 || saving} onClick={() => reorder(index, -1)}><ArrowUp size={15} /></button><button type="button" className="icon-button" aria-label={`Move ${scene.title} later`} disabled={index === timeline.length - 1 || saving} onClick={() => reorder(index, 1)}><ArrowDown size={15} /></button></div></div>
          <div className="video-scene-fields">
            <label className="field-label">Scene title<input value={scene.title} onChange={(event) => editScene(scene.scene_key, { title: event.target.value })} /></label>
            <label className="field-label">Duration (seconds)<input type="number" min="1" max="300" step="1" value={scene.duration_seconds} onChange={(event) => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 300) editScene(scene.scene_key, { duration_seconds: value }); }} /></label>
            <label className="field-label">Recording status<select value={scene.status} onChange={(event) => editScene(scene.scene_key, { status: event.target.value as SceneStatus })}>{sceneStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
            <label className="field-label">Start time<input readOnly value={`${formatTime(scene.start_seconds)} (${scene.start_seconds}s)`} /></label>
            <label className="field-label">End time<input readOnly value={`${formatTime(scene.end_seconds)} (${scene.end_seconds}s)`} /></label>
            <label className="field-label video-field-wide">Scene objective<textarea rows={2} value={scene.objective} onChange={(event) => editScene(scene.scene_key, { objective: event.target.value })} /></label>
            <label className="field-label video-field-wide">Recording instructions<textarea rows={3} value={scene.recording_instructions} onChange={(event) => editScene(scene.scene_key, { recording_instructions: event.target.value })} /></label>
            <label className="field-label">Camera movement<input value={scene.camera_movement} onChange={(event) => editScene(scene.scene_key, { camera_movement: event.target.value })} /></label>
            <label className="field-label">Reference screenshot URL <span>(optional)</span><input type="url" value={scene.reference_url ?? ""} placeholder="https://…" onChange={(event) => editScene(scene.scene_key, { reference_url: event.target.value || null })} /></label>
            <label className="field-label video-field-wide">Notes<textarea rows={2} value={scene.notes ?? ""} onChange={(event) => editScene(scene.scene_key, { notes: event.target.value || null })} placeholder="Add shot-specific notes" /></label>
          </div>
          {scene.reference_url && <a className="text-link scene-reference-link" href={scene.reference_url} target="_blank" rel="noreferrer">Open reference image <ExternalLink size={13} /></a>}
        </motion.article>)}</div>
      </section>

      <section className="card video-checklist-card"><div className="video-section-heading"><div><p className="eyebrow">FINAL VIDEO CHECKLIST</p><h3>Recording to delivery</h3></div><span className="timeline-total">{checklistDone} / {plan.checklist.length} complete</span></div>
        {plan.checklist.map((task) => <label className="checklist-item" key={task.task_key}><input type="checkbox" checked={task.is_complete} onChange={() => toggleTask(task.task_key)} /><span>{task.label}</span></label>)}
      </section>

      <section className="card video-export-card"><div className="video-section-heading"><div><p className="eyebrow">EXPORT SETTINGS</p><h3>Final deliverable</h3></div><Film size={19} /></div>
        <div className="export-settings-grid"><div><span>Resolution</span><strong>1920 × 1080</strong></div><div><span>Frame rate</span><strong>30 FPS</strong></div><div><span>Format</span><strong>MP4</strong></div><div><span>Target duration</span><strong>30 seconds</strong></div><div><span>Aspect ratio</span><strong>16:9</strong></div></div>
        <p className="analysis-summary">This planner tracks export requirements. Video recording, editing, and rendering take place in your chosen tools.</p>
      </section>
      <div className="video-save-bar"><span>{dirty ? "Unsaved changes" : "All changes saved"}</span><button type="button" className="button button--primary" disabled={!dirty || saving} onClick={() => void save()}><Save size={15} /> {saving ? "Saving…" : "Save video plan"}</button></div>
    </>}
  </main>;
}
export default Walkthrough;
