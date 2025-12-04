import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import toast from "react-hot-toast";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }

    setLoading(true);
    setError("");
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${base}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Store admin token
      localStorage.setItem("adminToken", data.token);
      toast.success("Admin login successful");

      // Redirect to admin dashboard
      navigate("/admin/dashboard");
    } catch (e) {
      setError("Failed to login. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="relative min-h-screen">
        {/* Animated Background */}
        <AnimatedBackground />
        
        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div className="w-full max-w-md bg-white/20 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(99,102,241,0.2)] border border-indigo-100 p-6 sm:p-7 space-y-6 transition-all duration-300">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <Shield className="w-12 h-12 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-indigo-700 tracking-tight">
                Admin Login
              </h1>
              <p className="text-xs text-indigo-600 font-medium">
                Access admin dashboard
              </p>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                  {error}
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

