import { motion } from "framer-motion";
import {
  Building2,
  Layers,
  Map,
  Route,
  Trees,
} from "lucide-react";

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
  return (
    <main className="page-main">
        <PageTitle
          eyebrow="SITE PLANNING"
          title="Site Plan"
          description="Explore the conceptual site planning structure and major planning layers."
        />

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
