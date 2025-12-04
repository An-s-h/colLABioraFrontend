import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  FlaskConical,
  LayoutDashboard,
  Search,
  BookOpen,
  User,
  Beaker,
  ChevronDown,
  Grid3x3,
} from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import TabletMockup from "../components/ui/TabletMockup";
import HowItWorks from "../components/ui/HowItWorks";
import HowItWorksMobile from "../components/ui/how-it-works-mobile";
import Footer from "../components/Footer";
import { AuroraText } from "@/components/ui/aurora-text";
import { ShinyButton } from "@/components/ui/shiny-button";
import { NumberTicker } from "@/components/ui/number-ticker";

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const navigate = useNavigate();

  const categoryOptions = [
    { value: "all", label: "All", icon: Grid3x3, color: "#2F3C96" },
    { value: "trials", label: "Trials", icon: Beaker, color: "#2F3C96" },
    {
      value: "publications",
      label: "Publications",
      icon: BookOpen,
      color: "#2F3C96",
    },
    { value: "experts", label: "Experts", icon: User, color: "#2F3C96" },
  ];

  const selectedCategory =
    categoryOptions.find((opt) => opt.value === searchCategory) ||
    categoryOptions[0];

  useEffect(() => {
    setMounted(true);

    const updateUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");
      setUser(userData && token ? userData : null);
    };

    updateUser();

    const handleLogin = () => updateUser();
    const handleLogout = () => setUser(null);
    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") updateUser();
    };

    window.addEventListener("login", handleLogin);
    window.addEventListener("logout", handleLogout);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("login", handleLogin);
      window.removeEventListener("logout", handleLogout);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCategoryOpen && !event.target.closest(".category-dropdown")) {
        setIsCategoryOpen(false);
      }
    };

    if (isCategoryOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryOpen]);

  const getDashboardPath = () => {
    if (!user) return "/dashboard/patient";
    return `/dashboard/${user.role || "patient"}`;
  };

  const handleDashboardClick = () => navigate(getDashboardPath());

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();

    if (searchCategory === "all") {
      // Navigate to trials page with search query (default)
      navigate(`/trials?q=${encodeURIComponent(query)}`);
    } else {
      // Navigate to specific category page
      const categoryMap = {
        trials: "/trials",
        publications: "/publications",
        experts: "/experts",
      };
      navigate(`${categoryMap[searchCategory]}?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-25 sm:pt-24 pb-12 sm:pb-16 overflow-hidden">
        <div className="max-w-5xl pt-4 sm:pt-2 relative z-10 w-full">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight sm:leading-none tracking-tight text-center mb-6 sm:mb-4"
            style={{ color: "#2F3C96" }}
          >
            Empowering{" "}
            <AuroraText
              speed={2.5}
              colors={["#D0C4E2", "#2F3C96", "#B8A5D5", "#474F97", "#E8E0EF"]}
            >
              Healthcare
            </AuroraText>{" "}
            Through Connection
          </motion.h1>
          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8 sm:mb-6 pt-6 sm:pt-5"
          >
            <div
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border-2"
              style={{ backgroundColor: "#F5F2F8", borderColor: "#D0C4E2" }}
            >
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white"
                    style={{
                      background: `linear-gradient(to bottom right, ${
                        i === 1 ? "#D0C4E2" : i === 2 ? "#2F3C96" : "#B8A5D5"
                      })`,
                    }}
                  />
                ))}
              </div>
              <span
                className="text-xs sm:text-sm font-medium"
                style={{ color: "#2F3C96" }}
              >
                Trusted by{" "}
                <NumberTicker
                  value={100}
                  className="text-xs sm:text-sm font-medium"
                  style={{ color: "#2F3C96" }}
                />
                K+ users
              </span>
            </div>
          </motion.div>
          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto text-center leading-relaxed sm:leading-tight mb-8 sm:mb-6 tracking-normal px-2"
            style={{ color: "#787878" }}
          >
            Health Research Made Simple.
          </motion.p>

          {/* Welcome Message for Signed-in Users */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-center mb-6 sm:mb-4"
            >
              <h2
                className="text-xl sm:text-2xl md:text-3xl font-bold mb-0 leading-tight"
                style={{ color: "#2F3C96" }}
              >
                Welcome Back,{" "}
                <AuroraText
                  colors={[
                    "#D0C4E2",
                    "#2F3C96",
                    "#B8A5D5",
                    "#474F97",
                    "#E8E0EF",
                  ]}
                >
                  {user?.name || user?.username || "User"}!
                </AuroraText>
              </h2>
            </motion.div>
          )}

          {/* Global Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="w-full max-w-3xl mx-auto mb-8 sm:mb-6"
          >
            <form onSubmit={handleSearch} className="relative">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                {/* Category Selector - Custom Dropdown */}
                <div className="relative category-dropdown">
                  <motion.button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-3 border-2 shadow-lg hover:shadow-xl transition-all duration-200 min-w-[140px] justify-between"
                    style={{ borderColor: "#D0C4E2" }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      {selectedCategory.icon && (
                        <selectedCategory.icon
                          className="w-4 h-4 shrink-0"
                          style={{ color: selectedCategory.color }}
                        />
                      )}
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#2F3C96" }}
                      >
                        {selectedCategory.label}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isCategoryOpen ? "rotate-180" : ""
                      }`}
                      style={{ color: "#2F3C96" }}
                    />
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isCategoryOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 overflow-hidden z-50"
                        style={{ borderColor: "#D0C4E2" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {categoryOptions.map((option) => {
                          const Icon = option.icon;
                          const isSelected = option.value === searchCategory;
                          return (
                            <motion.button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSearchCategory(option.value);
                                setIsCategoryOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200"
                              whileHover={{ x: 4 }}
                              style={{
                                backgroundColor: isSelected
                                  ? "rgba(232, 224, 239, 0.6)"
                                  : "transparent",
                              }}
                            >
                              <Icon
                                className="w-5 h-5 shrink-0"
                                style={{
                                  color: isSelected ? "#2F3C96" : "#787878",
                                }}
                              />
                              <span
                                className={`text-sm font-medium ${
                                  isSelected ? "font-semibold" : ""
                                }`}
                                style={{
                                  color: isSelected ? "#2F3C96" : "#787878",
                                }}
                              >
                                {option.label}
                              </span>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-auto w-2 h-2 rounded-full"
                                  style={{ backgroundColor: "#2F3C96" }}
                                />
                              )}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Search Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search trials, publications, or experts..."
                    className="w-full px-6 py-4 pr-14 rounded-full border-2 bg-white/90 backdrop-blur-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all text-base"
                    style={{
                      borderColor: "#D0C4E2",
                      color: "#2F3C96",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2F3C96";
                      e.target.style.boxShadow =
                        "0 0 0 2px rgba(47, 60, 150, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#D0C4E2";
                      e.target.style.boxShadow = "";
                    }}
                  />
                  <motion.button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={{ backgroundColor: "#2F3C96" }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Search className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 sm:gap-4 w-full sm:w-auto px-2 sm:px-0"
          >
            {user ? (
              // Single dashboard button for signed-in users
              <ShinyButton
                onClick={handleDashboardClick}
                className="group relative w-full sm:w-auto px-6 sm:px-6 py-4 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundColor: "#F5F2F8",
                  borderColor: "#D0C4E2",
                  color: "#2F3C96",
                  borderWidth: "1px",
                }}
              >
                <div className="relative z-10 flex items-center gap-3 !normal-case justify-center sm:justify-start">
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  <div className="flex flex-col items-center sm:items-start">
                    <span
                      className="font-semibold text-sm sm:text-base tracking-normal leading-tight text-center sm:text-left"
                      style={{ color: "#2F3C96" }}
                    >
                      See your personalized dashboard
                    </span>
                    <span
                      className="text-xs font-normal text-center sm:text-left"
                      style={{ color: "#787878" }}
                    >
                      Continue to your dashboard
                    </span>
                  </div>
                </div>
              </ShinyButton>
            ) : (
              // Two CTA buttons for non-signed-in users
              <>
                <ShinyButton
                  onClick={() => navigate("/onboard/patient")}
                  className="group relative w-full sm:w-auto px-6 sm:px-10 py-4 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  style={{
                    backgroundColor: "#F5F2F8",
                    borderColor: "#D0C4E2",
                    color: "#2F3C96",
                    borderWidth: "1px",
                  }}
                >
                  <div className="relative z-10 flex items-center gap-3 !normal-case justify-center sm:justify-start">
                    <Users className="w-5 h-5 shrink-0" />
                    <div className="flex flex-col items-center sm:items-start">
                      <span
                        className="font-semibold text-sm sm:text-base tracking-normal leading-tight text-center sm:text-left"
                        style={{ color: "#2F3C96" }}
                      >
                        Get Started
                      </span>
                      <span
                        className="text-xs font-normal text-center sm:text-left"
                        style={{ color: "#787878" }}
                      >
                        Join as Patient
                      </span>
                    </div>
                  </div>
                </ShinyButton>
                <ShinyButton
                  onClick={() => navigate("/onboard/researcher")}
                  className="group relative w-full sm:w-auto px-6 sm:px-10 py-4 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  style={{
                    backgroundColor: "#F5F2F8",
                    borderColor: "#D0C4E2",
                    color: "#2F3C96",
                    borderWidth: "1px",
                  }}
                >
                  <div className="relative z-10 flex items-center gap-3 !normal-case justify-center sm:justify-start">
                    <FlaskConical className="w-5 h-5 shrink-0" />
                    <div className="flex flex-col items-center sm:items-start">
                      <span
                        className="font-semibold text-sm sm:text-base tracking-normal leading-tight text-center sm:text-left"
                        style={{ color: "#2F3C96" }}
                      >
                        Get Started
                      </span>
                      <span
                        className="text-xs font-normal text-center sm:text-left"
                        style={{ color: "#787878" }}
                      >
                        For Researchers
                      </span>
                    </div>
                  </div>
                </ShinyButton>
              </>
            )}
          </motion.div>

          {/* Tablet Mockup with Dashboard */}
          <div className="mt-5 hidden md:block">
            <TabletMockup imageSrc="/dashboard-preview.png" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      {isMobile ? <HowItWorksMobile /> : <HowItWorks />}

      <style jsx>{`
        @keyframes gradient-slow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient-slow {
          background-size: 300% 300%;
          animation: gradient-slow 8s ease infinite;
        }
      `}</style>

      <Footer />
    </div>
  );
}
