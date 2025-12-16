import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";

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
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div
            className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-5 sm:p-6 space-y-4 transition-all duration-300"
            style={{
              borderColor: "#D0C4E2",
              boxShadow: "0 20px 60px rgba(47, 60, 150, 0.15)",
            }}
          >
            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "#2F3C96" }}
              >
                Sign In
              </h1>
              <p className="text-xs font-medium" style={{ color: "#787878" }}>
                Resume your session
              </p>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: "#2F3C96" }}
                >
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
                  className="w-full py-2 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: "#E8E8E8",
                    color: "#2F3C96",
                    backgroundColor: "#FFFFFF",
                    "--tw-ring-color": "#D0C4E2",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: "#2F3C96" }}
                >
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
                  className="w-full py-2 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: "#E8E8E8",
                    color: "#2F3C96",
                    backgroundColor: "#FFFFFF",
                    "--tw-ring-color": "#D0C4E2",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: "#2F3C96" }}
                >
                  I am a
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRole("patient")}
                    className="flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                      backgroundColor:
                        role === "patient" ? "#2F3C96" : "#F5F5F5",
                      color: role === "patient" ? "#FFFFFF" : "#787878",
                      border:
                        role === "patient" ? "none" : "1.5px solid #E8E8E8",
                    }}
                  >
                    Patient
                  </button>
                  <button
                    onClick={() => setRole("researcher")}
                    className="flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                      backgroundColor:
                        role === "researcher" ? "#2F3C96" : "#F5F5F5",
                      color: role === "researcher" ? "#FFFFFF" : "#787878",
                      border:
                        role === "researcher" ? "none" : "1.5px solid #E8E8E8",
                    }}
                  >
                    Researcher
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="text-xs py-1.5 px-3 rounded-lg border"
                  style={{
                    color: "#DC2626",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                  }}
                >
                  {error}
                </div>
              )}

              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full rounded-lg py-2 font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  backgroundColor: "#2F3C96",
                  color: "#FFFFFF",
                }}
              >
                {loading ? "Signing in..." : "Sign In →"}
              </Button>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-center text-xs" style={{ color: "#787878" }}>
                Don't have an account?
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => navigate("/onboard/patient")}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(47, 60, 150, 0.05)",
                    borderColor: "#D0C4E2",
                  }}
                  whileTap={{ scale: 0.99 }}
                  className="flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all border"
                  style={{
                    backgroundColor: "#F5F5F5",
                    color: "#2F3C96",
                    borderColor: "#E8E8E8",
                  }}
                >
                  Sign up as Patient
                </motion.button>
                <motion.button
                  onClick={() => navigate("/onboard/researcher")}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(47, 60, 150, 0.05)",
                    borderColor: "#D0C4E2",
                  }}
                  whileTap={{ scale: 0.99 }}
                  className="flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all border"
                  style={{
                    backgroundColor: "#F5F5F5",
                    color: "#2F3C96",
                    borderColor: "#E8E8E8",
                  }}
                >
                  Sign up as Researcher
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
