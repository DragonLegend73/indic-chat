import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { getStudents, createStudent, getLanguages } from '../api/client'
import { getLanguageName } from '../utils/languages'

export default function StudentSelect() {
  const [students, setStudents] = useState([])
  const [languages, setLanguages] = useState([])
  const [newName, setNewName] = useState('')
  const [newLang, setNewLang] = useState('auto')
  const [loading, setLoading] = useState(true)
  const { setStudent } = useStudent()
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([getStudents(), getLanguages()])
      .then(([s, l]) => { setStudents(s); setLanguages(l.languages || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const selectStudent = (s) => { setStudent(s); nav('/chat') }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    const s = await createStudent({ name: newName, preferred_language: newLang })
    setStudent(s)
    nav('/chat')
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-[#ececec] placeholder:text-[#8e8ea0] focus:outline-none transition-colors border border-white/[0.08] focus:border-white/25"
  const inputStyle = { background: '#2f2f2f' }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#212121' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-white mb-3">Indic-Chat</h1>
          <p className="text-base text-[#8e8ea0]">Multilingual AI Tutor • 22 Languages</p>
        </div>

        {/* Existing students */}
        {students.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8e8ea0] mb-3">Continue as</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {students.map(s => (
                <button key={s.id} onClick={() => selectStudent(s)}
                  className="p-4 text-left cursor-pointer hover:bg-[#3a3a3a] transition-colors rounded-xl border border-white/[0.08]"
                  style={{ background: '#2f2f2f' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#ececec] text-base">{s.name}</p>
                      <p className="text-xs text-[#8e8ea0] mt-0.5">{getLanguageName(s.preferred_language)} • {s.current_difficulty}</p>
                    </div>
                    <span className="text-[#8e8ea0]">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create new */}
        <div className="rounded-xl border border-white/[0.08] p-6" style={{ background: '#2f2f2f' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8e8ea0] mb-4">New Student</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input type="text" placeholder="Your name" value={newName} onChange={e => setNewName(e.target.value)}
              className={inputCls} style={inputStyle} />
            <select value={newLang} onChange={e => setNewLang(e.target.value)}
              className={inputCls} style={inputStyle}>
              <option value="auto">🌐 Auto Detect Language</option>
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.nativeName} ({l.name})</option>
              ))}
            </select>
            <button type="submit" disabled={!newName.trim()}
              className="w-full bg-white hover:bg-gray-100 disabled:opacity-30 rounded-xl py-3 font-semibold transition-all text-[#212121] text-sm">
              Start Learning →
            </button>
          </form>
        </div>

        {/* Dashboard link */}
        <div className="text-center mt-6">
          <button onClick={() => nav('/dashboard/login')} className="text-xs text-[#8e8ea0] hover:text-[#ececec] transition-colors">
            🔒 Teacher Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
