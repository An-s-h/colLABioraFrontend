import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);
    setError("");
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed");
        setLoading(false);
        return;
      }

      // Store JWT token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Dispatch login event to update navbar
      window.dispatchEvent(new Event("login"));

      // Redirect to dashboard
      navigate(`/dashboard/${role}`);
    } catch (e) {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="relative min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        {/* Animated Background */}
     
        
        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div className="w-full max-w-md bg-white/20 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(99,102,241,0.2)] border border-indigo-100 p-6 sm:p-7 space-y-6 transition-all duration-300">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-indigo-700 tracking-tight">
                Sign In
              </h1>
              <p className="text-xs text-indigo-600 font-medium">
                Resume your session
              </p>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
                  className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
                  className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  I am a
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRole("patient")}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md ${
                      role === "patient"
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    }`}
                  >
                    Patient
                  </button>
                  <button
                    onClick={() => setRole("researcher")}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md ${
                      role === "researcher"
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    }`}
                  >
                    Researcher
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 py-1.5 px-3 bg-red-50 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg py-2.5 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Signing in..." : "Sign In →"}
              </Button>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-center text-xs text-indigo-600">
                Don't have an account?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/onboard/patient")}
                  className="flex-1 py-2 px-3 rounded-lg font-semibold text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all shadow-sm hover:shadow-md"
                >
                  Sign up as Patient
                </button>
                <button
                  onClick={() => navigate("/onboard/researcher")}
                  className="flex-1 py-2 px-3 rounded-lg font-semibold text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all shadow-sm hover:shadow-md"
                >
                  Sign up as Researcher
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
