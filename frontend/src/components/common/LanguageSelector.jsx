/**
 * LanguageSelector.jsx
 * Dropdown / select for all 22 scheduled languages + English.
 * Fetches the list from /api/languages on mount (with cache).
 */
import { useState, useEffect } from "react";
import { languages as langApi } from "../../api/client";

// Simple module-level cache so we don't re-fetch on every mount
let _cache = null;

/**
 * @param {Object}   props
 * @param {string}   props.value        - selected lang code (e.g. "hin_Deva")
 * @param {Function} props.onChange     - (code: string) => void
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.label]
 * @param {string}   [props.className]
 */
export default function LanguageSelector({
  value,
  onChange,
  disabled = false,
  label = "Language",
  className = "",
}) {
  const [options, setOptions] = useState(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) return;
    langApi
      .list()
      .then((data) => {
        _cache = data;
        setOptions(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`language-selector ${className}`}>
      {label && (
        <label className="language-selector__label" htmlFor="lang-select">
          {label}
        </label>
      )}
      <select
        id="lang-select"
        className="language-selector__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        aria-label={label}
      >
        {loading && <option value="">Loading…</option>}
        {options.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.native_name} — {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
