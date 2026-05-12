/**
 * Sidebar.jsx
 * Navigation sidebar for the chat interface.
 */
import { NavLink, useNavigate } from "react-router-dom";
import { useStudent } from "../../context/StudentContext";
import LanguageBadge from "../common/LanguageBadge";

const NAV_ITEMS = [
  { to: "/chat", label: "Chat", icon: "💬" },
  { to: "/quiz", label: "Quiz", icon: "📝" },
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
];

export default function Sidebar() {
  const { student, langCode, logout } = useStudent();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">🇮🇳</span>
        <span className="sidebar__title">Indic-Chat</span>
      </div>

      {student && (
        <div className="sidebar__student">
          <div className="sidebar__avatar">
            {student.name?.[0]?.toUpperCase() ?? "S"}
          </div>
          <div className="sidebar__student-info">
            <span className="sidebar__student-name">{student.name}</span>
            <LanguageBadge langCode={langCode} size="xs" />
          </div>
        </div>
      )}

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__logout"
          onClick={handleLogout}
        >
          ← Switch student
        </button>
      </div>
    </aside>
  );
}
