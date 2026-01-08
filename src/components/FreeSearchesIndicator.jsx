"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, LogIn, ArrowRight, Loader2 } from "lucide-react";
import {
  getLocalRemainingSearches,
  syncWithBackend,
  shouldSyncWithBackend,
  resetLocalSearchCount,
  setLocalSearchCount,
  MAX_FREE_SEARCHES,
} from "../utils/searchLimit.js";
import apiFetch from "../utils/api.js";

const FREE_SEARCHES_POPUP_KEY = "free_searches_popup_shown";

export default function FreeSearchesIndicator({ user, onSearch, centered = false }) {
  const navigate = useNavigate();
  // Initialize with local storage value for instant display
  const localRemaining = getLocalRemainingSearches();
  const [freeSearches, setFreeSearches] = useState(localRemaining);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (user) {
      // User is signed in - reset local count and hide indicator
      resetLocalSearchCount();
      setShowPopup(false);
      setFreeSearches(null);
      return;
    }

    // Update from local storage immediately
    const updateFromLocal = () => {
      const remaining = getLocalRemainingSearches();
      setFreeSearches(remaining);
    };

    // Fetch remaining searches directly from API (same as Explore page)
    const fetchRemainingSearches = async (forceRefresh = false) => {
      // Check if we should skip fetch (unless forcing)
      if (!forceRefresh && !shouldSyncWithBackend()) {
        updateFromLocal();
        return;
      }

      setLoadingSearches(true);
      try {
        const response = await apiFetch("/api/search/remaining");
        if (response && response.ok) {
          const data = await response.json();
          const newValue = data.unlimited
            ? null
            : data.remaining ?? MAX_FREE_SEARCHES;
          setFreeSearches(newValue);

          // Update local storage to match backend
          if (!data.unlimited && data.remaining !== undefined) {
            const backendCount = MAX_FREE_SEARCHES - data.remaining;
            setLocalSearchCount(backendCount);
          }
        } else {
          // Fallback to local storage value if API fails
          updateFromLocal();
        }
      } catch (error) {
        console.error("Error fetching remaining searches:", error);
        // Use local storage value on error
        updateFromLocal();
      } finally {
        setLoadingSearches(false);
      }
    };

    // Initial fetch
    fetchRemainingSearches(true);

    // Check if popup has been shown before
    const popupShown = localStorage.getItem(FREE_SEARCHES_POPUP_KEY);
    if (!popupShown) {
      // Show popup on first visit
      setShowPopup(true);
      localStorage.setItem(FREE_SEARCHES_POPUP_KEY, "true");
    }

    // Listen for custom event for same-tab updates
    const handleFreeSearchUsed = (event) => {
      // If event has detail with remaining count, use it directly (immediate update)
      if (event.detail && event.detail.remaining !== undefined) {
        // Update immediately with the value from backend response
        setFreeSearches(event.detail.remaining);
        // Update local storage to match backend
        const backendCount = MAX_FREE_SEARCHES - event.detail.remaining;
        setLocalSearchCount(backendCount);
        // Verify with API after a brief delay (backend should already be updated)
        setTimeout(() => {
          fetchRemainingSearches(true);
        }, 300);
      } else {
        // Update from local storage immediately
        updateFromLocal();
        // Fetch from API immediately to get latest from backend
        fetchRemainingSearches(true);
      }
    };

    window.addEventListener("freeSearchUsed", handleFreeSearchUsed);

    // Periodic fetch from API (every 5 seconds)
    const syncInterval = setInterval(() => {
      fetchRemainingSearches();
    }, 5000);

    return () => {
      window.removeEventListener("freeSearchUsed", handleFreeSearchUsed);
      clearInterval(syncInterval);
    };
  }, [user]);

  // Listen for login events
  useEffect(() => {
    const handleLogin = () => {
      setShowPopup(false);
      // Refresh remaining searches after login
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      if (userData && token) {
        resetLocalSearchCount();
        setFreeSearches(null);
        setLoadingSearches(false);
      } else {
        // Re-fetch remaining searches if user logged out
        setLoadingSearches(true);
        apiFetch("/api/search/remaining")
          .then((response) => {
            if (response && response.ok) {
              return response.json();
            }
            return null;
          })
          .then((data) => {
            if (data) {
              const newValue = data.unlimited
                ? null
                : data.remaining ?? MAX_FREE_SEARCHES;
              setFreeSearches(newValue);
              if (!data.unlimited && data.remaining !== undefined) {
                const backendCount = MAX_FREE_SEARCHES - data.remaining;
                setLocalSearchCount(backendCount);
              }
            }
          })
          .catch((error) => {
            console.error("Error fetching remaining searches:", error);
          })
          .finally(() => {
            setLoadingSearches(false);
          });
      }
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
        className={centered ? "relative z-40" : "fixed top-24 right-4 z-40 sm:right-6"}
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
  const [freeSearches, setFreeSearches] = useState(getLocalRemainingSearches());

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Signed-in users have unlimited searches
    if (user && token) {
      resetLocalSearchCount();
      setFreeSearches(null);
      return;
    }

    const updateFreeSearches = async (event) => {
      // If event has detail with remaining count, use it directly
      if (event && event.detail && event.detail.remaining !== undefined) {
        setFreeSearches(event.detail.remaining);
        return;
      }

      // Update from local storage immediately
      const localRemaining = getLocalRemainingSearches();
      setFreeSearches(localRemaining);

      // Sync with backend if needed
      if (shouldSyncWithBackend()) {
        try {
          const result = await syncWithBackend();
          if (result.unlimited) {
            setFreeSearches(null);
          } else {
            setFreeSearches(result.remaining);
          }
        } catch (error) {
          console.error("Error syncing with backend:", error);
          // Keep local value on error
        }
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

    // Check local storage first for immediate feedback
    const localRemaining = getLocalRemainingSearches();
    if (localRemaining <= 0) {
      return false;
    }

    // Also check with backend (backend is source of truth)
    try {
      const result = await syncWithBackend();
      if (result.unlimited) {
        return true;
      }
      return result.remaining > 0;
    } catch (error) {
      console.error("Error checking search limit:", error);
      // If backend check fails, use local storage value
      return localRemaining > 0;
    }
  };

  const getRemainingSearches = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Signed-in users have unlimited searches
    if (user && token) {
      return null;
    }

    // Return local value immediately, sync in background
    const localRemaining = getLocalRemainingSearches();

    // Sync with backend if needed
    if (shouldSyncWithBackend()) {
      syncWithBackend().catch(console.error);
    }

    return localRemaining;
  };

  return { freeSearches, checkAndUseSearch, getRemainingSearches };
}
