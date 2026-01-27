import { useState, useEffect, useRef, Fragment } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import GlobalSearch from "./GlobalSearch";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { listenForMessages } from "../utils/crossTabSync.js";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isExploreDropdownOpen, setIsExploreDropdownOpen] = useState(false);
  const [isMobileExploreOpen, setIsMobileExploreOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const exploreDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAtTop, setIsAtTop] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Check if we're on the landing page
  const isLandingPage = location.pathname === "/";

  // Check if we're on a dashboard page
  const isDashboardPage = location.pathname.includes("/dashboard");

  // Determine navigation items based on route and auth state
  // Landing page + NOT signed in: About, FAQ, Contact
  // All other pages OR signed in: Dashboard, Explore (dropdown), Trending, Forums
  const getNavItems = () => {
    if (isLandingPage && !user) {
      return ["About Us", "FAQ", "Contact"];
    } else {
      // When signed in, show new navigation structure
      if (user) {
        return ["Dashboard", "Explore", "Forums", "Discovery"];
      }
      // Filter out Trials, Publications, Experts on dashboard pages (when not signed in)
      const allNavItems = ["Trials", "Publications", "Experts", "Forums", "Discovery"];
      return isDashboardPage
        ? allNavItems.filter(
            (item) => !["Trials", "Publications", "Experts"].includes(item)
          )
        : allNavItems;
    }
  };

  const navItems = getNavItems();

  useEffect(() => {
    const updateUser = () => {
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      // Only show user as logged in if email is verified
      if (userData && !userData.emailVerified) {
        setUser(null);
        return;
      }
      setUser(userData);
      setImageError(false); // Reset image error when user changes

      // Fetch profile data if user exists
      if (userData?._id || userData?.id) {
        fetchProfile(userData._id || userData.id);
      } else {
        setProfile(null);
      }
    };

    const fetchProfile = async (userId) => {
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${base}/api/profile/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile || null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    updateUser();

    const handleLogout = () => {
      setUser(null);
      setIsMenuOpen(false);
      setIsMobileMenuOpen(false);
    };

    const handleLogin = () => {
      updateUser();
    };

    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") {
        updateUser();
      }
    };

    window.addEventListener("logout", handleLogout);
    window.addEventListener("login", handleLogin);
    window.addEventListener("storage", handleStorageChange);

    // Listen for cross-tab messages (email verification, user updates)
    const cleanupCrossTab = listenForMessages((type, data) => {
      if (type === "email-verified" || type === "user-updated") {
        updateUser();
        // Also trigger login event for other listeners
        window.dispatchEvent(new Event("login"));
      }
    });

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
      if (
        exploreDropdownRef.current &&
        !exploreDropdownRef.current.contains(event.target)
      ) {
        setIsExploreDropdownOpen(false);
      }
      // Only close mobile menu if it's rendered (open) and click is outside both the menu and the button
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        mobileMenuButtonRef.current &&
        !mobileMenuButtonRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        setIsAtTop(scrollY < 50);

        // Calculate scroll progress
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollableHeight = documentHeight - windowHeight;
        const progress =
          scrollableHeight > 0 ? (scrollY / scrollableHeight) * 100 : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial calculation
    handleScroll();

    return () => {
      window.removeEventListener("logout", handleLogout);
      window.removeEventListener("login", handleLogin);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
      cleanupCrossTab();
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Clear search state for all search pages
    sessionStorage.removeItem("experts_search_state");
    sessionStorage.removeItem("trials_search_state");
    sessionStorage.removeItem("publications_search_state");
    window.dispatchEvent(new Event("logout"));
    navigate("/");
  }

  function getDashboardPath() {
    if (!user) return "/dashboard/patient";
    return `/dashboard/${user.role || "patient"}`;
  }

  const getIcon = (item) => {
    const icons = {
      // Landing page navigation
      "About Us": (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      FAQ: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      Contact: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      // Regular navigation
      Dashboard: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 4l4 2m-2-8l4-2m-6 2l-4-2"
          />
        </svg>
      ),
      Trials: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      Publications: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z"
          />
        </svg>
      ),
      Experts: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      Forums: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      Discovery: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      Explore: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      Trending: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    };
    return icons[item];
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.8,
        ease: "easeOut",
        delay: 0.1,
      }}
    >
      <motion.div
        className={`pointer-events-auto flex items-center justify-between transition-all duration-300 ease-out w-full relative ${
          isAtTop
            ? "px-6 lg:px-8 py-4 bg-transparent border-transparent shadow-none"
            : "px-6 lg:px-8 py-3 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg"
        }`}
        style={
          !isAtTop
            ? {
                background:
                  "linear-gradient(135deg, rgba(245, 242, 248, 0.9), rgba(255, 255, 255, 0.7))",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow:
                  "0 4px 16px 0 rgba(47, 60, 150, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
                borderBottomColor: "#D0C4E2",
              }
            : {}
        }
      >
        {/* Logo */}
        <Link to="/" className="group relative flex items-center">
          {/* Logo Image */}
          <motion.img
            src={"/logo.png"}
            alt="Collabiora Logo"
            className="w-auto relative z-10"
            animate={{
              height: isAtTop ? "3.5rem" : "3rem",
              maxWidth: isAtTop ? 64 : 56,
            }}
            style={{
              filter: isAtTop
                ? "drop-shadow(0 4px 8px rgba(47, 60, 150, 0.2))"
                : "drop-shadow(0 2px 4px rgba(47, 60, 150, 0.15))",
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-6 text-[15px] font-semibold">
          {navItems.map((item, index) => {
            // Map navigation items to their routes
            const routeMap = {
              // Landing page routes
              "About Us": "/about",
              FAQ: "/faq",
              Contact: "/contact",
              // Regular navigation routes
              Dashboard: getDashboardPath(),
              Forums: "/forums",
              Discovery: "/posts",
            };
            const route =
              routeMap[item] || `/${item.toLowerCase().replace(/\s+/g, "-")}`;

            // Handle Explore dropdown separately
            if (item === "Explore") {
              return (
                <Fragment key={item}>
                  <div
                    ref={exploreDropdownRef}
                    className="relative"
                    onMouseEnter={() => setIsExploreDropdownOpen(true)}
                    onMouseLeave={() => setIsExploreDropdownOpen(false)}
                  >
                    <button className="relative group transition-all py-2 flex items-center gap-1">
                      <span
                        className="relative z-10 transition-colors duration-200"
                        style={{
                          color: isExploreDropdownOpen ? "#B8A5D5" : "#2F3C96",
                        }}
                      >
                        {item}
                      </span>
                      <svg
                        className="w-4 h-4 transition-transform duration-200"
                        style={{
                          color: isExploreDropdownOpen ? "#B8A5D5" : "#2F3C96",
                          transform: isExploreDropdownOpen
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      <span
                        className="absolute bottom-0 left-0 h-[3px] rounded-full transition-all duration-300"
                        style={{
                          width: isExploreDropdownOpen ? "100%" : "0%",
                          backgroundColor: "#2F3C96",
                        }}
                      ></span>
                    </button>

                    {/* Explore Dropdown Menu */}
                    <AnimatePresence>
                      {isExploreDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.98 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute top-full left-0 pt-2 w-48 backdrop-blur-xl rounded-2xl shadow-2xl border py-2 z-50"
                          style={{
                            backgroundColor: "rgba(245, 242, 248, 0.98)",
                            borderColor: "#D0C4E2",
                          }}
                        >
                          {[
                            {
                              label: "Publications",
                              route: "/publications",
                              icon: (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z"
                                  />
                                </svg>
                              ),
                            },
                            {
                              label: "Trials",
                              route: "/trials",
                              icon: (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              ),
                            },
                            {
                              label: "Experts",
                              route: "/experts",
                              icon: (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                              ),
                            },
                          ].map((subItem) => (
                            <Link
                              key={subItem.label}
                              to={subItem.route}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150 rounded-lg mx-1"
                              style={{ color: "#2F3C96" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#E8E0EF";
                                e.currentTarget.style.color = "#474F97";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.color = "#2F3C96";
                              }}
                            >
                              {subItem.icon}
                              <span>{subItem.label}</span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {/* Vertical separator */}
                  {index < navItems.length - 1 && (
                    <div
                      className="h-6 w-px"
                      style={{ backgroundColor: "#D0C4E2" }}
                    />
                  )}
                </Fragment>
              );
            }

            // Regular navigation items
            return (
              <Fragment key={item}>
                <Link to={route} className="relative group transition-all py-2">
                  <span
                    className="relative z-10 transition-colors duration-200"
                    style={{
                      color: "#2F3C96",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#B8A5D5")}
                    onMouseLeave={(e) => (e.target.style.color = "#2F3C96")}
                  >
                    {item}
                  </span>
                  <span
                    className="absolute bottom-0 left-0 w-0 h-[3px] rounded-full transition-all duration-300 group-hover:w-full"
                    style={{ backgroundColor: "#2F3C96" }}
                  ></span>
                </Link>
                {/* Vertical separator */}
                {index < navItems.length - 1 && (
                  <div
                    className="h-6 w-px"
                    style={{ backgroundColor: "#D0C4E2" }}
                  />
                )}
              </Fragment>
            );
          })}

          {/* Separator before buttons */}
          {navItems.length > 0 && (
            <div
              className="h-6 w-px ml-2"
              style={{ backgroundColor: "#D0C4E2" }}
            />
          )}

          {/* Global Search */}
          {/* <GlobalSearch /> */}

          <div className="flex items-center gap-3 ml-2">
            {/* Notification Bell */}
            {user && (
              <div className="relative" ref={notificationRef}>
                <motion.button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="w-11 h-11 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border backdrop-blur-sm"
                  style={{
                    backgroundColor: "",
                    borderColor: "rgba(47, 60, 150, 0.2)",
                    color: "#2F3C96",
                  }}
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: "rgba(232, 224, 239, 0.8)",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {/* Notification dot indicator */}
                  {/* <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span> */}
                </motion.button>

                <AnimatePresence>
                  {isNotificationOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-80 backdrop-blur-xl rounded-2xl shadow-2xl border py-4 z-50 overflow-hidden"
                      style={{
                        backgroundColor: "rgba(245, 242, 248, 0.95)",
                        borderColor: "#D0C4E2",
                      }}
                    >
                      <div
                        className="px-4 pb-3 border-b"
                        style={{ borderColor: "#D0C4E2" }}
                      >
                        <h3
                          className="text-lg font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          Notifications
                        </h3>
                      </div>
                      <div className="px-4 py-8 flex flex-col items-center justify-center">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                          style={{ backgroundColor: "#E8E0EF" }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ color: "#2F3C96" }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                          </svg>
                        </div>
                        <p
                          className="font-medium text-center"
                          style={{ color: "#2F3C96" }}
                        >
                          No new notifications
                        </p>
                        <p
                          className="text-sm mt-1 text-center mb-4"
                          style={{ color: "#787878" }}
                        >
                          You're all caught up!
                        </p>
                        <button
                          onClick={() => {
                            setIsNotificationOpen(false);
                            navigate("/notifications");
                          }}
                          className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                          style={{
                            background: "linear-gradient(135deg, #2F3C96, #474F97)",
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background =
                              "linear-gradient(135deg, #474F97, #2F3C96)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background =
                              "linear-gradient(135deg, #2F3C96, #474F97)";
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          View All Notifications and Activity
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* User Menu or Sign In */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <motion.button
                  onClick={() => setIsMenuOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-2 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300 border backdrop-blur-sm"
                  style={{
                    backgroundColor: "",
                    borderColor: "rgba(47, 60, 150, 0.2)",
                  }}
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(232, 224, 239, 0.8)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Profile Avatar with Image or First Letter */}
                  {user?.picture && !imageError ? (
                    <img
                      src={user.picture}
                      alt={user?.username || "User"}
                      className="w-8 h-8 rounded-full object-cover shadow-md shrink-0 border-2"
                      style={{
                        borderColor: "rgba(47, 60, 150, 0.3)",
                      }}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                      style={{
                        backgroundColor: "rgba(47, 60, 150, 0.8)",
                        border: "2px solid rgba(47, 60, 150, 0.3)",
                      }}
                    >
                      {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}

                  {/* Name and Role/Condition */}
                  <div className="flex flex-col items-start min-w-0">
                    <span
                      className="text-xs font-semibold truncate max-w-[100px]"
                      style={{ color: "#2F3C96" }}
                    >
                      {user.username || "User"}
                    </span>
                    <span
                      className="text-[10px] truncate max-w-[100px]"
                      style={{ color: "#787878" }}
                    >
                      {(() => {
                        if (
                          user.role === "patient" &&
                          profile?.patient?.conditions?.length > 0
                        ) {
                          return profile.patient.conditions[0];
                        } else if (user.role === "researcher") {
                          return "Researcher";
                        } else if (user.role === "patient") {
                          return "Patient";
                        }
                        return user.role || "User";
                      })()}
                    </span>
                  </div>

                  {/* Chevron */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ color: "#2F3C96" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </motion.button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-52 backdrop-blur-xl rounded-2xl shadow-2xl border py-2 z-50 overflow-hidden"
                      style={{
                        backgroundColor: "rgba(245, 242, 248, 0.95)",
                        borderColor: "#D0C4E2",
                      }}
                    >
                      <Link
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={{ color: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#E8E0EF";
                          e.target.style.color = "#474F97";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#2F3C96";
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span>My Profile</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={{ color: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#E8E0EF";
                          e.target.style.color = "#474F97";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#2F3C96";
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        <span>Favorites</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                      <Link
                        to="/notifications"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={{ color: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#E8E0EF";
                          e.target.style.color = "#474F97";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.color = "#2F3C96";
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>Notifications</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                      <hr className="my-2" style={{ borderColor: "#D0C4E2" }} />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200"
                        style={{ color: "#dc2626" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#fee2e2";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Sign Out</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 ml-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/signin"
                  className="px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold border-2 text-white"
                  style={{
                    background: "linear-gradient(135deg, #2F3C96, #474F97)",
                    borderColor: "#D0C4E2",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #474F97, #2F3C96)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #2F3C96, #474F97)";
                  }}
                >
                  Sign In
                </Link>
              </motion.div>
            )}
          </div>
        </nav>

        {/* Mobile Hamburger */}
        <div className="sm:hidden flex items-center gap-2">
          {/* Notification Bell for Mobile */}
          {user && (
            <motion.button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="w-10 h-10 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border backdrop-blur-sm relative"
              style={{
                backgroundColor: "rgba(245, 242, 248, 0.7)",
                borderColor: "rgba(47, 60, 150, 0.2)",
                color: "#2F3C96",
              }}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(232, 224, 239, 0.8)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {/* Notification dot indicator */}
              {/* <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span> */}
            </motion.button>
          )}

          <motion.button
            ref={mobileMenuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen((prev) => !prev);
            }}
            className="w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg border-2"
            style={{
              background: "linear-gradient(135deg, #F5F2F8, #E8E0EF)",
              borderColor: "#D0C4E2",
              color: "#2F3C96",
            }}
            whileHover={{
              scale: 1.1,
              background: "linear-gradient(135deg, #E8E0EF, #F5F2F8)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </motion.button>
        </div>

        {/* Scroll Progress Bar - Below Navbar */}
        <motion.div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrollProgress > 0 ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="h-full"
            style={{
              background: "linear-gradient(90deg, #2F3C96, #474F97, #B8A5D5)",
              boxShadow: "0 0 10px rgba(47, 60, 150, 0.5)",
            }}
            animate={{
              width: `${scrollProgress}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 30,
            }}
          />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute top-20 left-4 right-4 mx-auto rounded-2xl backdrop-blur-2xl border shadow-2xl py-4 px-4 flex flex-col items-stretch gap-2.5 sm:hidden z-50 max-h-[70vh] overflow-y-auto"
            style={{
              backgroundColor: "rgba(245, 242, 248, 0.95)",
              borderColor: "#D0C4E2",
            }}
          >
            {/* Global Search - Mobile */}
            {/* <div className="pb-4 border-b" style={{ borderColor: "#D0C4E2" }}>
              <GlobalSearch />
            </div> */}

            {/* Navigation Links Section */}
            {navItems.length > 0 && (
              <div
                className="space-y-1.5 pb-3 border-b"
                style={{ borderColor: "#D0C4E2" }}
              >
                {navItems.map((item) => {
                  // Map navigation items to their routes
                  const routeMap = {
                    // Landing page routes
                    "About Us": "/about",
                    FAQ: "/faq",
                    Contact: "/contact",
                    // Regular navigation routes
                    Dashboard: getDashboardPath(),
                    Forums: "/forums",
                    Discovery: "/posts",
                  };
                  const route =
                    routeMap[item] ||
                    `/${item.toLowerCase().replace(/\s+/g, "-")}`;

                  // Handle Explore dropdown in mobile
                  if (item === "Explore") {
                    return (
                      <div key={item}>
                        <button
                          onClick={() =>
                            setIsMobileExploreOpen(!isMobileExploreOpen)
                          }
                          className="flex items-center justify-between w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                          style={{ color: "#2F3C96" }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#E8E0EF";
                            e.target.style.color = "#474F97";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#2F3C96";
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                              style={{
                                backgroundColor: "#E8E0EF",
                                color: "#2F3C96",
                              }}
                            >
                              {getIcon(item)}
                            </span>
                            {item}
                          </div>
                          <svg
                            className="w-4 h-4 transition-transform duration-200"
                            style={{
                              color: "#2F3C96",
                              transform: isMobileExploreOpen
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                            }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {isMobileExploreOpen && (
                          <div className="pl-6 mt-1 space-y-1">
                            {[
                              { label: "Publications", route: "/publications" },
                              { label: "Trials", route: "/trials" },
                              { label: "Experts", route: "/experts" },
                            ].map((subItem) => (
                              <Link
                                key={subItem.label}
                                to={subItem.route}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 w-full text-sm font-medium rounded-lg py-2 px-3 transition-all duration-200"
                                style={{ color: "#2F3C96" }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = "#E8E0EF";
                                  e.target.style.color = "#474F97";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = "transparent";
                                  e.target.style.color = "#2F3C96";
                                }}
                              >
                                {subItem.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Regular navigation items
                  return (
                    <Link
                      key={item}
                      to={route}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                      style={{ color: "#2F3C96" }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#E8E0EF";
                        e.target.style.color = "#474F97";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                        e.target.style.color = "#2F3C96";
                      }}
                    >
                      <span
                        className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                        style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                      >
                        {getIcon(item)}
                      </span>
                      {item}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* User-Specific Links */}
            {user ? (
              <div
                className="space-y-1.5 pb-3 border-b"
                style={{ borderColor: "#D0C4E2" }}
              >
                <Link
                  to={getDashboardPath()}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                  style={{ color: "#2F3C96" }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#E8E0EF";
                    e.target.style.color = "#474F97";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#2F3C96";
                  }}
                >
                  <span
                    className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                    style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 4l4 2m-2-8l4-2m-6 2l-4-2"
                      />
                    </svg>
                  </span>
                  Dashboard
                </Link>
                <Link
                  to="/favorites"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                  style={{ color: "#2F3C96" }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#E8E0EF";
                    e.target.style.color = "#474F97";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#2F3C96";
                  }}
                >
                  <span
                    className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                    style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </span>
                  Favorites
                </Link>
                <Link
                  to="/notifications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 w-full text-base font-medium rounded-xl py-2 px-3 transition-all duration-200 group"
                  style={{ color: "#2F3C96" }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#E8E0EF";
                    e.target.style.color = "#474F97";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "#2F3C96";
                  }}
                >
                  <span
                    className="p-1.5 rounded-lg group-hover:scale-110 transition-all duration-200"
                    style={{ backgroundColor: "#E8E0EF", color: "#2F3C96" }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </span>
                  Notifications
                </Link>
              </div>
            ) : null}

            {/* Auth Button */}
            <div className="pt-1.5">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-center text-base font-semibold text-white py-2.5 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #dc2626, #ef4444)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #ef4444, #dc2626)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #dc2626, #ef4444)";
                  }}
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full text-center text-base font-semibold text-white py-2.5 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #2F3C96, #474F97)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #474F97, #2F3C96)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background =
                      "linear-gradient(135deg, #2F3C96, #474F97)";
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Notification Dropdown */}
      <AnimatePresence>
        {isNotificationOpen && user && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute top-24 right-4 left-4 mx-auto rounded-3xl bg-white/95 backdrop-blur-2xl border border-indigo-200/60 shadow-2xl py-6 px-6 sm:hidden z-50"
          >
            <div className="px-2 pb-4 border-b border-indigo-200/60 mb-4">
              <h3 className="text-xl font-bold text-gray-800">Notifications</h3>
            </div>
            <div className="px-2 py-8 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-10 h-10 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-semibold text-center text-lg">
                No new notifications
              </p>
              <p className="text-sm text-gray-400 mt-2 text-center mb-4">
                You're all caught up!
              </p>
              <button
                onClick={() => {
                  setIsNotificationOpen(false);
                  navigate("/notifications");
                }}
                className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 text-white"
                style={{
                  background: "linear-gradient(135deg, #2F3C96, #474F97)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #474F97, #2F3C96)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #2F3C96, #474F97)";
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                View All Notifications and Activity
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
