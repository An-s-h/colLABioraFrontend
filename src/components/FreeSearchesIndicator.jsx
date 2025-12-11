"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, LogIn, ArrowRight, Loader2 } from "lucide-react";
import apiFetch from "../utils/api.js";

const FREE_SEARCHES_TOTAL = 6;
const FREE_SEARCHES_POPUP_KEY = "free_searches_popup_shown";
const FREE_SEARCHES_CACHE_KEY = "free_searches_cache";
const CACHE_TTL = 30000; // 30 seconds cache

// Helper to get cached searches
function getCachedSearches() {
  try {
    const cached = localStorage.getItem(FREE_SEARCHES_CACHE_KEY);
    if (!cached) return null;
    const { value, timestamp } = JSON.parse(cached);
    const now = Date.now();
    if (now - timestamp < CACHE_TTL) {
      return value;
    }
    localStorage.removeItem(FREE_SEARCHES_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

// Helper to cache searches
function setCachedSearches(value) {
  try {
    localStorage.setItem(
      FREE_SEARCHES_CACHE_KEY,
      JSON.stringify({ value, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

export default function FreeSearchesIndicator({ user, onSearch }) {
  const navigate = useNavigate();
  // Initialize with cached value for instant display
  const cachedValue = getCachedSearches();
  const [freeSearches, setFreeSearches] = useState(
    cachedValue !== null ? cachedValue : FREE_SEARCHES_TOTAL
  );
  const [loadingSearches, setLoadingSearches] = useState(cachedValue === null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (user) {
      setShowPopup(false);
      return;
    }

    // Load free searches from server with caching
    const updateFreeSearches = async (forceRefresh = false) => {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = getCachedSearches();
        if (cached !== null) {
          setFreeSearches(cached);
          setLoadingSearches(false);
          // Still fetch in background to update cache
          updateFreeSearches(true);
          return;
        }
      }

      setLoadingSearches(true);
      try {
        const response = await apiFetch("/api/search/remaining");
        if (response && response.ok) {
          const data = await response.json();
          const newValue = data.unlimited
            ? null
            : data.remaining ?? FREE_SEARCHES_TOTAL;
          setFreeSearches(newValue);
          setCachedSearches(newValue);
        } else {
          // Fallback to cached or default if API fails
          const cached = getCachedSearches();
          setFreeSearches(cached !== null ? cached : FREE_SEARCHES_TOTAL);
        }
      } catch (error) {
        console.error("Error fetching remaining searches:", error);
        // Use cached value on error
        const cached = getCachedSearches();
        setFreeSearches(cached !== null ? cached : FREE_SEARCHES_TOTAL);
      } finally {
        setLoadingSearches(false);
      }
    };

    updateFreeSearches();

    // Check if popup has been shown before
    const popupShown = localStorage.getItem(FREE_SEARCHES_POPUP_KEY);
    if (!popupShown) {
      // Show popup on first visit
      setShowPopup(true);
      localStorage.setItem(FREE_SEARCHES_POPUP_KEY, "true");
    }

    // Listen for custom event for same-tab updates
    window.addEventListener("freeSearchUsed", updateFreeSearches);

    return () => {
      window.removeEventListener("freeSearchUsed", updateFreeSearches);
    };
  }, [user]);

  // Listen for login events
  useEffect(() => {
    const handleLogin = () => {
      setShowPopup(false);
    };

    window.addEventListener("login", handleLogin);
    return () => window.removeEventListener("login", handleLogin);
  }, []);

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  if (user) {
    return null; // Don't show for signed-in users
  }

  return (
    <>
      {/* Persistent Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-24 right-4 z-40 sm:right-6"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(245, 242, 248, 0.95)",
            borderColor: "#D0C4E2",
          }}
        >
          {loadingSearches ? (
            <>
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "#2F3C96" }}
              />
              <span
                className="text-sm font-semibold"
                style={{ color: "#2F3C96" }}
              >
                Loading...
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" style={{ color: "#2F3C96" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: "#2F3C96" }}
              >
                {freeSearches !== null ? (
                  <>
                    {freeSearches} free search{freeSearches !== 1 ? "es" : ""}{" "}
                    left
                  </>
                ) : (
                  "Unlimited searches"
                )}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Popup Modal */}
      <AnimatePresence>
        {showPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePopup}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div
                className="rounded-2xl p-6 border-2 shadow-2xl"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#D0C4E2",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#F5F2F8" }}
                    >
                      <Sparkles
                        className="w-5 h-5"
                        style={{ color: "#2F3C96" }}
                      />
                    </div>
                    <div>
                      <h3
                        className="text-xl font-bold"
                        style={{ color: "#2F3C96" }}
                      >
                        Start Exploring for Free!
                      </h3>
                      <p className="text-sm mt-1" style={{ color: "#787878" }}>
                        {loadingSearches ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading...
                          </span>
                        ) : freeSearches !== null ? (
                          <>You have {freeSearches} free searches</>
                        ) : (
                          "Unlimited searches"
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClosePopup}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: "#787878" }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p
                  className="text-sm mb-4 leading-relaxed"
                  style={{ color: "#787878" }}
                >
                  Search through clinical trials, research publications, and
                  medical experts. No sign-up required!
                </p>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClosePopup}
                    className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm border-2 transition-all"
                    style={{
                      backgroundColor: "#F5F2F8",
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                  >
                    Start Exploring
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleClosePopup();
                      navigate("/signin");
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all"
                    style={{
                      background: `linear-gradient(to right, #2F3C96, #474F97)`,
                    }}
                  >
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Export function to check and get remaining free searches
export function useFreeSearches() {
  const [freeSearches, setFreeSearches] = useState(FREE_SEARCHES_TOTAL);

  useEffect(() => {
    const updateFreeSearches = async () => {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      // Signed-in users have unlimited searches
      if (user && token) {
        setFreeSearches(null);
        return;
      }

      try {
        const response = await apiFetch("/api/search/remaining");
        if (response && response.ok) {
          const data = await response.json();
          if (data.unlimited) {
            setFreeSearches(null);
          } else {
            setFreeSearches(data.remaining ?? FREE_SEARCHES_TOTAL);
          }
        } else {
          setFreeSearches(FREE_SEARCHES_TOTAL);
        }
      } catch (error) {
        console.error("Error fetching remaining searches:", error);
        setFreeSearches(FREE_SEARCHES_TOTAL);
      }
    };

    updateFreeSearches();

    // Listen for updates
    window.addEventListener("freeSearchUsed", updateFreeSearches);
    return () => {
      window.removeEventListener("freeSearchUsed", updateFreeSearches);
    };
  }, []);

  const checkAndUseSearch = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Signed-in users can search freely
    if (user && token) {
      return true;
    }

    // Check remaining searches from server
    try {
      const response = await apiFetch("/api/search/remaining");
      if (response && response.ok) {
        const data = await response.json();
        if (data.unlimited) {
          return true;
        }
        const remaining = data.remaining ?? 0;
        if (remaining <= 0) {
          return false;
        }
        // The actual decrement happens on the server when the search is performed
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking search limit:", error);
      return false;
    }
  };

  const getRemainingSearches = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Signed-in users have unlimited searches
    if (user && token) {
      return null;
    }

    try {
      const response = await apiFetch("/api/search/remaining");
      if (response && response.ok) {
        const data = await response.json();
        return data.unlimited ? null : data.remaining ?? FREE_SEARCHES_TOTAL;
      }
      return FREE_SEARCHES_TOTAL;
    } catch (error) {
      console.error("Error getting remaining searches:", error);
      return FREE_SEARCHES_TOTAL;
    }
  };

  return { freeSearches, checkAndUseSearch, getRemainingSearches };
}
