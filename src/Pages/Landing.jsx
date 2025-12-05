"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  FlaskConical,
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  Search,
  Sparkles,
  BookOpen,
  Beaker,
  User,
  LogIn,
  Star,
} from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import TrustedNetworksMarquee from "../components/TrustedNetworksMarquee";
import StatsSection from "../components/StatsSection";
import GetStartedSection from "../components/GetStartedSection";
import HowItWorks from "../components/ui/HowItWorks";
import HowItWorksMobile from "../components/ui/how-it-works-mobile";
import Footer from "../components/Footer";
import { AuroraText } from "@/components/ui/aurora-text";
import { ShinyButton } from "@/components/ui/shiny-button";
import GlobalSearch from "../components/GlobalSearch";
import { ChevronDown } from "lucide-react";

export default function Landing() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [credits, setCredits] = useState(Math.floor(Math.random() * 50) + 1); // Random number between 1-50
  const [isBulletsExpanded, setIsBulletsExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState("patient"); // For segmented toggle
  const navigate = useNavigate();

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

  const getDashboardPath = () => {
    if (!user) return "/dashboard/patient";
    return `/dashboard/${user.role || "patient"}`;
  };

  const handleDashboardClick = () => navigate(getDashboardPath());

  return (
    <div className="relative min-h-screen">
      {/* Animated Background */}
      <AnimatedBackground isMobile={isMobile} />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 md:pt-35 pb-12 sm:pb-10 md:pb-18 overflow-hidden">
        <div className="max-w-6xl relative z-10 w-full">
          {/* Hero Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 items-center">
            {/* Left Section - Main Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Next-Generation Badge - Hidden on mobile */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-3 sm:mb-4 hidden sm:block"
              >
                <div
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 shadow-md"
                  style={{
                    backgroundColor: "#F5F2F8",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  >
                    <Star
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                      style={{ color: "#2F3C96" }}
                      fill="#2F3C96"
                    />
                  </motion.div>
                  <span
                    className="text-[10px] sm:text-xs font-semibold"
                    style={{ color: "#2F3C96" }}
                  >
                    Next-Generation Healthcare Platform
                  </span>
                </div>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-3xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold leading-[1.15] mb-4 sm:mb-6 tracking-tight sm:pt-0 pt-10"
              >
                <div className="mb-1 sm:mb-2">
                  <AuroraText speed={2.5} colors={["#2F3C96"]}>
                    Health Research
                  </AuroraText>
                </div>
                <div>
                  <AuroraText
                    speed={2}
                    colors={["#D0C4E2", "#474F97", "#B8A5D5", "#E8E0EF"]}
                  >
                    Made Simple
                  </AuroraText>
                </div>
              </motion.h1>

              {/* Simplified Value Props - Collapsible on Mobile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mb-4 sm:mb-6"
              >
                {isMobile ? (
                  <>
                    <button
                      onClick={() => setIsBulletsExpanded(!isBulletsExpanded)}
                      className="flex items-center justify-between w-full mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <span className="text-sm font-semibold">
                        Key Features
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isBulletsExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isBulletsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        {[
                          "Find clinical trials tailored to your needs",
                          "Connect with researchers and experts",
                          "Connect and collaborate in well-moderated forums",
                        ].map((text, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className="flex items-center gap-2"
                          >
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "#E8E0EF" }}
                            >
                              <CheckCircle2
                                className="w-3 h-3"
                                style={{ color: "#2F3C96" }}
                              />
                            </div>
                            <span
                              className="text-xs font-medium leading-tight"
                              style={{ color: "#2F3C96" }}
                            >
                              {text}
                            </span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2.5">
                    {[
                      "Find clinical trials tailored to your needs",
                      "Connect with researchers and experts",
                      "Connect and collaborate in well-moderated forums",
                    ].map((text, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 + idx * 0.1 }}
                        className="flex items-center gap-2.5"
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "#E8E0EF" }}
                        >
                          <CheckCircle2
                            className="w-3.5 h-3.5"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <span
                          className="text-sm font-medium leading-tight"
                          style={{ color: "#2F3C96" }}
                        >
                          {text}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Welcome for signed-in users */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="p-4 rounded-xl border-2"
                  style={{
                    backgroundColor: "rgba(245, 242, 248, 0.6)",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <p
                    className="text-base font-semibold"
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
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Right Section - Get Started */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div
                className="rounded-2xl sm:rounded-3xl p-6 sm:p-6 md:p-8 border-2 sm:shadow-2xl overflow-hidden"
                style={{
                  backgroundColor: isMobile
                    ? "transparent"
                    : "rgba(245, 242, 248, 0.95)",
                  borderColor: isMobile ? "transparent" : "#D0C4E2",
                }}
              >
                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-xl sm:text-xl md:text-2xl font-bold mb-3 sm:mb-5 text-center whitespace-nowrap"
                  style={{ color: "#2F3C96" }}
                >
                  Discover Before You Commit
                </motion.h2>

                {/* Explanatory Text */}
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-sm sm:text-xs text-center mb-4 sm:mb-6 leading-tight px-2"
                  style={{ color: "#787878" }}
                >
                  Browse clinical trials, publications, and experts. No sign-up
                  required to start discovering!
                </motion.p>

                {/* CTA Buttons */}
                <div className="space-y-3 sm:space-y-3 mb-5 sm:mb-6">
                  {user ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                    >
                      <ShinyButton
                        onClick={handleDashboardClick}
                        className="group relative w-full px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: "#D0C4E2",
                          color: "#2F3C96",
                          borderWidth: "0px",
                        }}
                      >
                        <div className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                          <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="font-bold text-xs sm:text-sm">
                            Go to Your Dashboard
                          </span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </ShinyButton>
                    </motion.div>
                  ) : (
                    <>
                      {/* Role Selection - Segmented Toggle on Mobile, Buttons on Desktop */}
                      {isMobile ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                          className="flex rounded-lg border-2 p-1.5"
                          style={{
                            borderColor: "#D0C4E2",
                            backgroundColor: "#F5F2F8",
                          }}
                        >
                          <button
                            onClick={() => {
                              setSelectedRole("patient");
                              navigate("/trials");
                            }}
                            className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
                              selectedRole === "patient"
                                ? "shadow-sm"
                                : "bg-transparent"
                            }`}
                            style={{
                              backgroundColor:
                                selectedRole === "patient"
                                  ? "#D0C4E2"
                                  : "transparent",
                              color: "#2F3C96",
                            }}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>Patient</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRole("researcher");
                              navigate("/trials");
                            }}
                            className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
                              selectedRole === "researcher"
                                ? "shadow-sm"
                                : "bg-transparent"
                            }`}
                            style={{
                              backgroundColor:
                                selectedRole === "researcher"
                                  ? "#D0C4E2"
                                  : "transparent",
                              color: "#2F3C96",
                            }}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <FlaskConical className="w-4 h-4" />
                              <span>Researcher</span>
                            </div>
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                          className="grid grid-cols-2 gap-3"
                        >
                          <ShinyButton
                            onClick={() => navigate("/trials")}
                            className="group relative w-full px-3 py-3.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                            style={{
                              backgroundColor: "#D0C4E2",
                              color: "#2F3C96",
                              borderWidth: "0px",
                            }}
                          >
                            <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                              <Users
                                className="w-5 h-5"
                                style={{ color: "#2F3C96" }}
                              />
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-xs">
                                  Explore as Patient
                                </span>
                                <span
                                  className="text-xs"
                                  style={{ color: "#474F97" }}
                                >
                                  Find Meaningful Health Insights
                                </span>
                              </div>
                            </div>
                          </ShinyButton>

                          <ShinyButton
                            onClick={() => navigate("/trials")}
                            className="group relative w-full px-3 py-3.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                            style={{
                              backgroundColor: "#F5F2F8",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                              borderWidth: "2px",
                            }}
                          >
                            <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
                              <FlaskConical
                                className="w-5 h-5"
                                style={{ color: "#2F3C96" }}
                              />
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-xs">
                                  Explore as Researcher
                                </span>
                                <span
                                  className="text-xs"
                                  style={{ color: "#787878" }}
                                >
                                  Discover Research Possibilities
                                </span>
                              </div>
                            </div>
                          </ShinyButton>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>

                {/* Credits Badge (for logged in users) or Free Searches (for logged out users) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="pt-3 sm:pt-5 border-t-2"
                  style={{ borderColor: "#D0C4E2" }}
                >
                  <div
                    className="rounded-lg sm:rounded-xl p-3 sm:p-5 text-center border-2"
                    style={{
                      backgroundColor: "#F5F2F8",
                      borderColor: "#D0C4E2",
                    }}
                  >
                    {user ? (
                      <>
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <Sparkles
                            className="w-4 h-4 sm:w-5 sm:h-5"
                            style={{ color: "#D0C4E2" }}
                          />
                        </div>
                        <p
                          className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          You have{" "}
                          <span
                            className="text-base sm:text-lg font-bold"
                            style={{ color: "#2F3C96" }}
                          >
                            {credits} credits left
                          </span>
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center mb-4 sm:mb-4">
                          <div
                            className="inline-flex items-center gap-2.5 px-5 sm:px-5 py-3 sm:py-2.5 rounded-full border-2 shadow-md"
                            style={{
                              background: `linear-gradient(to right, #F5F2F8, #E8E0EF)`,
                              borderColor: "#D0C4E2",
                            }}
                          >
                            <div className="flex items-center gap-2 sm:gap-2">
                              <Search
                                className="w-5 h-5 sm:w-5 sm:h-5"
                                style={{ color: "#2F3C96" }}
                              />
                              <Sparkles
                                className="w-5 h-5 sm:w-5 sm:h-5"
                                style={{ color: "#D0C4E2" }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-sm sm:text-sm font-semibold"
                                style={{ color: "#2F3C96" }}
                              >
                                Search using 6 free searches
                              </span>
                            </div>
                          </div>
                        </div>
                        <p
                          className="text-sm sm:text-xs leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          Search through clinical trials, research publications,
                          and healthcare experts. Start exploring now!
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted Research Networks Marquee */}
      <div className={isMobile ? "py-8" : ""}>
        <TrustedNetworksMarquee />
      </div>
      <StatsSection />
      {/* Get Started Section */}
      {/* <GetStartedSection /> */}

      {/* How It Works Section */}
      <div className={isMobile ? "py-8" : ""}>
        {isMobile ? <HowItWorksMobile /> : <HowItWorks />}
      </div>

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
