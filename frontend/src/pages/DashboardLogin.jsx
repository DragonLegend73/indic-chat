/**
 * DashboardLogin.jsx
 * Login page for the analytics dashboard (teacher / admin access).
 * Stores JWT in sessionStorage after successful auth.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, setAuthToken } from "../api/client";

export default function DashboardLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
      setError("Please enter the teacher password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { access_token } = await auth.login(password);
      setAuthToken(access_token);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message ?? "Login failed. Check your password.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#212121' }}>
      <div className="rounded-xl border border-white/[0.08] p-8 w-full max-w-md" style={{ background: '#2f2f2f' }}>
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">📊</span>
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard Login</h1>
          <p className="text-sm text-[#8e8ea0]">Teacher / Admin access only</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#8e8ea0] mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              placeholder="••••••••"
              disabled={loading}
              className="w-full rounded-xl px-4 py-3 text-[#ececec] placeholder:text-[#8e8ea0] focus:outline-none transition-colors disabled:opacity-50 border border-white/[0.08] focus:border-white/25"
              style={{ background: '#3a3a3a' }}
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 disabled:opacity-30 rounded-xl py-3 font-semibold transition-all text-[#212121] text-sm"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-[#8e8ea0] hover:text-[#ececec] transition-colors"
          >
            ← Back to student login
          </button>
        </div>
      </div>
    </div>
  );
}
