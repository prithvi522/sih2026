import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Building2, Leaf, Map, Route, Sun, Trees } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { title: "Minimum site area", value: "1", unit: "km2", detail: "Problem statement requirement", icon: Map },
  { title: "Distinct proposals", value: "2", unit: "required", detail: "Create and compare in Forma Board", icon: Building2 },
  { title: "Forma analyses", value: "8", unit: "required", detail: "Record verified analysis results", icon: Leaf },
  { title: "Presentation items", value: "4", unit: "required", detail: "Reports, BIM, renders and video", icon: Route },
];

const analyses = [
  { label: "Area Metrics" },
  { label: "Embodied Carbon" },
  { label: "Sun Hours" },
  { label: "Daylight Potential" },
  { label: "Wind Analysis" },
  { label: "Microclimate Analysis" },
  { label: "Noise Analysis" },
  { label: "Solar Energy" },
];

function Dashboard() {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <span className="eyebrow-line" /> SIH 26114 <span className="eyebrow-divider">/</span> CITY PLANNING
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.2 }}>
            Shape places<br />for <em>better</em> living.
          </motion.h1>
          <motion.p className="hero-description" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.36 }}>
            A considered vision for a city in balanceâ€”where thoughtful planning brings nature, movement and everyday life closer together.
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Link className="button button--primary" to="/site">Explore the site <ArrowUpRight size={16} /></Link>
            <Link className="text-link" to="/proposals">View proposals <ArrowRight size={15} /></Link>
          </motion.div>
          <motion.div className="hero-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
            <span className="status-indicator" /> Concept design <span className="note-separator">Â·</span> In development
          </motion.div>
        </div>
        <a href="#at-a-glance" className="scroll-cue"><ArrowDown size={14} /> SCROLL TO EXPLORE</a>
      </section>

      <section className="overview-section" id="at-a-glance">
        <div className="section-intro"><div><p className="eyebrow">THE FRAMEWORK</p><h2>A city, <em>in perspective.</em></h2></div><p>Every number tells part of a larger story. Together, they help us understand how this place can work better for everyone.</p></div>
        <div className="stats-grid">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return <motion.article className="stat-card" key={stat.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ delay: index * 0.07, duration: 0.55 }}>
              <div className="stat-card-head"><span>{stat.title}</span><Icon size={17} strokeWidth={1.5} /></div>
              <div className="stat-value">{stat.value}<small>{stat.unit}</small></div><p>{stat.detail}</p>
            </motion.article>;
          })}
        </div>
      </section>

      <section className="insight-section">
        <motion.div className="insight-map-panel" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="panel-heading"><div><p className="eyebrow">01 <span>/</span> PLACE</p><h3>Connected by nature.</h3></div><Link className="icon-link" to="/site" aria-label="Explore site plan"><ArrowUpRight size={18} /></Link></div>
          <div className="city-map mini-map" role="img" aria-label="Schematic illustration, not a verified site plan"><div className="map-grid" /><div className="road road-horizontal" /><div className="road road-vertical" /><div className="building b1" /><div className="building b2" /><div className="building b3" /><div className="building b4" /><div className="building b5" /><div className="building b6" /><div className="green-zone"><Trees size={15} /><span>Illustrative greenway</span></div></div>
          <p className="analysis-summary">Schematic illustration only. Create the actual site layout manually in Autodesk Forma.</p>
          <Link className="panel-link" to="/site">Discover the site plan <ArrowRight size={15} /></Link>
        </motion.div>
        <motion.div className="insight-analysis-panel" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
          <div className="panel-heading"><div><p className="eyebrow">02 <span>/</span> PERFORMANCE</p><h3>Designed for the day.</h3></div><Sun size={19} strokeWidth={1.5} /></div>
          <p className="analysis-summary">Required analysis categories. Enter actual results from Autodesk Forma on the analysis page.</p>
          <div className="analysis-list analysis-categories">{analyses.map(({ label }) => <span key={label}>{label}</span>)}</div>
          <Link className="panel-link" to="/analysis">See all indicators <ArrowRight size={15} /></Link>
        </motion.div>
      </section>

      <section className="closing-note"><span className="closing-mark">U.</span><div><p className="eyebrow">A NOTE ON THE NUMBERS</p><p>Project-specific measurements and analysis outputs are left blank until entered from a real site and verified Autodesk Forma work. This interface is a manual tracker, not an Autodesk integration.</p></div><Link to="/proposals" aria-label="Compare proposals"><ArrowUpRight size={19} /></Link></section>
    </main>
  );
}

export default Dashboard;
