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
} from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";

const FREE_SEARCHES_KEY = "free_searches_remaining";
const FREE_SEARCHES_TOTAL = 6;

export default function Explore() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [freeSearches, setFreeSearches] = useState(FREE_SEARCHES_TOTAL);
  const [isMobile, setIsMobile] = useState(false);

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
    };

    window.addEventListener("login", handleLogin);
    return () => window.removeEventListener("login", handleLogin);
  }, []);

  const benefits = [
    "Unlimited searches",
    "Personalized recommendations",
    "Save favorites",
    "Connect with experts",
    "Track your research",
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

          {/* Quick Access Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {[
              {
                title: "Clinical Trials",
                description: "Find active research studies",
                icon: Beaker,
                color: "#2F3C96",
                path: "/trials",
              },
              {
                title: "Publications",
                description: "Browse research papers",
                icon: BookOpen,
                color: "#474F97",
                path: "/publications",
              },
              {
                title: "Experts",
                description: "Connect with researchers",
                icon: Users,
                color: "#B8A5D5",
                path: "/experts",
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={idx}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(card.path)}
                  className="p-6 rounded-xl border-2 text-left transition-all duration-200"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <div
                    className="p-3 rounded-lg mb-3 inline-block"
                    style={{ backgroundColor: "#F5F2F8" }}
                  >
                    <Icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: "#2F3C96" }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-sm" style={{ color: "#787878" }}>
                    {card.description}
                  </p>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Sign In Encouragement */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="rounded-xl p-6 sm:p-8 border-2"
              style={{
                backgroundColor: "rgba(245, 242, 248, 0.95)",
                borderColor: "#D0C4E2",
              }}
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#FFFFFF" }}
                    >
                      <LogIn className="w-5 h-5" style={{ color: "#2F3C96" }} />
                    </div>
                    <h2
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: "#2F3C96" }}
                    >
                      Sign in for unlimited access
                    </h2>
                  </div>
                  <p
                    className="text-sm sm:text-base mb-4"
                    style={{ color: "#787878" }}
                  >
                    Get personalized recommendations, save your favorites, and
                    connect with experts.
                  </p>
                  <ul className="space-y-2 mb-4">
                    {benefits.map((benefit, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <CheckCircle2
                          className="w-4 h-4 shrink-0"
                          style={{ color: "#D0C4E2" }}
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/signin")}
                    className="px-6 py-3 rounded-lg font-semibold text-sm flex items-center gap-2 text-white transition-all duration-300"
                    style={{
                      background: `linear-gradient(to right, #2F3C96, #474F97)`,
                    }}
                  >
                    Sign In Now
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: "#FFFFFF" }}
                >
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
    </div>
  );
}
