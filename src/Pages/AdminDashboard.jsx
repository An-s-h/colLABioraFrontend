import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import toast from "react-hot-toast";
import {
  Shield,
  CheckCircle,
  XCircle,
  Mail,
  MapPin,
  User,
  Loader2,
  LogOut,
  Award,
  Briefcase,
  Search,
  RefreshCw,
  Database,
  Globe,
  BarChart3,
} from "lucide-react";

export default function AdminDashboard() {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [searchStats, setSearchStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resetting, setResetting] = useState({
    deviceTokens: false,
    ipLimits: false,
    all: false,
    cleanup: false,
  });
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      // No admin token - redirect to home page
      toast.error("Access denied. Admin access required.");
      navigate("/");
      return;
    }

    // Verify admin token by fetching experts
    fetchExperts();
    fetchSearchStats();
  }, [navigate]);

  const fetchExperts = async () => {
    try {
      const adminToken = localStorage.getItem("adminToken");

      // If no admin token, redirect to home
      if (!adminToken) {
        toast.error("Access denied. Admin access required.");
        navigate("/");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${base}/api/admin/experts?token=${adminToken}`
      );

      if (response.status === 401) {
        // Invalid or expired admin token - redirect to home page
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch experts");
      }

      const data = await response.json();
      setExperts(data.experts || []);
    } catch (error) {
      console.error("Error fetching experts:", error);
      // On error, check if it's an auth error and redirect
      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }
      toast.error("Failed to load experts");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToggle = async (userId, currentStatus) => {
    setUpdating({ ...updating, [userId]: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const newStatus = !currentStatus;

      const response = await fetch(
        `${base}/api/admin/experts/${userId}/verify`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ isVerified: newStatus }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update verification status");
      }

      // Update local state
      setExperts((prev) =>
        prev.map((expert) =>
          expert.userId === userId
            ? { ...expert, isVerified: newStatus }
            : expert
        )
      );

      toast.success(
        `Expert ${newStatus ? "verified" : "unverified"} successfully`
      );
    } catch (error) {
      console.error("Error updating verification:", error);
      toast.error("Failed to update verification status");
    } finally {
      setUpdating({ ...updating, [userId]: false });
    }
  };

  const fetchSearchStats = async () => {
    setLoadingStats(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) return;

      const response = await fetch(`${base}/api/admin/search/config`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch search stats");
      }

      const data = await response.json();
      setSearchStats(data);
    } catch (error) {
      console.error("Error fetching search stats:", error);
      toast.error("Failed to load search statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleResetDeviceTokens = async () => {
    if (
      !confirm("Are you sure you want to reset all device token search counts?")
    ) {
      return;
    }

    setResetting({ ...resetting, deviceTokens: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(
        `${base}/api/admin/search/reset-device-tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to reset device tokens");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error resetting device tokens:", error);
      toast.error("Failed to reset device tokens");
    } finally {
      setResetting({ ...resetting, deviceTokens: false });
    }
  };

  const handleResetIPLimits = async () => {
    if (
      !confirm("Are you sure you want to reset all IP limit search counts?")
    ) {
      return;
    }

    setResetting({ ...resetting, ipLimits: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(`${base}/api/admin/search/reset-ip-limits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to reset IP limits");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error resetting IP limits:", error);
      toast.error("Failed to reset IP limits");
    } finally {
      setResetting({ ...resetting, ipLimits: false });
    }
  };

  const handleResetAll = async () => {
    if (
      !confirm(
        "Are you sure you want to reset ALL search limits (device tokens + IPs)?"
      )
    ) {
      return;
    }

    setResetting({ ...resetting, all: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(`${base}/api/admin/search/reset-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to reset all limits");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error resetting all limits:", error);
      toast.error("Failed to reset all limits");
    } finally {
      setResetting({ ...resetting, all: false });
    }
  };

  const handleCleanupDeviceTokens = async () => {
    if (
      !confirm(
        "This will delete old unused device tokens (30+ days unused or 7+ days old and never used). Continue?"
      )
    ) {
      return;
    }

    setResetting({ ...resetting, cleanup: true });
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await fetch(
        `${base}/api/admin/search/cleanup-device-tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        toast.error("Access denied. Admin access required.");
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to cleanup device tokens");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchSearchStats(); // Refresh stats
    } catch (error) {
      console.error("Error cleaning up device tokens:", error);
      toast.error("Failed to cleanup device tokens");
    } finally {
      setResetting({ ...resetting, cleanup: false });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
    toast.success("Logged out successfully");
  };

  if (loading) {
    return (
      <Layout>
        <div className="relative min-h-screen">
          <AnimatedBackgroundDiff />
          <div className="flex justify-center items-center min-h-screen relative z-10">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        </div>
      </Layout>
    );
  }

  const verifiedCount = experts.filter((e) => e.isVerified).length;
  const unverifiedCount = experts.filter((e) => !e.isVerified).length;

  return (
    <Layout>
      <div className="relative min-h-screen">
        <AnimatedBackgroundDiff />
        <div className="container mx-auto px-4 py-8 relative z-10 pt-22 max-w-7xl">
          {/* Header */}
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-indigo-100 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-2xl font-bold text-indigo-700">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm text-indigo-600">
                    Manage Collabiora Experts Verification
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Total Experts
                  </span>
                </div>
                <p className="text-2xl font-bold text-indigo-700">
                  {experts.length}
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Verified
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {verifiedCount}
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Unverified
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {unverifiedCount}
                </p>
              </div>
            </div>
          </div>

          {/* Search Limit Management Section */}
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-indigo-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Search className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-indigo-700">
                  Search Limit Management
                </h2>
              </div>
              <Button
                onClick={fetchSearchStats}
                disabled={loadingStats}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-all disabled:opacity-50"
              >
                {loadingStats ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>

            {loadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : searchStats ? (
              <>
                {/* Configuration */}
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-indigo-100 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-700">
                      Configuration
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Max Free Searches
                      </p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {searchStats.maxFreeSearches}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Device Tokens
                      </p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {searchStats.statistics.deviceTokens.total}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">IP Limits</p>
                      <p className="text-2xl font-bold text-indigo-700">
                        {searchStats.statistics.ipLimits.total}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-indigo-100 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-700">Statistics</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          Device Token Searches
                        </span>
                      </div>
                      <p className="text-xl font-bold text-indigo-700">
                        {searchStats.statistics.deviceTokens.totalSearches}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Total searches across all device tokens
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          IP Limit Searches
                        </span>
                      </div>
                      <p className="text-xl font-bold text-purple-700">
                        {searchStats.statistics.ipLimits.totalSearches}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Total searches across all IP addresses
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reset Controls */}
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-700">
                      Reset Controls
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                      onClick={handleResetDeviceTokens}
                      disabled={resetting.deviceTokens}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetting.deviceTokens ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      Reset Device Tokens
                    </Button>
                    <Button
                      onClick={handleResetIPLimits}
                      disabled={resetting.ipLimits}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetting.ipLimits ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                      Reset IP Limits
                    </Button>
                    <Button
                      onClick={handleResetAll}
                      disabled={resetting.all}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetting.all ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Reset All
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    ⚠️ Resetting will set all search counts to 0. This action
                    cannot be undone.
                  </p>
                </div>

                {/* Cleanup Controls */}
                <div className="bg-yellow-50 backdrop-blur-sm rounded-lg p-4 border border-yellow-200 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-700">
                      Database Cleanup
                    </h3>
                  </div>
                  <div className="mb-3">
                    <Button
                      onClick={handleCleanupDeviceTokens}
                      disabled={resetting.cleanup}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resetting.cleanup ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      Cleanup Old Device Tokens
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">
                    🧹 Deletes device tokens that haven't been used in 30+ days
                    or were created 7+ days ago and never used. This helps
                    reduce database bloat. Tokens also auto-delete via TTL
                    indexes.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-600">
                Failed to load search statistics
              </div>
            )}
          </div>

          {/* Experts List */}
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-indigo-100 p-6">
            <h2 className="text-xl font-bold text-indigo-700 mb-4">
              All Collabiora Experts
            </h2>

            {experts.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No experts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {experts.map((expert) => (
                  <div
                    key={expert.userId}
                    className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-indigo-100 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {expert.name}
                          </h3>
                          {expert.isVerified ? (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                              <XCircle className="w-3 h-3" />
                              Unverified
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          {expert.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{expert.email}</span>
                            </div>
                          )}
                          {expert.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {expert.location.city
                                  ? `${expert.location.city}, ${expert.location.country}`
                                  : expert.location.country}
                              </span>
                            </div>
                          )}
                          {expert.specialties &&
                            expert.specialties.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                <span>{expert.specialties.join(", ")}</span>
                              </div>
                            )}
                          {expert.bio && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {expert.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          onClick={() =>
                            handleVerifyToggle(expert.userId, expert.isVerified)
                          }
                          disabled={updating[expert.userId]}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            expert.isVerified
                              ? "bg-orange-600 hover:bg-orange-700 text-white"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {updating[expert.userId] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : expert.isVerified ? (
                            "Unverify"
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
