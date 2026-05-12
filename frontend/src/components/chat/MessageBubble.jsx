import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { LANG_NAMES } from '../../utils/languages'

const BADGE_COLORS = {
  hin_Deva: 'badge-devanagari', mar_Deva: 'badge-devanagari', san_Deva: 'badge-devanagari',
  npi_Deva: 'badge-devanagari', mai_Deva: 'badge-devanagari', doi_Deva: 'badge-devanagari',
  brx_Deva: 'badge-devanagari', gom_Deva: 'badge-devanagari', kas_Deva: 'badge-devanagari',
  snd_Deva: 'badge-devanagari',
  tam_Taml: 'badge-tamil',
  ben_Beng: 'badge-bengali', asm_Beng: 'badge-bengali', mni_Beng: 'badge-bengali',
  tel_Telu: 'badge-telugu',
  kan_Knda: 'badge-kannada',
  mal_Mlym: 'badge-malayalam',
  guj_Gujr: 'badge-gujarati',
  pan_Guru: 'badge-gurmukhi',
  urd_Arab: 'badge-arabic', kas_Arab: 'badge-arabic', snd_Arab: 'badge-arabic',
  ory_Orya: 'badge-odia',
  eng_Latn: 'badge-latin',
}

export default function MessageBubble({ message, student }) {
  const isUser = message.role === 'user'

  const langBadge = message.meta?.language || message.responseLang
  const badgeClass = BADGE_COLORS[langBadge] || 'badge-latin'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div 
        className={`max-w-[75%] px-4 py-3 ${isUser ? 'msg-user text-white' : 'msg-assistant'}`}
        role={!isUser && message.error ? 'alert' : undefined}
        aria-live={!isUser && message.error ? 'polite' : undefined}
      >
        <div className={`text-sm leading-relaxed break-words ${isUser ? 'whitespace-pre-wrap' : 'markdown-body'}`}>
          {isUser ? (
            message.content || '...'
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {message.content || '...'}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {!message.responseLang && !message.meta?.language && student?.preferred_language === 'auto' && !message.error && (
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white/50 border border-white/10">
                Detecting...
              </span>
            )}
            {message.meta?.language && message.responseLang ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full text-white bg-white/10 border border-white/10`}>
                {LANG_NAMES[message.meta.language] || message.meta.language} ➔ {LANG_NAMES[message.responseLang] || message.responseLang}
              </span>
            ) : (langBadge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${badgeClass}`}>
                {LANG_NAMES[langBadge] || langBadge}
              </span>
            ))}
            {message.isTranslating && (
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white/70 bg-white/10 flex items-center gap-1 animate-pulse">
                Translating to {LANG_NAMES[student?.preferred_language === 'auto' ? langBadge : student?.preferred_language] || 'desired language'}...
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
