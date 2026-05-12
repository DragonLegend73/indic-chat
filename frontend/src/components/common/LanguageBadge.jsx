import { LANG_NAMES } from '../../utils/languages'

// Map IndicTrans2 codes to short display labels + flag emojis
const LANG_META = {
  asm_Beng: { label: "অসমীয়া", flag: "🇮🇳" },
  ben_Beng: { label: "বাংলা", flag: "🇮🇳" },
  brx_Deva: { label: "बड़ो", flag: "🇮🇳" },
  doi_Deva: { label: "डोगरी", flag: "🇮🇳" },
  guj_Gujr: { label: "ગુજરાતી", flag: "🇮🇳" },
  hin_Deva: { label: "हिन्दी", flag: "🇮🇳" },
  kan_Knda: { label: "ಕನ್ನಡ", flag: "🇮🇳" },
  kas_Arab: { label: "کٲشُر", flag: "🇮🇳" },
  kas_Deva: { label: "कॉशुर", flag: "🇮🇳" },
  gom_Deva: { label: "कोंकणी", flag: "🇮🇳" },
  mai_Deva: { label: "मैथिली", flag: "🇮🇳" },
  mal_Mlym: { label: "മലയാളം", flag: "🇮🇳" },
  mni_Beng: { label: "মৈতৈলোন্", flag: "🇮🇳" },
  mni_Mtei: { label: "ꯃꯤꯇꯩꯂꯣꯟ", flag: "🇮🇳" },
  mar_Deva: { label: "मराठी", flag: "🇮🇳" },
  npi_Deva: { label: "नेपाली", flag: "🇮🇳" },
  ory_Orya: { label: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  pan_Guru: { label: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  san_Deva: { label: "संस्कृतम्", flag: "🇮🇳" },
  sat_Olck: { label: "ᱥᱟᱱᱛᱟᱲᱤ", flag: "🇮🇳" },
  snd_Arab: { label: "سنڌي", flag: "🇮🇳" },
  snd_Deva: { label: "सिन्धी", flag: "🇮🇳" },
  tam_Taml: { label: "தமிழ்", flag: "🇮🇳" },
  tel_Telu: { label: "తెలుగు", flag: "🇮🇳" },
  urd_Arab: { label: "اردو", flag: "🇵🇰" },
  eng_Latn: { label: "English", flag: "🌐" },
};

/**
 * @param {Object} props
 * @param {string} props.langCode   - IndicTrans2 code
 * @param {"xs"|"sm"|"md"} [props.size]
 */
export default function LanguageBadge({ langCode, size = "sm" }) {
  const meta = LANG_META[langCode] ?? { label: LANG_NAMES[langCode] || langCode, flag: "🌐" };
  return (
    <span className={`lang-badge lang-badge--${size}`} title={LANG_NAMES[langCode] || langCode}>
      {meta.flag} {meta.label}
    </span>
  );
}
