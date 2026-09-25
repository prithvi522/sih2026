import { motion } from "framer-motion";

interface AnalysisItem {
  name: string;
  value: number;
  description: string;
}

const analysis: AnalysisItem[] = [
  {
    name: "Sun Hours",
    value: 82,
    description: "Useful solar exposure",
  },
  {
    name: "Daylight Potential",
    value: 76,
    description: "Potential daylight access",
  },
  {
    name: "Embodied Carbon",
    value: 64,
    description: "Conceptual carbon indicator",
  },
  {
    name: "Wind Analysis",
    value: 71,
    description: "Wind flow indicator",
  },
  {
    name: "Microclimate",
    value: 74,
    description: "Outdoor comfort indicator",
  },
  {
    name: "Noise Analysis",
    value: 63,
    description: "Noise environment indicator",
  },
  {
    name: "Solar Energy",
    value: 68,
    description: "Solar potential",
  },
];

function Analysis() {
  return (
    <main className="page-main">
        <section className="page-heading">
          <p className="eyebrow">SITE PERFORMANCE</p>

          <h2>Urban Analysis</h2>

          <p>
            Centralized view of the analysis categories
            required for the smart city planning workflow.
          </p>
        </section>

        <div className="analysis-grid">
          {analysis.map((item, index) => (
            <motion.div
              className="card analysis-card"
              key={item.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="analysis-card-header">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>

                <strong>{item.value}%</strong>
              </div>

              <div className="progress">
                <motion.div
                  className="progress-value"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="notice">
          <strong>Note:</strong> These are illustrative
          dashboard values only. Use verified Autodesk Forma
          outputs for the actual project.
        </div>
    </main>
  );
}

export default Analysis;
