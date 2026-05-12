/**
 * Shared language name mappings for Indic-Chat.
 */

export const LANG_NAMES = {
  hin_Deva: 'Hindi', mar_Deva: 'Marathi', san_Deva: 'Sanskrit',
  npi_Deva: 'Nepali', mai_Deva: 'Maithili', doi_Deva: 'Dogri',
  brx_Deva: 'Bodo', gom_Deva: 'Konkani', kas_Deva: 'Kashmiri',
  snd_Deva: 'Sindhi', tam_Taml: 'Tamil',
  ben_Beng: 'Bengali', asm_Beng: 'Assamese', mni_Beng: 'Manipuri',
  tel_Telu: 'Telugu', kan_Knda: 'Kannada', mal_Mlym: 'Malayalam',
  guj_Gujr: 'Gujarati', pan_Guru: 'Punjabi',
  urd_Arab: 'Urdu', kas_Arab: 'Kashmiri', snd_Arab: 'Sindhi',
  ory_Orya: 'Odia', sat_Olck: 'Santali', mni_Mtei: 'Meitei',
  eng_Latn: 'English',
}

export const getLanguageName = (code) => {
  if (!code) return 'Detecting...'
  if (code === 'auto') return 'Auto Detect'
  return LANG_NAMES[code] || code
}
