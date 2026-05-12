/**
 * DashboardPage.jsx
 * Analytics dashboard for teachers. JWT-protected.
 * Shows: accuracy over time, topic heatmap, language distribution, weak topics.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { analytics, setAuthToken, deleteStudent, updateStudent } from "../api/client";
import { LANG_NAMES, getLanguageName } from "../utils/languages";
import LanguageBadge from "../components/common/LanguageBadge";

// Restore JWT from sessionStorage if present
const saved = sessionStorage.getItem("indic_admin_token");
if (saved) setAuthToken(saved);

export default function DashboardPage() {
  const navigate = useNavigate();

  const [data, setData] = useState({
    overview: null,
    topics: [],
    languages: [],
    students: [],
  });
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [studentDetails, setStudentDetails] = useState({}); // Cache for weak topics { id: [] }
  const [updatingId, setUpdatingId] = useState(null); // Track which student is being updated
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, studentId: null, studentName: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, topics, langs, students] = await Promise.all([
        analytics.overview(),
        analytics.topics(),
        analytics.languages(),
        analytics.students(),
      ]);
      setData({
        overview: overview ?? {},
        topics: topics ?? [],
        languages: langs ?? { distribution: [] },
        students: students ?? [],
      });
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        navigate("/dashboard/login");
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const cardStyle = { background: '#2f2f2f' };
  const cardCls = "rounded-xl border border-white/[0.08] p-6";

  return (
    <div className="min-h-screen p-6" style={{ background: '#212121' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
            <p className="text-[#8e8ea0] text-sm mt-1">Analytics & Student Performance</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="text-sm px-3 py-2 rounded-xl border border-white/[0.08] text-[#b4b4b4] hover:border-white/20 hover:text-white transition-colors"
              style={{ background: '#2f2f2f' }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => { setAuthToken(null); navigate("/dashboard/login"); }}
              className="text-sm px-3 py-2 rounded-xl border border-white/[0.08] text-[#8e8ea0] hover:border-red-500/30 hover:text-red-400 transition-colors"
              style={{ background: '#2f2f2f' }}
            >
              Logout
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="shimmer rounded-2xl w-20 h-20 mb-4" />
            <p className="text-[#8e8ea0] text-sm">Loading analytics…</p>
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
            <p>⚠️ {error}</p>
            <button onClick={load} className="text-xs px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data.overview && (
          <>
            {/* Quick stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Students" value={data.overview.total_students ?? 0} icon="👥" />
              <StatCard label="Total Interactions" value={data.overview.total_interactions ?? 0} icon="💬" />
              <StatCard label="Quiz Attempts" value={data.overview.total_quiz_attempts ?? 0} icon="📝" />
              <StatCard label="Quiz Accuracy" value={`${data.overview.average_quiz_accuracy ?? 0}%`} icon="🎯" />
            </div>

            {/* Language Distribution */}
            {data.languages?.distribution?.length > 0 && (
              <div className={`${cardCls} mb-4`} style={cardStyle}>
                <h2 className="text-sm font-semibold text-[#ececec] mb-4 uppercase tracking-wider">Language Distribution</h2>
                <div className="space-y-3">
                  {data.languages.distribution.map((l) => (
                    <div key={l.language} className="flex items-center gap-3">
                      <span className="text-sm text-[#8e8ea0] w-32 truncate" title={getLanguageName(l.language)}>
                        {getLanguageName(l.language)}
                      </span>
                      <div className="flex-1 bg-white/[0.06] rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-white/60 transition-all"
                          style={{ width: `${l.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#8e8ea0] w-20 text-right">{l.count} ({l.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics Performance */}
            {data.topics?.length > 0 && (
              <div className={`${cardCls} mb-6`} style={cardStyle}>
                <h2 className="text-sm font-semibold text-[#ececec] mb-4 uppercase tracking-wider">Topic Mastery</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#8e8ea0] border-b border-white/[0.06]">
                        <th className="pb-3 font-medium">Topic</th>
                        <th className="pb-3 font-medium text-right">Avg Accuracy</th>
                        <th className="pb-3 font-medium text-right">Attempts</th>
                        <th className="pb-3 font-medium text-right">Students</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topics.map((t) => (
                        <tr key={t.topic} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="py-3 text-[#ececec] font-medium">{t.topic}</td>
                          <td className="py-3 text-right">
                            <span className={t.avg_accuracy >= 70 ? 'text-green-400' : t.avg_accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                              {t.avg_accuracy}%
                            </span>
                          </td>
                          <td className="py-3 text-[#8e8ea0] text-right">{t.total_attempts}</td>
                          <td className="py-3 text-[#8e8ea0] text-right">{t.student_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Student Performance */}
            {data.students?.length > 0 && (
              <div className={`${cardCls} mb-4`} style={cardStyle}>
                <h2 className="text-sm font-semibold text-[#ececec] mb-4 uppercase tracking-wider">Student Performance</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#8e8ea0] border-b border-white/[0.06]">
                        <th className="pb-3 font-medium">Student</th>
                        <th className="pb-3 font-medium">Language</th>
                        <th className="pb-3 font-medium">Difficulty</th>
                        <th className="pb-3 font-medium text-right">Accuracy</th>
                        <th className="pb-3 font-medium text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {data.students.map((s) => (
                        <StudentRow 
                          key={s.id} 
                          student={s} 
                          isExpanded={expandedStudentId === s.id}
                          weakTopics={studentDetails[s.id]}
                          isUpdating={updatingId === s.id}
                          onToggleExpand={async () => {
                            if (expandedStudentId === s.id) {
                              setExpandedStudentId(null);
                            } else {
                              setExpandedStudentId(s.id);
                              if (!studentDetails[s.id]) {
                                try {
                                  const weak = await analytics.weakTopics(s.id);
                                  setStudentDetails(prev => ({ ...prev, [s.id]: weak }));
                                } catch (e) {
                                  console.error("Failed to load weak topics", e);
                                }
                              }
                            }
                          }}
                          onDelete={async (e) => {
                            if (e) {
                              e.stopPropagation();
                              e.preventDefault();
                            }
                            console.log("Opening delete confirmation for:", s.name);
                            setConfirmModal({ show: true, studentId: s.id, studentName: s.name });
                          }}
                          onLanguageChange={async (newLang) => {
                            setUpdatingId(s.id);
                            try {
                              await updateStudent(s.id, { preferred_language: newLang });
                              load();
                            } catch (e) {
                              alert("Failed to update language: " + e.message);
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Back to home */}
            <div className="text-center mt-8">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-[#8e8ea0] hover:text-[#ececec] transition-colors"
              >
                ← Back to Student Select
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <ConfirmModal
          title="Delete Student"
          message={`Are you sure you want to delete ${confirmModal.studentName}? This action cannot be undone.`}
          onConfirm={async () => {
            const id = confirmModal.studentId;
            setConfirmModal({ show: false, studentId: null, studentName: "" });
            setUpdatingId(id);
            try {
              console.log("Calling deleteStudent API for ID:", id);
              await deleteStudent(id);
              console.log("Delete successful, refreshing list...");
              load();
            } catch (e) {
              console.error("Deletion failed:", e);
              alert("Failed to delete student: " + e.message);
            } finally {
              setUpdatingId(null);
            }
          }}
          onCancel={() => setConfirmModal({ show: false, studentId: null, studentName: "" })}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-white/[0.08] p-4 flex items-center gap-3 transition-transform hover:scale-[1.02]" style={{ background: '#2f2f2f' }}>
      <span className="text-2xl">{icon}</span>
      <div>
        <span className="text-xl font-bold text-white block">{value}</span>
        <span className="text-xs text-[#8e8ea0] uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

function StudentRow({ student, isExpanded, weakTopics, isUpdating, onToggleExpand, onDelete, onLanguageChange }) {
  return (
    <>
      <tr className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${isExpanded ? 'bg-white/[0.03]' : ''}`}>
        <td className="py-4 font-medium text-[#ececec]">
          <span className="px-2">
            {student.name}
          </span>
        </td>
        <td className="py-4">
          <select
            value={student.preferred_language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isUpdating}
            className="bg-transparent text-[#ececec] border border-white/[0.08] rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-white/20 outline-none cursor-pointer hover:border-white/20 transition-all"
          >
            <option value="auto" className="bg-[#2f2f2f]">Auto Detect</option>
            {Object.entries(LANG_NAMES).map(([code, name]) => (
              <option key={code} value={code} className="bg-[#2f2f2f]">{name}</option>
            ))}
          </select>
        </td>
        <td className="py-4">
          <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] text-[#b4b4b4] border border-white/[0.04]">
            Level {student.difficulty || 1}
          </span>
        </td>
        <td className="py-4 text-right">
          <span className={`font-mono ${student.quiz_accuracy >= 70 ? 'text-green-400' : student.quiz_accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {student.quiz_accuracy}%
          </span>
        </td>
        <td className="py-4 text-right pr-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onToggleExpand}
              className="text-xs px-2 py-1 rounded-lg border border-white/[0.08] text-[#8e8ea0] hover:text-white hover:border-white/20 transition-all"
            >
              {isExpanded ? 'Close' : 'Details'}
            </button>
            <button
              onClick={(e) => {
                console.log("Button internal onClick fired");
                onDelete(e);
              }}
              disabled={isUpdating}
              className="text-xs px-2 py-1 rounded-lg border border-red-500/20 text-red-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-50"
              title="Delete Student"
            >
              {isUpdating ? '...' : 'Delete'}
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-white/[0.01]">
          <td colSpan="5" className="p-0">
            <div className="px-10 py-6 border-b border-white/[0.04] animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-semibold text-[#8e8ea0] uppercase tracking-widest mb-4">Activity Summary</h3>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-2xl font-bold text-white block">{student.total_interactions}</span>
                      <span className="text-[10px] text-[#565869] uppercase tracking-wider">Interactions</span>
                    </div>
                    <div className="w-px h-10 bg-white/[0.08]" />
                    <div>
                      <span className="text-2xl font-bold text-white block">{student.total_quizzes}</span>
                      <span className="text-[10px] text-[#565869] uppercase tracking-wider">Quizzes</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-semibold text-[#8e8ea0] uppercase tracking-widest mb-4">Weak Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {!weakTopics ? (
                      <div className="flex items-center gap-2 text-[#565869]">
                        <div className="w-3 h-3 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                        <span className="text-xs italic">Analyzing performance...</span>
                      </div>
                    ) : weakTopics.length === 0 ? (
                      <span className="text-xs text-green-400/60 bg-green-400/5 px-2 py-1 rounded-lg border border-green-400/10">
                        ✨ No significant weaknesses detected!
                      </span>
                    ) : (
                      weakTopics.map(t => (
                        <span key={t.topic} className="text-xs px-3 py-1 rounded-lg bg-red-500/5 text-red-400 border border-red-500/10">
                          {t.topic}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#2f2f2f] border border-white/[0.08] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-[#8e8ea0] mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl bg-white/[0.04] text-[#ececec] hover:bg-white/[0.08] transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
