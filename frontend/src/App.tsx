import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import IntroLoader from "./components/IntroLoader";

import Dashboard from "./pages/Dashboard";
import Site from "./pages/Site";
import Proposals from "./pages/Proposals";
import Analysis from "./pages/Analysis";
import Walkthrough from "./pages/Walkthrough";

function App() {
  return (
    <>
      <IntroLoader />
      <div className="website-content">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/site" element={<Site />} />
            <Route path="/proposals" element={<Proposals />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/walkthrough" element={<Walkthrough />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
