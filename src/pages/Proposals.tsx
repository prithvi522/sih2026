import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface Proposal {
  id: number;
  name: string;
  subtitle: string;
  buildings: number;
  green: string;
  roads: string;
  solar: string;
  daylight: string;
  carbon: string;
}

const proposals: Proposal[] = [
  {
    id: 1,
    name: "Proposal 01",
    subtitle: "Compact Mixed-Use Core",
    buildings: 84,
    green: "31%",
    roads: "18.6 km",
    solar: "68%",
    daylight: "76%",
    carbon: "42.8 ktCO₂e",
  },
  {
    id: 2,
    name: "Proposal 02",
    subtitle: "Distributed Green Corridor",
    buildings: 79,
    green: "38%",
    roads: "20.1 km",
    solar: "73%",
    daylight: "81%",
    carbon: "39.6 ktCO₂e",
  },
];

function Proposals() {
  const [selected, setSelected] = useState<number>(1);

  return (
    <main className="page-main">
        <section className="page-heading">
          <p className="eyebrow">FORMA BOARD WORKFLOW</p>

          <h2>Proposal Comparison</h2>

          <p>
            Compare two conceptual site planning proposals
            using common project metrics.
          </p>
        </section>

        <div className="proposal-grid">
          {proposals.map((proposal) => (
            <motion.button
              key={proposal.id}
              className={`proposal ${
                selected === proposal.id ? "selected" : ""
              }`}
              onClick={() => setSelected(proposal.id)}
              whileHover={{ y: -4 }}
            >
              <div className="proposal-header">
                <div>
                  <span>{proposal.name}</span>
                  <h3>{proposal.subtitle}</h3>
                </div>

                <div
                  className={`selection-dot ${
                    selected === proposal.id ? "active" : ""
                  }`}
                />
              </div>

              <div className="proposal-metrics">
                <Metric
                  label="Buildings"
                  value={proposal.buildings}
                />

                <Metric
                  label="Green Area"
                  value={proposal.green}
                />

                <Metric
                  label="Road Network"
                  value={proposal.roads}
                />

                <Metric
                  label="Solar"
                  value={proposal.solar}
                />
              </div>
            </motion.button>
          ))}
        </div>

        <section className="card comparison">
          <div className="comparison-header">
            <div>
              <CheckCircle2 size={20} />

              <div>
                <h3>
                  {proposals.find(
                    (proposal) => proposal.id === selected
                  )?.name}{" "}
                  Selected
                </h3>

                <p>
                  Replace sample values with actual Forma
                  analysis results.
                </p>
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Proposal 01</th>
                  <th>Proposal 02</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Site Area</td>
                  <td>1.24 km²</td>
                  <td>1.24 km²</td>
                </tr>

                <tr>
                  <td>Buildings</td>
                  <td>84</td>
                  <td>79</td>
                </tr>

                <tr>
                  <td>Green Area</td>
                  <td>31%</td>
                  <td>38%</td>
                </tr>

                <tr>
                  <td>Road Network</td>
                  <td>18.6 km</td>
                  <td>20.1 km</td>
                </tr>

                <tr>
                  <td>Daylight</td>
                  <td>76%</td>
                  <td>81%</td>
                </tr>

                <tr>
                  <td>Solar Energy</td>
                  <td>68%</td>
                  <td>73%</td>
                </tr>

                <tr>
                  <td>Embodied Carbon</td>
                  <td>42.8 ktCO₂e</td>
                  <td>39.6 ktCO₂e</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
    </main>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default Proposals;
