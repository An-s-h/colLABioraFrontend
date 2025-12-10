"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  LogIn,
  ArrowRight,
  Beaker,
  BookOpen,
  Users,
  Lock,
  CheckCircle2,
  Search,
  MapPin,
  Heart,
  Star,
  Zap,
  ChevronDown,
  X,
  Edit2,
  User,
  CheckCircle,
} from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import SmartSearchInput from "../components/SmartSearchInput";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

const FREE_SEARCHES_KEY = "free_searches_remaining";
const FREE_SEARCHES_TOTAL = 6;
const GUEST_INFO_KEY = "guest_user_info"; // Store guest condition/location

export default function Explore() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [freeSearches, setFreeSearches] = useState(FREE_SEARCHES_TOTAL);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("trials"); // "trials", "publications", "experts"
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isResearcher, setIsResearcher] = useState(false);
  const [guestCondition, setGuestCondition] = useState("");
  const [guestLocation, setGuestLocation] = useState("");
  const [hasShownModal, setHasShownModal] = useState(false);

  useEffect(() => {
    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");
    setUser(userData && token ? userData : null);

    // Load free searches from localStorage
    const savedSearches = localStorage.getItem(FREE_SEARCHES_KEY);
    if (savedSearches !== null) {
      setFreeSearches(parseInt(savedSearches, 10));
    } else {
      setFreeSearches(FREE_SEARCHES_TOTAL);
      localStorage.setItem(FREE_SEARCHES_KEY, FREE_SEARCHES_TOTAL.toString());
    }

    // Check if guest info already exists
    const guestInfo = localStorage.getItem(GUEST_INFO_KEY);
    if (guestInfo) {
      try {
        const parsed = JSON.parse(guestInfo);
        setGuestCondition(parsed.condition || "");
        setGuestLocation(parsed.location || "");
        setIsResearcher(parsed.isResearcher || false);
        setHasShownModal(true);
      } catch (e) {
        console.error("Error parsing guest info:", e);
      }
    }

    // Show modal for non-signed-in users who haven't provided info yet
    if (!userData && !token && !guestInfo && !hasShownModal) {
      // Small delay to let page render first
      setTimeout(() => {
        setShowInfoModal(true);
      }, 500);
    }

    // Check mobile view
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Listen for login events
  useEffect(() => {
    const handleLogin = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      setUser(userData && token ? userData : null);
      // Clear guest info when user signs in
      localStorage.removeItem(GUEST_INFO_KEY);
    };

    window.addEventListener("login", handleLogin);
    return () => window.removeEventListener("login", handleLogin);
  }, []);

  const handleSearch = (searchValue = null) => {
    // Use provided value or fallback to state
    const queryToSearch = (searchValue || searchQuery || "").trim();

    if (!queryToSearch) return;

    // For non-signed-in users without info, show modal first (if not already shown)
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");
    const isSignedIn = userData && token;

    if (!isSignedIn && !guestCondition && !hasShownModal) {
      setShowInfoModal(true);
      return;
    }

    // Update state if value was provided directly (from Enter key)
    if (searchValue && searchValue.trim() !== searchQuery) {
      setSearchQuery(searchValue.trim());
    }

    // Navigate to appropriate page with search query
    const params = new URLSearchParams();
    params.set("q", queryToSearch);

    // Add guest info if available
    if (!isSignedIn && guestCondition) {
      params.set("guestCondition", guestCondition);
    }
    if (!isSignedIn && guestLocation) {
      params.set("guestLocation", guestLocation);
    }

    if (searchCategory === "trials") {
      navigate(`/trials?${params.toString()}`);
    } else if (searchCategory === "publications") {
      navigate(`/publications?${params.toString()}`);
    } else if (searchCategory === "experts") {
      navigate(`/experts?${params.toString()}`);
    }
  };

  const handleSaveGuestInfo = () => {
    const guestInfo = {
      condition: guestCondition.trim(),
      location: guestLocation.trim(),
      isResearcher,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(guestInfo));
    setHasShownModal(true);
    setShowInfoModal(false);

    // Update the display immediately
    setGuestCondition(guestCondition.trim());
    setGuestLocation(guestLocation.trim());

    // Now proceed with search if there was a query
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  const handleSkipInfo = () => {
    setHasShownModal(true);
    setShowInfoModal(false);
    // Still proceed with search if there was a query
    if (searchQuery.trim()) {
      handleSearch();
    }
  };

  const handleEditGuestInfo = () => {
    setShowInfoModal(true);
  };

  const handleClearGuestInfo = () => {
    localStorage.removeItem(GUEST_INFO_KEY);
    setGuestCondition("");
    setGuestLocation("");
    setHasShownModal(false);
    setShowInfoModal(true);
  };

  const handleCategoryCardClick = (category, path) => {
    // Navigate directly to the category page
    navigate(path);
  };

  const benefits = [
    "Unlimited searches",
    "Personalized recommendations",
    "Save favorites",
    "Connect with experts",
    "Track your research",
    "Priority support",
  ];

  const suggestionTerms = [
    "cancer",
    "diabetes",
    "cardiology",
    "oncology",
    "neurology",
    "clinical trial",
    "research",
    "treatment",
    "therapy",
    "medicine",
  ];

  const categoryOptions = [
    {
      id: "trials",
      label: "Clinical Trials",
      icon: Beaker,
      color: "#2F3C96",
      path: "/trials",
      description: "Find active research studies",
    },
    {
      id: "publications",
      label: "Publications",
      icon: BookOpen,
      color: "#474F97",
      path: "/publications",
      description: "Browse research papers",
    },
    {
      id: "experts",
      label: "Experts",
      icon: Users,
      color: "#B8A5D5",
      path: "/experts",
      description: "Connect with researchers",
    },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Animated Background */}
      <AnimatedBackground isMobile={isMobile} />

      {/* Main Content */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16 overflow-hidden">
        <div className="max-w-4xl relative z-10 w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight"
              style={{ color: "#2F3C96" }}
            >
              Explore Healthcare Research
            </h1>
            <p
              className="text-base sm:text-lg mb-6"
              style={{ color: "#787878" }}
            >
              Search through clinical trials, research publications, and medical
              experts. No sign-up required to start!
            </p>
          </motion.div>

          {/* Free Searches Badge */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 shadow-md"
                style={{
                  backgroundColor: "#F5F2F8",
                  borderColor: "#D0C4E2",
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "#2F3C96" }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#2F3C96" }}
                >
                  {freeSearches} free search{freeSearches !== 1 ? "es" : ""}{" "}
                  remaining
                </span>
              </div>
            </motion.div>
          )}

          {/* Unified Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg border-2 p-5 sm:p-6 mb-6 relative overflow-hidden"
            style={{
              borderColor: "#D0C4E2",
            }}
          >
            {/* Subtle background gradient */}
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 blur-2xl pointer-events-none"
              style={{
                background: `linear-gradient(to bottom right, #2F3C96, #D0C4E2)`,
              }}
            ></div>

            <div className="relative">
              {/* Category Selector */}
              <div className="mb-4">
                <label
                  className="block text-xs font-semibold mb-2.5"
                  style={{ color: "#2F3C96" }}
                >
                  Search Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = searchCategory === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSearchCategory(option.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          isSelected
                            ? "text-white shadow-md scale-105"
                            : "hover:scale-105"
                        }`}
                        style={
                          isSelected
                            ? {
                                background: `linear-gradient(to right, ${option.color}, #474F97)`,
                              }
                            : {
                                backgroundColor: "#F5F5F5",
                                color: "#787878",
                                border: "1px solid #E8E8E8",
                              }
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Input */}
              <div>
                <label
                  className="block text-xs font-semibold mb-2.5"
                  style={{ color: "#2F3C96" }}
                >
                  Search Query
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search
                      className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 z-10"
                      style={{ color: "#787878" }}
                    />
                    <SmartSearchInput
                      value={searchQuery}
                      onChange={(value) => {
                        setSearchQuery(value);
                      }}
                      onSubmit={(value) => {
                        // Ensure we use the value passed from the input
                        handleSearch(value);
                      }}
                      placeholder={`Search ${
                        categoryOptions
                          .find((c) => c.id === searchCategory)
                          ?.label.toLowerCase() || "trials"
                      }...`}
                      extraTerms={suggestionTerms}
                      className="w-full"
                      inputClassName="pl-11 pr-4 py-3 text-sm border-2 focus:border-2"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="px-6 py-3 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2 min-w-[120px]"
                    style={{
                      backgroundColor: "#2F3C96",
                    }}
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* TODO: Re-implement guest user logic later */}
          {/* Guest Info Display - Under Search Bar */}
          {/* {!user && (guestCondition || guestLocation) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="mb-8"
            >
              <div
                className="rounded-xl p-4 sm:p-5 border-2 shadow-md"
                style={{
                  backgroundColor: "#F0F9FF",
                  borderColor: "#B8E6FF",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#FFFFFF" }}
                    >
                      <User className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    </div>
                    <div>
                      <h3
                        className="text-sm font-bold"
                        style={{ color: "#2F3C96" }}
                      >
                        Your Profile
                      </h3>
                      <p className="text-xs" style={{ color: "#787878" }}>
                        {isResearcher ? "Researcher" : "Patient"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEditGuestInfo}
                    className="p-2 rounded-lg hover:bg-white transition-colors"
                    style={{ color: "#2F3C96" }}
                    title="Edit profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {guestCondition && (
                    <div className="flex items-start gap-2">
                      <CheckCircle
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: "#10B981" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold mb-0.5"
                          style={{ color: "#787878" }}
                        >
                          {isResearcher ? "Research Area" : "Condition/Disease"}
                        </p>
                        <p
                          className="text-sm font-medium break-words"
                          style={{ color: "#2F3C96" }}
                        >
                          {guestCondition}
                        </p>
                      </div>
                    </div>
                  )}

                  {guestLocation && (
                    <div className="flex items-start gap-2">
                      <MapPin
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: "#10B981" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold mb-0.5"
                          style={{ color: "#787878" }}
                        >
                          Location
                        </p>
                        <p
                          className="text-sm font-medium break-words"
                          style={{ color: "#2F3C96" }}
                        >
                          {guestLocation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="mt-3 pt-3 border-t"
                  style={{ borderColor: "#B8E6FF" }}
                >
                  <p className="text-xs" style={{ color: "#787878" }}>
                    This information helps us provide you with personalized
                    search results.
                  </p>
                </div>
              </div>
            </motion.div>
          )} */}

          {/* Quick Access Cards */}

          {/* Sign In Encouragement - Enhanced */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="rounded-xl p-6 sm:p-8 border-2 relative overflow-hidden"
              style={{
                backgroundColor: "rgba(245, 242, 248, 0.95)",
                borderColor: "#D0C4E2",
              }}
            >
              {/* Decorative gradient overlay */}
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
                style={{
                  background: `linear-gradient(to bottom right, #2F3C96, #B8A5D5)`,
                }}
              ></div>

              <div className="relative flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#FFFFFF" }}
                    >
                      <Lock className="w-5 h-5" style={{ color: "#2F3C96" }} />
                    </div>
                    <h2
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: "#2F3C96" }}
                    >
                      Unlock Unlimited Access
                    </h2>
                  </div>
                  <p
                    className="text-sm sm:text-base mb-4"
                    style={{ color: "#787878" }}
                  >
                    Sign in to get personalized recommendations, save your
                    favorites, and connect with experts in your field.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <CheckCircle2
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#D0C4E2" }}
                        />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/signin")}
                      className="px-6 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all duration-300 shadow-md hover:shadow-lg"
                      style={{
                        background: `linear-gradient(to right, #2F3C96, #474F97)`,
                      }}
                    >
                      Sign In Now
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/onboard/patient")}
                      className="px-6 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 border-2"
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#2F3C96",
                        color: "#2F3C96",
                      }}
                    >
                      Create Account
                      <Star className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg relative"
                  style={{ backgroundColor: "#FFFFFF" }}
                >
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    FREE
                  </div>
                  <Lock
                    className="w-16 h-16 sm:w-20 sm:h-20"
                    style={{ color: "#D0C4E2" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Guest Info Modal */}
      <Modal
        isOpen={showInfoModal}
        onClose={() => {
          setShowInfoModal(false);
          setHasShownModal(true);
        }}
        title={
          isResearcher
            ? "Help Us Find Relevant Experts"
            : "Personalize Your Experience"
        }
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed" style={{ color: "#787878" }}>
            {isResearcher
              ? "Tell us about your research focus to connect you with relevant experts and resources."
              : "Help us provide you with more relevant results by sharing your area of interest."}
          </p>

          {/* User Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsResearcher(false)}
              className={`flex-1 px-3 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1.5 ${
                !isResearcher ? "" : ""
              }`}
              style={
                !isResearcher
                  ? {
                      borderColor: "#2F3C96",
                      backgroundColor: "rgba(245, 242, 248, 1)",
                      color: "#2F3C96",
                    }
                  : {
                      borderColor: "#E8E8E8",
                      backgroundColor: "#FFFFFF",
                      color: "#787878",
                    }
              }
            >
              <Users className="w-4 h-4" />
              <span>Patient</span>
            </button>
            <button
              onClick={() => setIsResearcher(true)}
              className={`flex-1 px-3 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all flex flex-col items-center gap-1.5 ${
                isResearcher ? "" : ""
              }`}
              style={
                isResearcher
                  ? {
                      borderColor: "#2F3C96",
                      backgroundColor: "rgba(245, 242, 248, 1)",
                      color: "#2F3C96",
                    }
                  : {
                      borderColor: "#E8E8E8",
                      backgroundColor: "#FFFFFF",
                      color: "#787878",
                    }
              }
            >
              <BookOpen className="w-4 h-4" />
              <span>Researcher</span>
            </button>
          </div>

          {/* Condition/Disease Input */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              htmlFor="condition"
              style={{ color: "#2F3C96" }}
            >
              {isResearcher
                ? "Research Area / Disease Focus"
                : "Condition / Disease of Interest"}
            </label>
            <input
              id="condition"
              type="text"
              value={guestCondition}
              onChange={(e) => setGuestCondition(e.target.value)}
              placeholder={
                isResearcher
                  ? "e.g., Oncology, Cardiology, Neurology"
                  : "e.g., Cancer, Diabetes, Heart Disease"
              }
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all"
              style={{
                borderColor: "#E8E8E8",
                backgroundColor: "#FFFFFF",
                color: "#2F3C96",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2F3C96";
                e.target.style.boxShadow = "0 0 0 2px rgba(47, 60, 150, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#E8E8E8";
                e.target.style.boxShadow = "none";
              }}
            />
            <p className="text-xs mt-1" style={{ color: "#787878" }}>
              This helps us show you more relevant results
            </p>
          </div>

          {/* Location Input */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              htmlFor="location"
              style={{ color: "#2F3C96" }}
            >
              Location{" "}
              <span style={{ color: "#787878", fontWeight: "normal" }}>
                (Optional)
              </span>
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: "#787878" }}
              />
              <input
                id="location"
                type="text"
                value={guestLocation}
                onChange={(e) => setGuestLocation(e.target.value)}
                placeholder="Country, City, or Region"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none transition-all"
                style={{
                  borderColor: "#E8E8E8",
                  backgroundColor: "#FFFFFF",
                  color: "#2F3C96",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#2F3C96";
                  e.target.style.boxShadow = "0 0 0 2px rgba(47, 60, 150, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E8E8E8";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: "#787878" }}>
              Find results closer to you
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSaveGuestInfo}
              className="flex-1 px-4 py-2.5 text-white font-semibold text-sm rounded-lg transition-all shadow-sm hover:shadow-md"
              style={{
                backgroundColor: "#2F3C96",
              }}
            >
              {hasShownModal ? "Update" : "Save & Continue"}
            </Button>
            {hasShownModal ? (
              <Button
                onClick={() => {
                  setShowInfoModal(false);
                }}
                className="px-4 py-2.5 border-2 font-semibold text-sm rounded-lg transition-all"
                style={{
                  borderColor: "#E8E8E8",
                  color: "#787878",
                  backgroundColor: "#FFFFFF",
                }}
              >
                Cancel
              </Button>
            ) : (
              <Button
                onClick={handleSkipInfo}
                className="px-4 py-2.5 border-2 font-semibold text-sm rounded-lg transition-all"
                style={{
                  borderColor: "#E8E8E8",
                  color: "#787878",
                  backgroundColor: "#FFFFFF",
                }}
              >
                Skip for Now
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
