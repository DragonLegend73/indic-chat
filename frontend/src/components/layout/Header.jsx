/**
 * Header.jsx
 * Top navigation bar — title, language selector, student name.
 */
import { useStudent } from "../../context/StudentContext";
import LanguageSelector from "../common/LanguageSelector";

/**
 * @param {Object} props
 * @param {string} [props.title]  - Page title shown in header
 */
export default function Header({ title = "Indic-Chat" }) {
  const { student, langCode, updateLanguage } = useStudent();

  return (
    <header className="app-header">
      <div className="app-header__left">
        <h1 className="app-header__title">{title}</h1>
      </div>

      <div className="app-header__right">
        <LanguageSelector
          value={langCode}
          onChange={updateLanguage}
          label=""
          className="header-lang-selector"
        />
        {student && (
          <div className="app-header__student">
            <span className="header-avatar">
              {student.name?.[0]?.toUpperCase() ?? "S"}
            </span>
            <span className="header-name">{student.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
