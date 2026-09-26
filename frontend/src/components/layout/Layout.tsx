import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";

const navigation = [
  { label: "Overview", to: "/" },
  { label: "Site plan", to: "/site" },
  { label: "Proposals", to: "/proposals" },
  { label: "Analysis", to: "/analysis" },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="UrbanForma home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-name">urbanforma<span>STUDIO</span></span>
        </NavLink>

        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`main-nav${menuOpen ? " main-nav--open" : ""}`} aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              end={item.to === "/"}
              to={item.to}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <NavLink className="header-action" to="/proposals">
          Compare plans <ArrowUpRight size={15} />
        </NavLink>
      </header>
      <Outlet />
      <footer className="site-footer">
        <span>URBANFORMA STUDIO <span className="footer-dot">/</span> SIH 26114</span>
        <span>Planning a more livable tomorrow.</span>
      </footer>
    </div>
  );
}
