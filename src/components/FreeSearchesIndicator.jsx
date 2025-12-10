"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, LogIn, ArrowRight } from "lucide-react";

const FREE_SEARCHES_KEY = "free_searches_remaining";
const FREE_SEARCHES_TOTAL = 6;
const FREE_SEARCHES_POPUP_KEY = "free_searches_popup_shown";

export default function FreeSearchesIndicator({ user, onSearch }) {
  const navigate = useNavigate();
  const [freeSearches, setFreeSearches] = useState(FREE_SEARCHES_TOTAL);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (user) {
      setShowPopup(false);
      return;
    }

    // Load free searches from localStorage
    const updateFreeSearches = () => {
      const savedSearches = localStorage.getItem(FREE_SEARCHES_KEY);
      if (savedSearches !== null) {
        setFreeSearches(parseInt(savedSearches, 10));
      } else {
        setFreeSearches(FREE_SEARCHES_TOTAL);
        localStorage.setItem(FREE_SEARCHES_KEY, FREE_SEARCHES_TOTAL.toString());
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

    // Listen for storage changes to update free searches count
    const handleStorageChange = (e) => {
      if (e.key === FREE_SEARCHES_KEY) {
        updateFreeSearches();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener("freeSearchUsed", updateFreeSearches);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
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
          <Sparkles className="w-4 h-4" style={{ color: "#2F3C96" }} />
          <span className="text-sm font-semibold" style={{ color: "#2F3C96" }}>
            {freeSearches} free search{freeSearches !== 1 ? "es" : ""} left
          </span>
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
                        You have {freeSearches} free searches
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

// Export function to check and decrement free searches
export function useFreeSearches() {
  const [freeSearches, setFreeSearches] = useState(FREE_SEARCHES_TOTAL);

  useEffect(() => {
    const savedSearches = localStorage.getItem(FREE_SEARCHES_KEY);
    if (savedSearches !== null) {
      setFreeSearches(parseInt(savedSearches, 10));
    } else {
      setFreeSearches(FREE_SEARCHES_TOTAL);
      localStorage.setItem(FREE_SEARCHES_KEY, FREE_SEARCHES_TOTAL.toString());
    }
  }, []);

  const checkAndUseSearch = () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    if (user && token) {
      return true; // Signed-in users can search freely
    }

    const savedSearches = localStorage.getItem(FREE_SEARCHES_KEY);
    const currentSearches = savedSearches
      ? parseInt(savedSearches, 10)
      : FREE_SEARCHES_TOTAL;

    if (currentSearches <= 0) {
      return false;
    }

    const newCount = currentSearches - 1;
    setFreeSearches(newCount);
    localStorage.setItem(FREE_SEARCHES_KEY, newCount.toString());
    // Dispatch custom event to update indicator
    window.dispatchEvent(new Event("freeSearchUsed"));
    return true;
  };

  const getRemainingSearches = () => {
    const savedSearches = localStorage.getItem(FREE_SEARCHES_KEY);
    return savedSearches ? parseInt(savedSearches, 10) : FREE_SEARCHES_TOTAL;
  };

  return { freeSearches, checkAndUseSearch, getRemainingSearches };
}



