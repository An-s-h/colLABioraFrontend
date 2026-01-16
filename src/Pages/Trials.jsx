import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Heart,
  Sparkles,
  Mail,
  Beaker,
  MapPin,
  Calendar,
  Send,
  CheckCircle,
  User,
  ListChecks,
  Info,
  ExternalLink,
  TrendingUp,
  Activity,
  Users,
  FileText,
  Loader2,
  Phone,
  Copy,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
} from "lucide-react";
import Layout from "../components/Layout.jsx";

// Tooltip component that renders outside modal overflow
function Tooltip({ content }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const updatePosition = () => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      }
    };

    if (isVisible) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible]);

  return (
    <>
      <div
        ref={iconRef}
        className="relative"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <Info className="w-4 h-4 text-slate-400 cursor-help" />
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-[10000] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}
    </>
  );
}
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import CustomSelect from "../components/ui/CustomSelect.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { AuroraText } from "@/components/ui/aurora-text";
import FreeSearchesIndicator, {
  useFreeSearches,
} from "../components/FreeSearchesIndicator.jsx";
import apiFetch from "../utils/api.js";
import {
  incrementLocalSearchCount,
  syncWithBackend,
  setLocalSearchCount,
  MAX_FREE_SEARCHES,
} from "../utils/searchLimit.js";

export default function Trials() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("RECRUITING"); // Default to RECRUITING
  const [location, setLocation] = useState("");
  const [locationMode, setLocationMode] = useState("global"); // "current", "global", "custom"
  const [userLocation, setUserLocation] = useState(null);
  const [useMedicalInterest, setUseMedicalInterest] = useState(true); // Toggle for using medical interest
  const [userMedicalInterest, setUserMedicalInterest] = useState(""); // User's medical interest
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if it's the initial load
  const [isSignedIn, setIsSignedIn] = useState(false); // Track if user is signed in
  const [user, setUser] = useState(null); // Track user state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); // Start with loading false - no initial search
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const { checkAndUseSearch, getRemainingSearches } = useFreeSearches();
  const [userProfile, setUserProfile] = useState(null); // Track user profile
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    trial: null,
    loading: false,
    generatedMessage: "",
    generating: false,
    copied: false,
  });
  const [contactModal, setContactModal] = useState({
    open: false,
    trial: null,
    message: "",
    sent: false,
    generating: false,
  });
  const [contactInfoModal, setContactInfoModal] = useState({
    open: false,
    trial: null,
    loading: false,
    generatedMessage: "",
    generating: false,
    copied: false,
  });
  const [contactStepsModal, setContactStepsModal] = useState({
    open: false,
    trial: null,
    currentStep: 1,
    generatedEmail: "",
    generating: false,
    copied: false,
  });

  // Helper function to sort trials by match percentage (highest first)
  const sortTrialsByMatch = (trials) => {
    return [...trials].sort((a, b) => {
      const aMatch = a.matchPercentage ?? -1;
      const bMatch = b.matchPercentage ?? -1;
      return bMatch - aMatch; // Descending order (highest first)
    });
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lastSearchQuery, setLastSearchQuery] = useState(""); // Track last search query for pagination
  const [lastSearchParams, setLastSearchParams] = useState({}); // Store all search parameters for pagination

  // Search keywords state (chips/tags)
  const [searchKeywords, setSearchKeywords] = useState([]); // Keywords as chips below search bar
  const MIN_KEYWORDS_REQUIRED = 2; // Minimum keywords required before search

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [eligibilitySex, setEligibilitySex] = useState("All"); // "All", "Female", "Male"
  const [eligibilityAge, setEligibilityAge] = useState(""); // "Child", "Adult", "Older adult", or custom range
  const [ageRange, setAgeRange] = useState({ min: "", max: "" }); // For manual age range
  const [phase, setPhase] = useState(""); // Phase filter: "PHASE1", "PHASE2", "PHASE3", "PHASE4", or ""
  const [otherTerms, setOtherTerms] = useState(""); // Other search terms
  const [intervention, setIntervention] = useState(""); // Intervention/treatment

  const quickFilters = [
    { label: "Recruiting", value: "RECRUITING", icon: "👥" },
    { label: "Phase 3", value: "PHASE3", icon: "🔬" },
    { label: "Cancer", value: "cancer", icon: "🩺" },
    { label: "Diabetes", value: "diabetes", icon: "💊" },
    { label: "Cardiology", value: "cardiology", icon: "❤️" },
    { label: "Neurology", value: "neurology", icon: "🧠" },
  ];

  const trialSuggestionTerms = [
    ...quickFilters.map((filter) => filter.label),
    ...quickFilters.map((filter) => filter.value),
    userMedicalInterest,
  ].filter(Boolean);

  const statusOptionsList = [
    "RECRUITING",
    "NOT_YET_RECRUITING",
    "ACTIVE_NOT_RECRUITING",
    "COMPLETED",
    "SUSPENDED",
    "TERMINATED",
    "WITHDRAWN",
  ];

  // Convert to format for CustomSelect
  const statusOptions = [
    { value: "", label: "All Statuses" },
    ...statusOptionsList.map((status) => ({
      value: status,
      label: status.replace(/_/g, " "),
    })),
  ];

  // Keyword chips management functions
  const addKeyword = (keyword) => {
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword && !searchKeywords.includes(trimmedKeyword)) {
      setSearchKeywords([...searchKeywords, trimmedKeyword]);
      setQ(""); // Clear the input after adding
    }
  };

  const removeKeyword = (keywordToRemove) => {
    setSearchKeywords(searchKeywords.filter((k) => k !== keywordToRemove));
  };

  const clearAllKeywords = () => {
    setSearchKeywords([]);
    setQ("");
  };

  // Handle Enter key press - adds keyword instead of searching
  const handleKeywordSubmit = (value) => {
    if (value && value.trim()) {
      addKeyword(value);
    }
  };

  // Trigger search with validation for minimum keywords
  const handleSearch = () => {
    // Include current input value if not empty
    let currentKeywords = [...searchKeywords];
    if (q.trim() && !searchKeywords.includes(q.trim())) {
      currentKeywords = [...searchKeywords, q.trim()];
      setSearchKeywords(currentKeywords);
      setQ("");
    }

    if (currentKeywords.length < MIN_KEYWORDS_REQUIRED) {
      toast.error(
        `Please add at least ${MIN_KEYWORDS_REQUIRED} keywords before searching. Currently: ${currentKeywords.length}`,
        { duration: 3000 }
      );
      return;
    }

    // Combine keywords for search
    const combinedQuery = currentKeywords.join(" ");
    search(combinedQuery);
  };

  async function search(overrideQuery) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isUserSignedIn = userData && token;

    // Check free searches for non-signed-in users (pre-check)
    if (!isUserSignedIn) {
      const canSearch = await checkAndUseSearch();
      if (!canSearch) {
        toast.error(
          "You've used all your free searches! Sign in to continue searching.",
          { duration: 4000 }
        );
        return;
      }
    }

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    const user = userData;
    const appliedQuery = typeof overrideQuery === "string" ? overrideQuery : q;

    // Mark that initial load is complete when user performs search
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }

    // For manual searches, combine user's medical interest with search query if enabled
    let searchQuery = appliedQuery.trim();
    if (useMedicalInterest && userMedicalInterest && searchQuery) {
      // Combine: "breast cancer ductal carcinoma in situ vaccine" if user searches "ductal carcinoma in situ vaccine" and has "breast cancer" interest
      searchQuery = `${userMedicalInterest} ${searchQuery}`;
    } else if (useMedicalInterest && userMedicalInterest && !searchQuery) {
      // If no search query but medical interest is enabled, use just the medical interest
      searchQuery = userMedicalInterest;
    }

    // Combine search query with advanced filters
    let finalQuery = searchQuery;

    // Add other terms if provided
    if (otherTerms.trim()) {
      finalQuery = finalQuery
        ? `${finalQuery} ${otherTerms.trim()}`
        : otherTerms.trim();
    }

    // Add intervention if provided
    if (intervention.trim()) {
      finalQuery = finalQuery
        ? `${finalQuery} ${intervention.trim()}`
        : intervention.trim();
    }

    if (finalQuery) params.set("q", finalQuery);
    if (status) params.set("status", status);

    // Add phase filter
    if (phase) {
      params.set("phase", phase);
    }

    // Add advanced eligibility filters
    if (eligibilitySex && eligibilitySex !== "All") {
      params.set("eligibilitySex", eligibilitySex);
    }

    if (eligibilityAge) {
      if (eligibilityAge === "Child") {
        params.set("eligibilityAgeMin", "0");
        params.set("eligibilityAgeMax", "17");
      } else if (eligibilityAge === "Adult") {
        params.set("eligibilityAgeMin", "18");
        params.set("eligibilityAgeMax", "64");
      } else if (eligibilityAge === "Older adult") {
        params.set("eligibilityAgeMin", "65");
      } else if (eligibilityAge === "custom") {
        // Use manual age range
        if (ageRange.min) params.set("eligibilityAgeMin", ageRange.min);
        if (ageRange.max) params.set("eligibilityAgeMax", ageRange.max);
      }
    }

    // Reset pagination for new searches
    params.set("page", "1");
    params.set("pageSize", "6");
    setCurrentPage(1);
    setLastSearchQuery(finalQuery);

    // Store search parameters for pagination
    setLastSearchParams({
      finalQuery,
      status,
      phase,
      eligibilitySex,
      eligibilityAge,
      ageRange,
      locationMode,
      location,
      userLocation,
      useMedicalInterest,
      userMedicalInterest,
      user,
    });

    // Add location parameter (use only country)
    if (locationMode === "current" && userLocation) {
      // Use only country for location filtering
      if (userLocation.country) {
        params.set("location", userLocation.country);
      }
    } else if (locationMode === "custom" && location.trim()) {
      // For custom location, use as-is (user can enter country)
      params.set("location", location.trim());
    }
    // "global" mode doesn't send location parameter

    // Add user profile data for matching
    if (user?._id || user?.id) {
      params.set("userId", user._id || user.id);
    } else if (useMedicalInterest && userMedicalInterest) {
      // Send conditions/keywords from medical interest
      params.set("conditions", userMedicalInterest);
      // Send location if available
      if (locationMode === "current" && userLocation) {
        params.set("userLocation", JSON.stringify(userLocation));
      } else if (locationMode === "custom" && location.trim()) {
        params.set(
          "userLocation",
          JSON.stringify({ country: location.trim() })
        );
      }
    }

    try {
      const response = await apiFetch(
        `/api/search/trials?${params.toString()}`
      );

      // Handle case where apiFetch returns undefined (401 redirect)
      if (!response) {
        setLoading(false);
        return;
      }

      // Handle rate limit (429)
      if (response.status === 429) {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
            "You've used all your free searches! Sign in to continue searching.",
          { duration: 4000 }
        );
        setLoading(false);
        // Sync with backend to update local storage
        syncWithBackend()
          .then((result) => {
            // Update remaining searches indicator with synced value
            window.dispatchEvent(
              new CustomEvent("freeSearchUsed", {
                detail: { remaining: result.remaining },
              })
            );
          })
          .catch(console.error);
        return;
      }

      const data = await response.json();
      const searchResults = data.results || [];

      // Set pagination data
      setTotalCount(data.totalCount || 0);
      const calculatedTotalPages = Math.ceil((data.totalCount || 0) / 6);
      setTotalPages(calculatedTotalPages);

      // Sort by matchPercentage in descending order (highest first)
      const sortedResults = sortTrialsByMatch(searchResults);
      setResults(sortedResults);

      // Only count search after results are successfully loaded and processed
      // Handle remaining searches from server response
      if (!isUserSignedIn && data.remaining !== undefined) {
        // Update local storage to match backend (backend is source of truth)
        const remaining = data.remaining;
        const backendCount = MAX_FREE_SEARCHES - remaining;
        setLocalSearchCount(backendCount);

        if (remaining === 0) {
          toast(
            "You've used all your free searches! Sign in for unlimited searches.",
            { duration: 5000, icon: "🔒" }
          );
        } else {
          toast.success(
            `Search successful! ${remaining} free search${
              remaining !== 1 ? "es" : ""
            } remaining.`,
            { duration: 3000 }
          );
        }
        // Update remaining searches indicator with the actual remaining count from backend
        window.dispatchEvent(
          new CustomEvent("freeSearchUsed", {
            detail: { remaining },
          })
        );
      }

      // Save search state to sessionStorage (including pagination)
      const searchState = {
        q: appliedQuery,
        status,
        location,
        locationMode,
        useMedicalInterest,
        userMedicalInterest,
        results: sortedResults,
        currentPage: 1,
        totalPages: calculatedTotalPages,
        totalCount: data.totalCount || 0,
        lastSearchParams: {
          finalQuery,
          status,
          phase,
          eligibilitySex,
          eligibilityAge,
          ageRange,
          locationMode,
          location,
          userLocation,
          useMedicalInterest,
          userMedicalInterest,
          user,
        },
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "trials_search_state",
        JSON.stringify(searchState)
      );
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Navigate to specific page (server-side pagination)
  async function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage || loading)
      return;

    setLoading(true);
    setCurrentPage(page);

    const params = new URLSearchParams();
    const {
      finalQuery: savedQuery,
      status: savedStatus,
      phase: savedPhase,
      eligibilitySex: savedEligibilitySex,
      eligibilityAge: savedEligibilityAge,
      ageRange: savedAgeRange,
      locationMode: savedLocationMode,
      location: savedLocation,
      userLocation: savedUserLocation,
      useMedicalInterest: savedUseMedicalInterest,
      userMedicalInterest: savedUserMedicalInterest,
      user: savedUser,
    } = lastSearchParams;

    // Use saved query or last search query
    const queryToUse = savedQuery || lastSearchQuery || "";

    if (queryToUse) params.set("q", queryToUse);
    if (savedStatus || status) params.set("status", savedStatus || status);

    // Add phase filter
    if (savedPhase || phase) {
      params.set("phase", savedPhase || phase);
    }

    // Add advanced eligibility filters
    const currentEligibilitySex = savedEligibilitySex || eligibilitySex;
    if (currentEligibilitySex && currentEligibilitySex !== "All") {
      params.set("eligibilitySex", currentEligibilitySex);
    }

    const currentEligibilityAge = savedEligibilityAge || eligibilityAge;
    const currentAgeRange = savedAgeRange || ageRange;
    if (currentEligibilityAge) {
      if (currentEligibilityAge === "Child") {
        params.set("eligibilityAgeMin", "0");
        params.set("eligibilityAgeMax", "17");
      } else if (currentEligibilityAge === "Adult") {
        params.set("eligibilityAgeMin", "18");
        params.set("eligibilityAgeMax", "64");
      } else if (currentEligibilityAge === "Older adult") {
        params.set("eligibilityAgeMin", "65");
      } else if (currentEligibilityAge === "custom") {
        if (currentAgeRange?.min)
          params.set("eligibilityAgeMin", currentAgeRange.min);
        if (currentAgeRange?.max)
          params.set("eligibilityAgeMax", currentAgeRange.max);
      }
    }

    params.set("page", String(page));
    params.set("pageSize", "6");

    // Add location parameter
    const currentLocationMode = savedLocationMode || locationMode;
    const currentUserLocation = savedUserLocation || userLocation;
    const currentLocation = savedLocation || location;
    if (currentLocationMode === "current" && currentUserLocation) {
      if (currentUserLocation.country) {
        params.set("location", currentUserLocation.country);
      }
    } else if (currentLocationMode === "custom" && currentLocation?.trim()) {
      params.set("location", currentLocation.trim());
    }

    // Add user profile data for matching
    const currentUser = savedUser || user;
    if (currentUser?._id || currentUser?.id) {
      params.set("userId", currentUser._id || currentUser.id);
    } else if (
      (savedUseMedicalInterest || useMedicalInterest) &&
      (savedUserMedicalInterest || userMedicalInterest)
    ) {
      params.set("conditions", savedUserMedicalInterest || userMedicalInterest);
      if (currentLocationMode === "current" && currentUserLocation) {
        params.set("userLocation", JSON.stringify(currentUserLocation));
      } else if (currentLocationMode === "custom" && currentLocation?.trim()) {
        params.set(
          "userLocation",
          JSON.stringify({ country: currentLocation.trim() })
        );
      }
    }

    try {
      const response = await apiFetch(
        `/api/search/trials?${params.toString()}`
      );

      if (!response) {
        setLoading(false);
        return;
      }

      if (response.status === 429) {
        const errorData = await response.json();
        toast.error(
          errorData.error ||
            "You've used all your free searches! Sign in to continue searching.",
          { duration: 4000 }
        );
        setLoading(false);
        return;
      }

      const data = await response.json();
      const searchResults = data.results || [];

      // Set pagination data
      setTotalCount(data.totalCount || 0);
      const calculatedTotalPages = Math.ceil((data.totalCount || 0) / 6);
      setTotalPages(calculatedTotalPages);

      // Sort by matchPercentage in descending order (highest first)
      const sortedResults = sortTrialsByMatch(searchResults);
      setResults(sortedResults);

      // Save updated state to sessionStorage
      const searchState = {
        q: lastSearchQuery || "",
        status: savedStatus || status || "",
        location: currentLocation || "",
        locationMode: currentLocationMode || "global",
        useMedicalInterest:
          savedUseMedicalInterest || useMedicalInterest || false,
        userMedicalInterest:
          savedUserMedicalInterest || userMedicalInterest || "",
        results: sortedResults,
        currentPage: page,
        totalPages: calculatedTotalPages,
        totalCount: data.totalCount || 0,
        phase: savedPhase || phase,
        eligibilitySex: currentEligibilitySex,
        eligibilityAge: currentEligibilityAge,
        ageRange: currentAgeRange,
        lastSearchParams: {
          finalQuery: queryToUse,
          status: savedStatus || status,
          phase: savedPhase || phase,
          eligibilitySex: currentEligibilitySex,
          eligibilityAge: currentEligibilityAge,
          ageRange: currentAgeRange,
          locationMode: currentLocationMode,
          location: currentLocation,
          userLocation: currentUserLocation,
          useMedicalInterest: savedUseMedicalInterest || useMedicalInterest,
          userMedicalInterest: savedUserMedicalInterest || userMedicalInterest,
          user: currentUser,
        },
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "trials_search_state",
        JSON.stringify(searchState)
      );

      // Scroll to top of results
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Page navigation error:", error);
      toast.error("Failed to load page");
    } finally {
      setLoading(false);
    }
  }

  async function quickSearch(filterValue) {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    const isUserSignedIn = userData && token;

    // Check free searches for non-signed-in users (pre-check)
    if (!isUserSignedIn) {
      const canSearch = await checkAndUseSearch();
      if (!canSearch) {
        toast.error(
          "You've used all your free searches! Sign in to continue searching.",
          { duration: 4000 }
        );
        return;
      }
    }

    setQ(filterValue);
    setIsInitialLoad(false); // Mark initial load as complete when user performs quick search
    setLoading(true);
    setTimeout(() => {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const params = new URLSearchParams();
      const user = userData;

      // Combine user's medical interest with quick search if enabled
      let searchQuery = filterValue;
      if (useMedicalInterest && userMedicalInterest) {
        searchQuery = `${userMedicalInterest} ${filterValue}`;
      }

      params.set("q", searchQuery);

      // Reset pagination for new searches
      params.set("page", "1");
      params.set("pageSize", "6");
      setCurrentPage(1);
      setLastSearchQuery(searchQuery);

      // Store search parameters for pagination
      setLastSearchParams({
        finalQuery: searchQuery,
        status,
        phase,
        eligibilitySex,
        eligibilityAge,
        ageRange,
        locationMode,
        location,
        userLocation,
        useMedicalInterest,
        userMedicalInterest,
        user,
      });

      // Add location parameter (use only country)
      if (locationMode === "current" && userLocation) {
        // Use only country for location filtering
        if (userLocation.country) {
          params.set("location", userLocation.country);
        }
      } else if (locationMode === "custom" && location.trim()) {
        // For custom location, use as-is (user can enter country)
        params.set("location", location.trim());
      }

      // Add user profile data for matching
      if (user?._id || user?.id) {
        params.set("userId", user._id || user.id);
      } else if (useMedicalInterest && userMedicalInterest) {
        params.set("conditions", userMedicalInterest);
        if (locationMode === "current" && userLocation) {
          params.set("userLocation", JSON.stringify(userLocation));
        } else if (locationMode === "custom" && location.trim()) {
          params.set(
            "userLocation",
            JSON.stringify({ country: location.trim() })
          );
        }
      }

      apiFetch(`/api/search/trials?${params.toString()}`)
        .then(async (r) => {
          // Handle case where apiFetch returns undefined (401 redirect)
          if (!r) {
            setLoading(false);
            return;
          }

          // Handle rate limit (429)
          if (r.status === 429) {
            const errorData = await r.json();
            toast.error(
              errorData.error ||
                "You've used all your free searches! Sign in to continue searching.",
              { duration: 4000 }
            );
            setLoading(false);
            // Sync with backend to update local storage
            syncWithBackend()
              .then((result) => {
                // Update remaining searches indicator with synced value
                window.dispatchEvent(
                  new CustomEvent("freeSearchUsed", {
                    detail: { remaining: result.remaining },
                  })
                );
              })
              .catch(console.error);
            return;
          }
          return r.json();
        })
        .then((data) => {
          if (!data) return; // Skip if rate limited

          const searchResults = data.results || [];

          // Set pagination data
          setTotalCount(data.totalCount || 0);
          const calculatedTotalPages = Math.ceil((data.totalCount || 0) / 6);
          setTotalPages(calculatedTotalPages);

          // Handle remaining searches from server response
          if (!isUserSignedIn && data.remaining !== undefined) {
            // Update local storage to match backend (backend is source of truth)
            const remaining = data.remaining;
            const backendCount = MAX_FREE_SEARCHES - remaining;
            setLocalSearchCount(backendCount);

            if (remaining === 0) {
              toast(
                "You've used all your free searches! Sign in for unlimited searches.",
                { duration: 5000, icon: "🔒" }
              );
            } else {
              toast.success(
                `Search successful! ${remaining} free search${
                  remaining !== 1 ? "es" : ""
                } remaining.`,
                { duration: 3000 }
              );
            }
            // Update remaining searches indicator with the actual remaining count from backend
            window.dispatchEvent(
              new CustomEvent("freeSearchUsed", {
                detail: { remaining },
              })
            );
          }

          // Sort by matchPercentage in descending order (highest first)
          const sortedResults = sortTrialsByMatch(searchResults);
          setResults(sortedResults);

          // Save search state to sessionStorage (including pagination)
          const searchState = {
            q: filterValue,
            status: "",
            location,
            locationMode,
            useMedicalInterest,
            userMedicalInterest,
            results: sortedResults,
            currentPage: 1,
            totalPages: calculatedTotalPages,
            totalCount: data.totalCount || 0,
            lastSearchParams: {
              finalQuery: searchQuery,
              status: "",
              phase,
              eligibilitySex,
              eligibilityAge,
              ageRange,
              locationMode,
              location,
              userLocation,
              useMedicalInterest,
              userMedicalInterest,
              user: userData,
            },
            isInitialLoad: false,
          };
          sessionStorage.setItem(
            "trials_search_state",
            JSON.stringify(searchState)
          );

          setLoading(false);
        })
        .catch((error) => {
          console.error("Search error:", error);
          setResults([]);
          setLoading(false);
        });
    }, 100);
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item) => {
    return `trial-${item.id || item._id}`;
  };

  async function favorite(item) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    const favoriteKey = getFavoriteKey(item);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const itemId = item.id || item._id;
    const isFavorited = favorites.some(
      (fav) =>
        fav.type === "trial" &&
        (fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.title === item.title)
    );

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== "trial") return true;
        return !(
          fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.title === item.title
        );
      });
    } else {
      // Optimistically add to favorites
      optimisticFavorites = [
        ...favorites,
        {
          type: "trial",
          item: {
            ...item,
            id: itemId,
            _id: item._id || itemId,
          },
          _id: `temp-${Date.now()}`,
        },
      ];
    }

    // Update UI immediately
    setFavorites(optimisticFavorites);
    setFavoritingItems((prev) => new Set(prev).add(favoriteKey));

    try {
      if (isFavorited) {
        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }?type=trial&id=${encodeURIComponent(itemId)}`,
          { method: "DELETE" }
        );
        toast.success("Removed from favorites");
      } else {
        // Store complete item information
        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "trial",
            item: {
              ...item, // Store all item properties
              id: itemId,
              _id: item._id || itemId,
            },
          }),
        });
        toast.success("Added to favorites");
      }

      // Refresh favorites from backend
      const favResponse = await fetch(
        `${base}/api/favorites/${user._id || user.id}`
      );
      const favData = await favResponse.json();
      setFavorites(favData.items || []);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert optimistic update on error
      setFavorites(previousFavorites);
      toast.error("Failed to update favorites");
    } finally {
      // Remove from loading set
      setFavoritingItems((prev) => {
        const next = new Set(prev);
        next.delete(favoriteKey);
        return next;
      });
    }
  }

  // Load favorites on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?._id || user?.id) {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      fetch(`${base}/api/favorites/${user._id || user.id}`)
        .then((r) => r.json())
        .then((data) => setFavorites(data.items || []))
        .catch((err) => console.error("Error loading favorites:", err));
    }
  }, []);

  async function generateSummary(item) {
    // Determine if user is patient or researcher
    const isPatient = userProfile?.patient !== undefined;
    const isResearcher = userProfile?.researcher !== undefined;
    // Default to patient if profile not loaded (simplified view)
    const shouldSimplify = isPatient || (!isPatient && !isResearcher);

    const title = item.title || "Clinical Trial";
    const text = [
      item.title || "",
      item.status || "",
      item.phase || "",
      item.conditions?.join(", ") || "",
      item.description || "",
      item.eligibility?.criteria || "",
    ]
      .filter(Boolean)
      .join(" ");

    setSummaryModal({
      open: true,
      title,
      type: "trial",
      summary: "",
      loading: true,
    });

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type: "trial",
          simplify: shouldSimplify, // Simplify for patients, technical for researchers
          // Pass full trial object for structured summary (like Patient Dashboard)
          trial: item,
        }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary:
          res.summary ||
          (typeof res.summary === "object" && res.summary.structured
            ? res.summary
            : { structured: false, summary: "Summary unavailable" }),
        loading: false,
      }));
    } catch (e) {
      console.error("Summary generation error:", e);
      setSummaryModal((prev) => ({
        ...prev,
        summary: "Failed to generate summary. Please try again.",
        loading: false,
      }));
    }
  }

  // Mark trial as read
  async function markTrialAsRead(trial) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) return; // Only for signed-in users

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const itemId = trial.id || trial._id;
      if (!itemId) return;

      await fetch(`${base}/api/read/${user._id || user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "trial",
          itemId: itemId,
        }),
      });

      // Update the trial in results to mark as read
      setResults((prevResults) =>
        prevResults.map((t) =>
          (t.id || t._id) === itemId ? { ...t, isRead: true } : t
        )
      );
    } catch (error) {
      console.error("Error marking trial as read:", error);
    }
  }

  async function openDetailsModal(trial) {
    // Mark as read when modal opens
    if (isSignedIn) {
      markTrialAsRead(trial);
    }

    setDetailsModal({
      open: true,
      trial: trial, // Show basic info immediately
      loading: true,
      generatedMessage: "",
      generating: false,
      copied: false,
    });

    // Fetch detailed trial information with simplified details from backend
    if (trial.id || trial._id) {
      try {
        const nctId = trial.id || trial._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // Fetch simplified trial details
        const response = await fetch(
          `${base}/api/search/trial/${nctId}/simplified`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.trial) {
            // Merge detailed info with existing trial data
            // Preserve simplifiedTitle from card if it exists, otherwise use simplifiedDetails.title
            const mergedTrial = {
              ...trial,
              ...data.trial,
              // Keep the card's simplifiedTitle if it exists, otherwise use the one from simplifiedDetails
              simplifiedTitle:
                trial.simplifiedTitle ||
                data.trial.simplifiedDetails?.title ||
                data.trial.simplifiedTitle,
            };
            setDetailsModal({
              open: true,
              trial: mergedTrial,
              loading: false,
              generatedMessage: "",
              generating: false,
              copied: false,
            });
            return;
          }
        }

        // Fallback: try regular endpoint if simplified fails
        const fallbackResponse = await fetch(
          `${base}/api/search/trial/${nctId}`
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.trial) {
            // Preserve simplifiedTitle from card if it exists
            const mergedTrial = {
              ...trial,
              ...fallbackData.trial,
              simplifiedTitle:
                trial.simplifiedTitle || fallbackData.trial.simplifiedTitle,
            };
            setDetailsModal({
              open: true,
              trial: mergedTrial,
              loading: false,
              generatedMessage: "",
              generating: false,
              copied: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching detailed trial info:", error);
      }
    }

    // If fetch fails or no NCT ID, just use the trial we have
    setDetailsModal({
      open: true,
      trial: trial,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      trial: null,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  async function generateTrialDetailsMessage() {
    if (!detailsModal.trial) return;

    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in to generate a message");
      return;
    }

    setDetailsModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = userData?.username || userData?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: detailsModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();
      setDetailsModal((prev) => ({
        ...prev,
        generatedMessage: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message. Please try again.");
      setDetailsModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyTrialDetailsMessage() {
    if (detailsModal.generatedMessage) {
      navigator.clipboard.writeText(detailsModal.generatedMessage);
      setDetailsModal((prev) => ({ ...prev, copied: true }));
      toast.success("Message copied to clipboard!");
      setTimeout(() => {
        setDetailsModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  function openContactModal(trial) {
    setContactModal({
      open: true,
      trial,
      message: "",
      sent: false,
      generating: false,
    });
  }

  async function openContactInfoModal(trial) {
    setContactInfoModal({
      open: true,
      trial: trial, // Show basic info immediately
      loading: true,
      generatedMessage: "",
      generating: false,
      copied: false,
    });

    // Fetch detailed trial information from backend
    if (trial.id || trial._id) {
      try {
        const nctId = trial.id || trial._id;
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${base}/api/search/trial/${nctId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.trial) {
            // Merge detailed info with existing trial data
            setContactInfoModal({
              open: true,
              trial: { ...trial, ...data.trial },
              loading: false,
              generatedMessage: "",
              generating: false,
              copied: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching detailed trial info:", error);
      }
    }

    // If fetch fails or no NCT ID, just use the trial we have
    setContactInfoModal({
      open: true,
      trial: trial,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  function closeContactInfoModal() {
    setContactInfoModal({
      open: false,
      trial: null,
      loading: false,
      generatedMessage: "",
      generating: false,
      copied: false,
    });
  }

  async function generateContactMessage() {
    if (!contactInfoModal.trial) return;

    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in to generate a message");
      return;
    }

    setContactInfoModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = userData?.username || userData?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: contactInfoModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();
      setContactInfoModal((prev) => ({
        ...prev,
        generatedMessage: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message. Please try again.");
      setContactInfoModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyGeneratedMessage() {
    if (contactInfoModal.generatedMessage) {
      navigator.clipboard.writeText(contactInfoModal.generatedMessage);
      setContactInfoModal((prev) => ({ ...prev, copied: true }));
      toast.success("Message copied to clipboard!");
      setTimeout(() => {
        setContactInfoModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  function closeContactStepsModal() {
    setContactStepsModal({
      open: false,
      trial: null,
      currentStep: 1,
      generatedEmail: "",
      generating: false,
      copied: false,
    });
  }

  function nextStep() {
    setContactStepsModal((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4),
    }));
  }

  function prevStep() {
    setContactStepsModal((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }

  async function generateContactEmail() {
    if (!contactStepsModal.trial) return;

    // Check if user is signed in
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in to generate an email");
      return;
    }

    setContactStepsModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = userData?.username || userData?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: contactStepsModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate email");
      }

      const data = await response.json();
      setContactStepsModal((prev) => ({
        ...prev,
        generatedEmail: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating email:", error);
      toast.error("Failed to generate email. Please try again.");
      setContactStepsModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function copyGeneratedEmail() {
    if (contactStepsModal.generatedEmail) {
      navigator.clipboard.writeText(contactStepsModal.generatedEmail);
      setContactStepsModal((prev) => ({ ...prev, copied: true }));
      toast.success("Email copied to clipboard!");
      setTimeout(() => {
        setContactStepsModal((prev) => ({ ...prev, copied: false }));
      }, 2000);
    }
  }

  function openEmailClient() {
    if (!contactStepsModal.trial) return;
    const contact = contactStepsModal.trial.contacts?.[0];
    if (!contact?.email) {
      toast.error("No email address available");
      return;
    }

    const subject = encodeURIComponent(
      `Interest in Clinical Trial: ${contactStepsModal.trial.title}`
    );
    const body = encodeURIComponent(contactStepsModal.generatedEmail || "");
    window.open(
      `mailto:${contact.email}?subject=${subject}&body=${body}`,
      "_blank"
    );
  }

  async function generateMessage() {
    if (!contactModal.trial) return;

    // Check if user is signed in
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to generate a message");
      return;
    }

    setContactModal((prev) => ({ ...prev, generating: true }));

    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const userName = user?.username || user?.name || "User";
      const userLocationData = userLocation || null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation: userLocationData,
          trial: contactModal.trial,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();
      setContactModal((prev) => ({
        ...prev,
        message: data.message || "",
        generating: false,
      }));
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message. Please try again.");
      setContactModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function handleSendMessage() {
    if (!contactModal.message.trim()) return;
    toast.success("Message sent successfully!");
    setContactModal((prev) => ({ ...prev, sent: true, generating: false }));
    setTimeout(() => {
      setContactModal({
        open: false,
        trial: null,
        message: "",
        sent: false,
        generating: false,
      });
    }, 2000);
  }

  function openEmail(trial) {
    const subject = encodeURIComponent(
      `Interest in Clinical Trial: ${trial.title}`
    );
    const body = encodeURIComponent(
      `Dear Clinical Trial Team,\n\nI am interested in learning more about the clinical trial: ${trial.title}\n\nTrial ID: ${trial.id}\nStatus: ${trial.status}\n\nPlease provide more information about participation requirements and next steps.\n\nThank you.\n\nBest regards,`
    );
    const email = trial.contacts?.[0]?.email || "contact@clinicaltrials.gov";
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  }

  function getStatusColor(status) {
    const statusColors = {
      RECRUITING: "bg-green-100 text-green-800 border-green-200",
      NOT_YET_RECRUITING: "bg-blue-100 text-blue-800 border-blue-200",
      ACTIVE_NOT_RECRUITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
      SUSPENDED: "bg-yellow-100 text-yellow-800 border-yellow-200",
      TERMINATED: "bg-red-100 text-red-800 border-red-200",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  }

  // Restore search state from sessionStorage on mount (for all users, signed in or not)
  useEffect(() => {
    const savedState = sessionStorage.getItem("trials_search_state");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setQ(state.q || "");
        setStatus(state.status || "RECRUITING"); // Default to RECRUITING
        setLocation(state.location || "");
        setLocationMode(state.locationMode || "global");
        setUseMedicalInterest(
          state.useMedicalInterest !== undefined
            ? state.useMedicalInterest
            : true
        );
        setUserMedicalInterest(state.userMedicalInterest || "");
        // Sort results by match percentage when restoring from sessionStorage
        const restoredResults = state.results || [];
        setResults(sortTrialsByMatch(restoredResults));
        // Restore pagination state
        if (state.currentPage) setCurrentPage(state.currentPage);
        if (state.totalPages) setTotalPages(state.totalPages);
        if (state.totalCount) setTotalCount(state.totalCount);
        if (state.lastSearchParams) setLastSearchParams(state.lastSearchParams);
        if (state.phase) setPhase(state.phase);
        if (state.eligibilitySex) setEligibilitySex(state.eligibilitySex);
        if (state.eligibilityAge) setEligibilityAge(state.eligibilityAge);
        if (state.ageRange) setAgeRange(state.ageRange);
        setIsInitialLoad(
          state.isInitialLoad !== undefined ? state.isInitialLoad : false
        );
      } catch (error) {
        console.error("Error restoring search state:", error);
      }
    }
  }, []);

  // Listen for logout events and reset state
  useEffect(() => {
    const handleLogout = () => {
      // Reset all state to initial values
      setQ("");
      setStatus("");
      setLocation("");
      setLocationMode("global");
      setUseMedicalInterest(true);
      setUserMedicalInterest("");
      setResults([]);
      setIsInitialLoad(true);
      setIsSignedIn(false);
      setUserLocation(null);
      sessionStorage.removeItem("trials_search_state");
    };

    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // Check for guest info or URL parameters, then fetch user profile
  useEffect(() => {
    // Check URL parameters first (from Explore page search)
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get("q");
    const guestCondition = urlParams.get("guestCondition");
    const guestLocation = urlParams.get("guestLocation");

    // Check localStorage for guest info
    const guestInfo = localStorage.getItem("guest_user_info");
    let parsedGuestInfo = null;
    if (guestInfo) {
      try {
        parsedGuestInfo = JSON.parse(guestInfo);
      } catch (e) {
        console.error("Error parsing guest info:", e);
      }
    }

    // If URL has a query, set it
    if (urlQuery) {
      setQ(urlQuery);
    }

    async function fetchUserData() {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token");
      const isUserSignedIn = userData && token;

      setUser(userData && token ? userData : null);

      // Use guest info from URL params or localStorage (only if not signed in)
      if (!isUserSignedIn && (guestCondition || parsedGuestInfo?.condition)) {
        const condition = guestCondition || parsedGuestInfo?.condition;
        if (condition) {
          setUserMedicalInterest(condition);
          setUseMedicalInterest(true);
        }
      }

      if (!isUserSignedIn && (guestLocation || parsedGuestInfo?.location)) {
        const loc = guestLocation || parsedGuestInfo?.location;
        if (loc) {
          setLocation(loc);
          setLocationMode("custom");
        }
      }

      if (!userData?._id && !userData?.id) {
        // If guest has info and no saved state, use it
        if (
          (guestCondition || parsedGuestInfo?.condition) &&
          !sessionStorage.getItem("trials_search_state")
        ) {
          setUseMedicalInterest(true);
        } else {
          setUseMedicalInterest(false);
        }
        setIsSignedIn(false);
        // Don't auto-search - user must manually trigger search
        return;
      }

      setIsSignedIn(true);

      // Only set location mode if not restored from sessionStorage
      const savedState = sessionStorage.getItem("trials_search_state");
      if (!savedState) {
        setLocationMode("global"); // Set to global by default
      }

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        // Fetch profile for location and user type
        const response = await fetch(
          `${base}/api/profile/${userData._id || userData.id}`
        );
        const data = await response.json();
        if (data.profile) {
          setUserProfile(data.profile);
          const profileLocation =
            data.profile.patient?.location || data.profile.researcher?.location;
          if (
            profileLocation &&
            (profileLocation.city || profileLocation.country)
          ) {
            setUserLocation(profileLocation);
          }
        }

        // Get medical interests from user object
        if (
          userData.medicalInterests &&
          Array.isArray(userData.medicalInterests) &&
          userData.medicalInterests.length > 0
        ) {
          const medicalInterest = userData.medicalInterests[0]; // Use first medical interest
          setUserMedicalInterest(medicalInterest);
          // Don't auto-search - user must manually trigger search
        } else {
          setUseMedicalInterest(false);
          // Don't auto-search - user must manually trigger search
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUseMedicalInterest(false);
      }
    }

    fetchUserData();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          {/* Compact Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#2F3C96", "#474F97", "#757BB1", "#B8A5D5", "#D0C4E2"]}
              >
                Explore Clinical Trials
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Discover trials that match your needs
            </p>
            {/* Free Searches Indicator */}
            <div className="mt-3 flex justify-center items-center w-full">
              <FreeSearchesIndicator user={user} centered={true} />
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-lg p-5 mb-4 border border-slate-200 animate-fade-in">
            <BorderBeam
              duration={10}
              size={100}
              className="from-transparent via-[#2F3C96] to-transparent"
            />
            <BorderBeam
              duration={10}
              size={300}
              borderWidth={3}
              className="from-transparent via-[#D0C4E2] to-transparent"
            />
            <div className="flex flex-col gap-3">
              {/* Medical Interest Toggle */}
              {userMedicalInterest && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <input
                    type="checkbox"
                    id="useMedicalInterest"
                    checked={useMedicalInterest}
                    onChange={(e) => setUseMedicalInterest(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="useMedicalInterest"
                    className="text-xs text-slate-700 flex-1 cursor-pointer"
                  >
                    <span className="font-medium">
                      Using your medical interest:
                    </span>{" "}
                    <span className="text-indigo-700 font-semibold">
                      {userMedicalInterest}
                    </span>
                    {q && useMedicalInterest && (
                      <span className="text-slate-600 ml-1">
                        (search queries will be combined with "
                        {userMedicalInterest}")
                      </span>
                    )}
                  </label>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-2">
                <SmartSearchInput
                  value={q}
                  onChange={setQ}
                  onSubmit={handleKeywordSubmit}
                  placeholder="Add keywords to improve your search results..."
                  extraTerms={trialSuggestionTerms}
                  className="flex-1"
                />
                <CustomSelect
                  value={status}
                  onChange={(value) => setStatus(value)}
                  options={statusOptions}
                  placeholder="Select status..."
                  className="w-full sm:w-auto"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                  >
                    {showAdvancedSearch ? "Hide" : "Advanced"}
                  </Button>
                  <Button
                    onClick={handleSearch}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                  >
                    Search
                  </Button>
                </div>
              </div>

              {/* Keyword Chips Section */}
              <div className="flex flex-col gap-2">
                {searchKeywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                      Keywords ({searchKeywords.length}/{MIN_KEYWORDS_REQUIRED} min):
                    </span>
                    {searchKeywords.map((keyword, index) => (
                      <span
                        key={`${keyword}-${index}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium shadow-sm hover:shadow transition-all group"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${keyword}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={clearAllKeywords}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors underline underline-offset-2"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                {searchKeywords.length === 0 && (
                  <p className="text-xs text-slate-500 italic">
                    Add at least {MIN_KEYWORDS_REQUIRED} keywords to search. Press Enter after each keyword.
                  </p>
                )}
                {searchKeywords.length > 0 && searchKeywords.length < MIN_KEYWORDS_REQUIRED && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Add {MIN_KEYWORDS_REQUIRED - searchKeywords.length} more keyword{MIN_KEYWORDS_REQUIRED - searchKeywords.length !== 1 ? 's' : ''} to enable search
                  </p>
                )}
              </div>

              {/* Location Options */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-700">
                    Location:
                  </span>
                  <button
                    onClick={() => {
                      setLocationMode("global");
                      setLocation("");
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      locationMode === "global"
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Global
                  </button>
                  {userLocation && (
                    <button
                      onClick={() => {
                        setLocationMode("current");
                        setLocation("");
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                        locationMode === "current"
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      My Location
                      {userLocation.city || userLocation.country
                        ? ` (${[userLocation.city, userLocation.country]
                            .filter(Boolean)
                            .join(", ")})`
                        : ""}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setLocationMode("custom");
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      locationMode === "custom"
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {locationMode === "custom" && (
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && search()}
                    placeholder="Enter city, country, or region"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Advanced Search Modal */}
          <Modal
            isOpen={showAdvancedSearch}
            onClose={() => setShowAdvancedSearch(false)}
            title="Advanced Search"
          >
            <div className="space-y-6">
              {/* Eligibility Criteria Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-4">
                  Eligibility Criteria
                </h3>

                {/* Sex Filter */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Sex
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Female", "Male"].map((sex) => (
                      <button
                        key={sex}
                        onClick={() => setEligibilitySex(sex)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          eligibilitySex === sex
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {sex}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age Filter */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Age
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          label: "Child (birth - 17)",
                          value: "Child",
                        },
                        {
                          label: "Adult (18 - 64)",
                          value: "Adult",
                        },
                        {
                          label: "Older adult (65+)",
                          value: "Older adult",
                        },
                      ].map((age) => (
                        <button
                          key={age.value}
                          onClick={() => {
                            setEligibilityAge(age.value);
                            setAgeRange({ min: "", max: "" });
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            eligibilityAge === age.value
                              ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {age.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setEligibilityAge("custom");
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          eligibilityAge === "custom"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Manually enter range
                      </button>
                    </div>

                    {/* Manual Age Range Input */}
                    {eligibilityAge === "custom" && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          value={ageRange.min}
                          onChange={(e) =>
                            setAgeRange({ ...ageRange, min: e.target.value })
                          }
                          placeholder="Min age"
                          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="text-slate-600">-</span>
                        <input
                          type="number"
                          value={ageRange.max}
                          onChange={(e) =>
                            setAgeRange({ ...ageRange, max: e.target.value })
                          }
                          placeholder="Max age"
                          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Phase Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Phase
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Phase I", value: "PHASE1" },
                    { label: "Phase II", value: "PHASE2" },
                    { label: "Phase III", value: "PHASE3" },
                    { label: "Phase IV", value: "PHASE4" },
                  ].map((phaseOption) => (
                    <button
                      key={phaseOption.value}
                      onClick={() =>
                        setPhase(
                          phase === phaseOption.value ? "" : phaseOption.value
                        )
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        phase === phaseOption.value
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {phaseOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Terms */}
              <div>
                <label className="flex text-xs font-medium text-slate-700 mb-2 items-center gap-2">
                  Other terms
                  <Tooltip content="In the search feature, the Other terms field is used to narrow a search. For example, you may enter the name of a drug or the NCT number of a clinical study to limit the search to study records that contain these words." />
                </label>
                <input
                  type="text"
                  value={otherTerms}
                  onChange={(e) => setOtherTerms(e.target.value)}
                  placeholder="Enter drug name, NCT number, etc."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Intervention/Treatment */}
              <div>
                <label className="flex text-xs font-medium text-slate-700 mb-2 items-center gap-2">
                  Intervention/treatment
                  <Tooltip content="A process or action that is the focus of a clinical study. Interventions include drugs, medical devices, procedures, vaccines, and other products that are either investigational or already available. Interventions can also include noninvasive approaches, such as education or modifying diet and exercise." />
                </label>
                <input
                  type="text"
                  value={intervention}
                  onChange={(e) => setIntervention(e.target.value)}
                  placeholder="Enter intervention or treatment name"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t border-slate-200">
                <Button
                  onClick={() => {
                    search();
                    setShowAdvancedSearch(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg text-sm font-medium"
                >
                  Search
                </Button>
                <Button
                  onClick={() => {
                    setEligibilitySex("All");
                    setEligibilityAge("");
                    setAgeRange({ min: "", max: "" });
                    setPhase("");
                    setOtherTerms("");
                    setIntervention("");
                  }}
                  className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Clear
                </Button>
              </div>
            </div>
          </Modal>

          {/* Skeleton Loaders */}
          {loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-md border border-slate-200 animate-pulse"
                >
                  <div className="p-5">
                    {/* Header Skeleton */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-6 w-24 bg-indigo-200 rounded-full"></div>
                      <div className="h-6 w-28 bg-slate-200 rounded-full"></div>
                    </div>

                    {/* Title Skeleton */}
                    <div className="mb-3 space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-full"></div>
                      <div className="h-5 bg-slate-200 rounded w-4/5"></div>
                    </div>

                    {/* Info Skeleton */}
                    <div className="space-y-2 mb-3">
                      <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                      <div className="h-4 bg-indigo-100 rounded w-1/2"></div>
                    </div>

                    {/* Description Button Skeleton */}
                    <div className="mb-3">
                      <div className="h-12 bg-indigo-50 rounded-lg"></div>
                    </div>

                    {/* Buttons Skeleton */}
                    <div className="flex gap-2 mt-4">
                      <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                    </div>

                    {/* Contact Buttons Skeleton */}
                    <div className="flex gap-2 mt-3">
                      <div className="flex-1 h-8 bg-indigo-100 rounded-lg"></div>
                      <div className="flex-1 h-8 bg-slate-100 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results
                .slice(0, isSignedIn ? results.length : 6)
                .map((trial, cardIdx) => {
                  const itemId = trial.id || trial._id;
                  return (
                    <div
                      key={itemId}
                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full animate-fade-in"
                      style={{
                        borderColor: trial.isRead
                          ? "rgba(147, 51, 234, 0.4)" // Purple for read
                          : "rgba(59, 130, 246, 0.4)", // Blue for unread
                        animationDelay: `${cardIdx * 50}ms`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                        e.currentTarget.style.borderColor = trial.isRead
                          ? "rgba(147, 51, 234, 0.6)" // Darker purple on hover
                          : "rgba(59, 130, 246, 0.6)"; // Darker blue on hover
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                        e.currentTarget.style.borderColor = trial.isRead
                          ? "rgba(147, 51, 234, 0.4)" // Purple for read
                          : "rgba(59, 130, 246, 0.4)"; // Blue for unread
                      }}
                    >
                      <div className="p-5 flex flex-col flex-grow">
                        {/* Match Progress Bar */}
                        {trial.matchPercentage !== undefined && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <TrendingUp
                                  className="w-4 h-4"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span
                                  className="text-sm font-bold"
                                  style={{ color: "#2F3C96" }}
                                >
                                  {trial.matchPercentage}% Match
                                </span>
                                {/* Info Icon with Tooltip */}
                                <div className="relative group">
                                  <Info
                                    className="w-4 h-4 cursor-help transition-opacity hover:opacity-70"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  {/* Tooltip */}
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                    <div className="font-semibold mb-1">Match Relevance</div>
                                    <div className="text-gray-300 leading-relaxed">
                                      {trial.matchExplanation || 
                                        `This trial matches ${trial.matchPercentage}% based on your profile, medical conditions, location, and eligibility criteria. The match considers factors like your medical interests, location proximity, age, gender, and trial requirements.`}
                                    </div>
                                    {/* Tooltip arrow */}
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                              {trial.status && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                    trial.status
                                  )}`}
                                >
                                  {trial.status.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                            {/* Progress Bar */}
                            <div
                              className="w-full h-2.5 rounded-full overflow-hidden"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.3)",
                              }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${trial.matchPercentage}%`,
                                  background:
                                    "linear-gradient(90deg, #2F3C96, #253075)",
                                }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Trial Title */}
                        <div className="mb-4">
                          <h3
                            className="text-lg font-bold mb-0 line-clamp-3 leading-snug flex items-start gap-2"
                            style={{
                              color: trial.isRead
                                ? "#D0C4E2" // Light purple for read
                                : "#2F3C96", // Default blue for unread
                            }}
                          >
                            {trial.isRead && (
                              <CheckCircle
                                className="w-4 h-4 mt-1 shrink-0"
                                style={{ color: "#D0C4E2" }}
                              />
                            )}
                            <span className="flex-1">
                              {trial.simplifiedTitle ||
                                trial.title ||
                                "Untitled Trial"}
                            </span>
                          </h3>
                        </div>

                        {/* Description/Details Preview */}
                        {(trial.description || trial.conditionDescription) && (
                          <div className="mb-4 flex-grow">
                            <button
                              onClick={() => openDetailsModal(trial)}
                              className="w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 border group"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                borderColor: "rgba(47, 60, 150, 0.2)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.3)";
                                e.currentTarget.style.borderColor =
                                  "rgba(47, 60, 150, 0.3)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.2)";
                                e.currentTarget.style.borderColor =
                                  "rgba(47, 60, 150, 0.2)";
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <Info
                                  className="w-4 h-4 mt-0.5 shrink-0 transition-colors duration-200"
                                  style={{ color: "#2F3C96" }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="transition-colors duration-200"
                                    style={{ color: "#787878" }}
                                  >
                                    <span className="line-clamp-2">
                                      {trial.description ||
                                        trial.conditionDescription ||
                                        "View details for more information"}
                                    </span>
                                  </div>
                                  <div
                                    className="mt-1.5 flex items-center gap-1 font-medium transition-all duration-200"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    <span>Read more details</span>
                                    <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-200">
                                      →
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        )}

                        {/* Spacer for trials without description */}
                        {!trial.description && !trial.conditionDescription && (
                          <div className="flex-grow"></div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => generateSummary(trial)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                            style={{
                              background:
                                "linear-gradient(135deg, #2F3C96, #253075)",
                            }}
                            onMouseEnter={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.background =
                                  "linear-gradient(135deg, #253075, #1C2454)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.background =
                                  "linear-gradient(135deg, #2F3C96, #253075)";
                              }
                            }}
                          >
                            <Sparkles className="w-4 h-4" />
                            Understand this trial
                          </button>
                          <button
                            onClick={() => favorite(trial)}
                            disabled={favoritingItems.has(
                              getFavoriteKey(trial)
                            )}
                            className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              favorites.some(
                                (fav) =>
                                  fav.type === "trial" &&
                                  (fav.item?.id === itemId ||
                                    fav.item?._id === itemId)
                              )
                                ? "bg-red-50 border-red-200 text-red-500"
                                : ""
                            }`}
                            style={
                              !favorites.some(
                                (fav) =>
                                  fav.type === "trial" &&
                                  (fav.item?.id === itemId ||
                                    fav.item?._id === itemId)
                              )
                                ? {
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                    color: "#787878",
                                  }
                                : {}
                            }
                            onMouseEnter={(e) => {
                              if (
                                !favorites.some(
                                  (fav) =>
                                    fav.type === "trial" &&
                                    (fav.item?.id === itemId ||
                                      fav.item?._id === itemId)
                                ) &&
                                !e.currentTarget.disabled
                              ) {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.3)";
                                e.currentTarget.style.color = "#dc2626";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (
                                !favorites.some(
                                  (fav) =>
                                    fav.type === "trial" &&
                                    (fav.item?.id === itemId ||
                                      fav.item?._id === itemId)
                                )
                              ) {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.2)";
                                e.currentTarget.style.color = "#787878";
                              }
                            }}
                          >
                            {favoritingItems.has(getFavoriteKey(trial)) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Heart
                                className={`w-4 h-4 ${
                                  favorites.some(
                                    (fav) =>
                                      fav.type === "trial" &&
                                      (fav.item?.id === itemId ||
                                        fav.item?._id === itemId)
                                  )
                                    ? "fill-current"
                                    : ""
                                }`}
                              />
                            )}
                          </button>
                        </div>

                        {/* View Contact Information Button */}
                        <button
                          onClick={() => openContactInfoModal(trial)}
                          className="flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors mt-3 w-full"
                          style={{
                            color: "#2F3C96",
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor =
                              "rgba(208, 196, 226, 0.3)";
                            e.target.style.color = "#253075";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor =
                              "rgba(208, 196, 226, 0.2)";
                            e.target.style.color = "#2F3C96";
                          }}
                        >
                          <Info className="w-3.5 h-3.5" />
                          View Contact Information
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Results Count and Pagination */}
          {!loading && results.length > 0 && isSignedIn && (
            <div className="mt-6 flex flex-col items-center gap-4">
              {/* Results Count */}
              <div className="text-sm text-slate-600">
                Page{" "}
                <span className="font-semibold text-indigo-700">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-indigo-700">
                  {totalPages.toLocaleString()}
                </span>{" "}
                ({totalCount.toLocaleString()} total results)
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          currentPage === pageNum
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                            : "bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-indigo-700">...</span>
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={loading}
                        className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="px-4 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sign Up Message for More Results */}
          {!loading &&
            results.length > 0 &&
            !isSignedIn &&
            results.length > 6 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6 text-center shadow-lg"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-indigo-900">
                      Want to see more trials?
                    </h3>
                  </div>
                  <p className="text-sm text-indigo-700 max-w-md">
                    Sign up for free to view all {results.length} matching
                    trials and get personalized recommendations based on your
                    medical interests.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => navigate("/signin")}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => navigate("/onboard/patient")}
                      className="px-6 py-2.5 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-all border-2 border-indigo-200 hover:border-indigo-300"
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          {/* Empty State */}
          {!loading && results.length === 0 && !isInitialLoad && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <Beaker className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                No Clinical Trials Found
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Try adjusting your search criteria or browse different
                categories.
              </p>
            </div>
          )}

          {/* Initial State - Not Signed In */}
          {!loading && results.length === 0 && isInitialLoad && !isSignedIn && (
            <div className="text-center py-16 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <Beaker className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                Search to Get Started
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                Sign in to store your personalized info and get personalized
                search results based on your medical interests.
              </p>
              <button
                onClick={() => navigate("/signin")}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Summary Modal */}
        <Modal
          isOpen={summaryModal.open}
          onClose={() =>
            setSummaryModal({
              open: false,
              title: "",
              type: "",
              summary: "",
              loading: false,
            })
          }
          title="Key Insights"
        >
          <div className="space-y-4">
            <div
              className="pb-4 border-b"
              style={{ borderColor: "rgba(208, 196, 226, 0.5)" }}
            >
              <div className="mb-2">
                <h4 className="font-bold text-lg" style={{ color: "#2F3C96" }}>
                  {summaryModal.title}
                </h4>
              </div>
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(232, 224, 239, 0.8)",
                  color: "#2F3C96",
                }}
              >
                Clinical Trial
              </span>
            </div>
            {summaryModal.loading ? (
              <div className="space-y-4 py-4">
                <div
                  className="flex items-center gap-2 mb-4"
                  style={{ color: "#2F3C96" }}
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">
                    Preparing structured insights…
                  </span>
                </div>
                <div className="animate-pulse space-y-3">
                  <div
                    className="h-4 rounded"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-5/6"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-4/6"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-full mt-2"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-5/6"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                  <div
                    className="h-4 rounded w-3/4"
                    style={{ backgroundColor: "rgba(232, 224, 239, 0.5)" }}
                  ></div>
                </div>
              </div>
            ) : summaryModal.type === "trial" &&
              summaryModal.summary &&
              typeof summaryModal.summary === "object" &&
              summaryModal.summary.structured ? (
              // Structured Trial Summary (like Patient Dashboard)
              <div className="space-y-4">
                {/* General Summary */}
                {summaryModal.summary.generalSummary && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#2F3C96" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <Info
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          Overview
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.generalSummary}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What Happens (Procedures, Schedule, Treatments) */}
                {summaryModal.summary.procedures && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-100">
                        <Activity className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold bg-green-500">
                            1
                          </span>
                          What Happens (Procedures, Schedule, Treatments)
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.procedures}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Potential Risks and Benefits */}
                {summaryModal.summary.risksBenefits && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-100">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold bg-amber-500">
                            2
                          </span>
                          Potential Risks and Benefits
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.risksBenefits}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What Participants Need to Do */}
                {summaryModal.summary.participantRequirements && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-purple-100">
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold bg-purple-500">
                            3
                          </span>
                          What Participants Need to Do
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.participantRequirements}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Fallback for non-structured summaries (old format)
              <div className="py-2">
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#787878" }}
                >
                  {typeof summaryModal.summary === "object"
                    ? summaryModal.summary.summary || "Summary unavailable"
                    : summaryModal.summary || "Summary unavailable"}
                </p>
              </div>
            )}
          </div>
        </Modal>

        {/* Details Modal */}
        <Modal
          isOpen={detailsModal.open}
          onClose={closeDetailsModal}
          title="Clinical Trial Details"
        >
          {detailsModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "#2F3C96" }}
              />
              <span className="ml-3 text-sm" style={{ color: "#787878" }}>
                Loading detailed trial information...
              </span>
            </div>
          ) : detailsModal.trial ? (
            <div className="flex flex-col h-full -mx-6 -my-6">
              <div className="space-y-6 flex-1 overflow-y-auto px-6 pt-6 pb-24">
                {/* Header */}
                <div
                  className="pb-4 border-b sticky top-0 bg-white z-10 -mt-6 pt-6 -mx-6 px-6"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Beaker className="w-5 h-5" style={{ color: "#2F3C96" }} />
                    <h4
                      className="font-bold text-lg"
                      style={{ color: "#2F3C96" }}
                    >
                      {detailsModal.trial.simplifiedTitle ||
                        detailsModal.trial.simplifiedDetails?.title ||
                        detailsModal.trial.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "rgba(209, 211, 229, 1)",
                        color: "#253075",
                        borderColor: "rgba(163, 167, 203, 1)",
                      }}
                    >
                      {detailsModal.trial._id || detailsModal.trial.id || "N/A"}
                    </span>
                    {detailsModal.trial.status && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          detailsModal.trial.status
                        )}`}
                      >
                        {detailsModal.trial.status.replace(/_/g, " ")}
                      </span>
                    )}
                    {detailsModal.trial.phase && (
                      <span
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border"
                        style={{
                          backgroundColor: "#F5F5F5",
                          color: "#787878",
                          borderColor: "rgba(232, 232, 232, 1)",
                        }}
                      >
                        Phase {detailsModal.trial.phase}
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Study Purpose */}
                {(detailsModal.trial.simplifiedDetails?.studyPurpose ||
                  detailsModal.trial.description ||
                  detailsModal.trial.conditionDescription) && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 mt-10 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232, 233, 242, 1), rgba(245, 242, 248, 1))",
                      borderColor: "rgba(163, 167, 203, 1)",
                    }}
                  >
                    <h4
                      className="font-bold mb-3 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <FileText
                        className="w-5 h-5"
                        style={{ color: "#2F3C96" }}
                      />
                      Study Purpose
                    </h4>
                    <p
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ color: "#787878" }}
                    >
                      {detailsModal.trial.simplifiedDetails?.studyPurpose ||
                        detailsModal.trial.description ||
                        detailsModal.trial.conditionDescription}
                    </p>
                  </div>
                )}

                {/* 2. Who Can Join (Eligibility) */}
                {(detailsModal.trial.simplifiedDetails?.eligibilityCriteria ||
                  detailsModal.trial.eligibility) && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(245, 242, 248, 1), rgba(232, 224, 239, 1))",
                      borderColor: "#D0C4E2",
                    }}
                  >
                    <h4
                      className="font-bold mb-4 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <ListChecks
                        className="w-5 h-5"
                        style={{ color: "#2F3C96" }}
                      />
                      Who Can Join (Eligibility)
                    </h4>

                    {/* Show simplified summary if available */}
                    {detailsModal.trial.simplifiedDetails?.eligibilityCriteria
                      ?.summary && (
                      <div
                        className="bg-white rounded-lg p-4 border mb-4"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {
                            detailsModal.trial.simplifiedDetails
                              .eligibilityCriteria.summary
                          }
                        </p>
                      </div>
                    )}

                    {/* Quick Eligibility Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {/* Gender */}
                      <div
                        className="bg-white rounded-lg p-3 border shadow-sm"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Users
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Gender
                          </span>
                        </div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {detailsModal.trial.simplifiedDetails
                            ?.eligibilityCriteria?.gender ||
                            detailsModal.trial.eligibility?.gender ||
                            "All"}
                        </p>
                      </div>

                      {/* Age Range */}
                      <div
                        className="bg-white rounded-lg p-3 border shadow-sm"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Age Range
                          </span>
                        </div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {detailsModal.trial.simplifiedDetails
                            ?.eligibilityCriteria?.ageRange ||
                            (detailsModal.trial.eligibility?.minimumAge !==
                              "Not specified" &&
                            detailsModal.trial.eligibility?.minimumAge
                              ? detailsModal.trial.eligibility.minimumAge
                              : "N/A") +
                              " - " +
                              (detailsModal.trial.eligibility?.maximumAge !==
                                "Not specified" &&
                              detailsModal.trial.eligibility?.maximumAge
                                ? detailsModal.trial.eligibility.maximumAge
                                : "N/A")}
                        </p>
                      </div>

                      {/* Healthy Volunteers */}
                      <div
                        className="bg-white rounded-lg p-3 border shadow-sm"
                        style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: "#787878" }}
                          >
                            Volunteers
                          </span>
                        </div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "#2F3C96" }}
                        >
                          {detailsModal.trial.simplifiedDetails
                            ?.eligibilityCriteria?.volunteers ||
                            detailsModal.trial.eligibility?.healthyVolunteers ||
                            "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Eligibility Criteria - Show simplified if available */}
                    {(detailsModal.trial.simplifiedDetails?.eligibilityCriteria
                      ?.detailedCriteria ||
                      (detailsModal.trial.eligibility?.criteria &&
                        detailsModal.trial.eligibility.criteria !==
                          "Not specified")) && (
                      <div
                        className="mt-4 pt-4 border-t"
                        style={{ borderColor: "#D0C4E2" }}
                      >
                        <h5
                          className="font-semibold mb-3 flex items-center gap-2 text-sm"
                          style={{ color: "#2F3C96" }}
                        >
                          <Info
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          Detailed Eligibility Criteria
                        </h5>
                        <div
                          className="bg-white rounded-lg p-4 border"
                          style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                        >
                          <p
                            className="text-sm leading-relaxed whitespace-pre-line"
                            style={{ color: "#787878" }}
                          >
                            {detailsModal.trial.simplifiedDetails
                              ?.eligibilityCriteria?.detailedCriteria ||
                              detailsModal.trial.eligibility.criteria}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Study Population Description */}
                    {detailsModal.trial.eligibility?.population && (
                      <div
                        className="mt-4 pt-4 border-t"
                        style={{ borderColor: "#D0C4E2" }}
                      >
                        <h5
                          className="font-semibold mb-3 flex items-center gap-2 text-sm"
                          style={{ color: "#2F3C96" }}
                        >
                          <Users
                            className="w-4 h-4"
                            style={{ color: "#2F3C96" }}
                          />
                          Study Population
                        </h5>
                        <div
                          className="bg-white rounded-lg p-4 border"
                          style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                        >
                          <p
                            className="text-sm leading-relaxed whitespace-pre-line"
                            style={{ color: "#787878" }}
                          >
                            {detailsModal.trial.eligibility.population}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Conditions Studied - Show simplified if available */}
                {(detailsModal.trial.simplifiedDetails?.conditionsStudied ||
                  (detailsModal.trial.conditions &&
                    detailsModal.trial.conditions.length > 0)) && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232, 233, 242, 1), rgba(245, 242, 248, 1))",
                      borderColor: "rgba(163, 167, 203, 1)",
                    }}
                  >
                    <h4
                      className="font-bold mb-3 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <Activity
                        className="w-5 h-5"
                        style={{ color: "#2F3C96" }}
                      />
                      Conditions Studied
                    </h4>
                    {detailsModal.trial.simplifiedDetails?.conditionsStudied ? (
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {detailsModal.trial.simplifiedDetails.conditionsStudied}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detailsModal.trial.conditions.map((condition, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border"
                            style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* What to Expect - Show if simplified details available */}
                {detailsModal.trial.simplifiedDetails?.whatToExpect && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(245, 242, 248, 1), rgba(232, 224, 239, 1))",
                      borderColor: "#D0C4E2",
                    }}
                  >
                    <h4
                      className="font-bold mb-3 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <Info className="w-5 h-5" style={{ color: "#2F3C96" }} />
                      What to Expect
                    </h4>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      {detailsModal.trial.simplifiedDetails.whatToExpect}
                    </p>
                  </div>
                )}

                {/* 3. Contact Information */}
                {detailsModal.trial.contacts?.length > 0 && (
                  <div
                    className="bg-gradient-to-br rounded-xl p-5 border shadow-sm"
                    style={{
                      background: "linear-gradient(135deg, #F5F5F5, #F5F5F5)",
                      borderColor: "rgba(232, 232, 232, 1)",
                    }}
                  >
                    <h4
                      className="font-bold mb-4 flex items-center gap-2 text-base"
                      style={{ color: "#2F3C96" }}
                    >
                      <Mail className="w-5 h-5" style={{ color: "#787878" }} />
                      Contact Information
                    </h4>
                    <div className="space-y-3">
                      {detailsModal.trial.contacts.map((contact, i) => (
                        <div
                          key={i}
                          className="bg-white rounded-lg p-4 border shadow-sm"
                          style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                        >
                          {contact.name && (
                            <div
                              className="font-bold mb-3 text-base flex items-center gap-2"
                              style={{ color: "#2F3C96" }}
                            >
                              <User
                                className="w-4 h-4"
                                style={{ color: "#787878" }}
                              />
                              {contact.name}
                            </div>
                          )}
                          <div className="space-y-2">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center gap-2 text-sm font-medium transition-colors"
                                style={{ color: "#2F3C96" }}
                                onMouseEnter={(e) =>
                                  (e.target.style.color = "#253075")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.color = "#2F3C96")
                                }
                              >
                                <Mail className="w-4 h-4" />
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <div
                                className="flex items-center gap-2 text-sm"
                                style={{ color: "#787878" }}
                              >
                                <span style={{ color: "#2F3C96" }}>📞</span>
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="transition-colors"
                                  style={{ color: "#787878" }}
                                  onMouseEnter={(e) =>
                                    (e.target.style.color = "#2F3C96")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.target.style.color = "#787878")
                                  }
                                >
                                  {contact.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Message Section */}
                {detailsModal.generatedMessage && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-indigo-900">
                        Generated Message
                      </label>
                      <button
                        onClick={copyTrialDetailsMessage}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all"
                      >
                        {detailsModal.copied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {detailsModal.generatedMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* How to Contact Trial Moderator button */}
                {detailsModal.trial.contacts?.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setContactStepsModal({
                          open: true,
                          trial: detailsModal.trial,
                          currentStep: 1,
                          generatedEmail: "",
                          generating: false,
                          copied: false,
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all w-full"
                      style={{
                        color: "#2F3C96",
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        border: "1px solid rgba(208, 196, 226, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor =
                          "rgba(208, 196, 226, 0.3)";
                        e.target.style.color = "#253075";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor =
                          "rgba(208, 196, 226, 0.2)";
                        e.target.style.color = "#2F3C96";
                      }}
                    >
                      <Info className="w-4 h-4" />
                      How to Contact Trial Moderator
                    </button>
                  </div>
                )}

                {/* Additional Information */}
                <div
                  className="space-y-4 pt-4 border-t"
                  style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                >
                  {/* Conditions */}
                  {detailsModal.trial.conditions?.length > 0 && (
                    <div
                      className="rounded-xl p-4 border"
                      style={{
                        backgroundColor: "rgba(245, 242, 248, 1)",
                        borderColor: "#D0C4E2",
                      }}
                    >
                      <h4
                        className="font-bold mb-3 flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <Activity
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                        Conditions Studied
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {detailsModal.trial.conditions.map((condition, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border shadow-sm"
                            style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {detailsModal.trial.locations &&
                  detailsModal.trial.locations.length > 0 ? (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <h4
                        className="font-bold mb-3 flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <MapPin className="w-4 h-4 text-green-600" />
                        Trial Locations ({detailsModal.trial.locations.length})
                      </h4>
                      <div className="space-y-2">
                        {detailsModal.trial.locations
                          .slice(0, 3)
                          .map((loc, idx) => (
                            <div
                              key={idx}
                              className="text-sm"
                              style={{ color: "#787878" }}
                            >
                              {loc.facility && (
                                <span
                                  className="font-semibold"
                                  style={{ color: "#2F3C96" }}
                                >
                                  {loc.facility}:{" "}
                                </span>
                              )}
                              {loc.fullAddress || loc.address}
                            </div>
                          ))}
                        {detailsModal.trial.locations.length > 3 && (
                          <div
                            className="text-xs italic"
                            style={{ color: "#787878" }}
                          >
                            + {detailsModal.trial.locations.length - 3} more
                            location(s)
                          </div>
                        )}
                      </div>
                    </div>
                  ) : detailsModal.trial.location &&
                    detailsModal.trial.location !== "Not specified" ? (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <h4
                        className="font-bold mb-3 flex items-center gap-2 text-sm"
                        style={{ color: "#2F3C96" }}
                      >
                        <MapPin className="w-4 h-4 text-green-600" />
                        Trial Locations
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {detailsModal.trial.location}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Sticky Footer with Actions */}
              <div
                className="bottom-0 px-6 pb-6 pt-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const nctId =
                        detailsModal.trial?.id || detailsModal.trial?._id;
                      if (nctId) {
                        closeDetailsModal();
                        navigate(`/trial/${nctId}`);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all w-full"
                    style={{
                      color: "#FFFFFF",
                      backgroundColor: "#2F3C96",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#253075";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2F3C96";
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Trial
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Contact Information Modal */}
        <Modal
          isOpen={contactInfoModal.open}
          onClose={closeContactInfoModal}
          title="Contact Information"
        >
          <div className="space-y-4">
            {contactInfoModal.loading ? (
              <div className="text-center py-8">
                <Loader2
                  className="w-8 h-8 animate-spin mx-auto mb-4"
                  style={{ color: "#2F3C96" }}
                />
                <p className="text-sm" style={{ color: "#787878" }}>
                  Loading contact information...
                </p>
              </div>
            ) : contactInfoModal.trial ? (
              <>
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-slate-900 text-lg">
                      {contactInfoModal.trial?.title || "Trial"}
                    </h4>
                  </div>
                </div>

                {contactInfoModal.trial.contacts &&
                contactInfoModal.trial.contacts.length > 0 ? (
                  <div className="space-y-4">
                    {contactInfoModal.trial.contacts.map((contact, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg p-4 border"
                        style={{ borderColor: "rgba(232, 232, 232, 1)" }}
                      >
                        {contact.name && (
                          <div
                            className="font-bold mb-3 text-base flex items-center gap-2"
                            style={{ color: "#2F3C96" }}
                          >
                            <User
                              className="w-4 h-4"
                              style={{ color: "#787878" }}
                            />
                            {contact.name}
                          </div>
                        )}
                        <div className="space-y-2">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-2 text-sm font-medium transition-colors"
                              style={{ color: "#2F3C96" }}
                              onMouseEnter={(e) =>
                                (e.target.style.color = "#253075")
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.color = "#2F3C96")
                              }
                            >
                              <Mail className="w-4 h-4" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              style={{ color: "#787878" }}
                            >
                              <Phone
                                className="w-4 h-4"
                                style={{ color: "#2F3C96" }}
                              />
                              <a
                                href={`tel:${contact.phone}`}
                                className="transition-colors"
                                style={{ color: "#787878" }}
                                onMouseEnter={(e) =>
                                  (e.target.style.color = "#2F3C96")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.color = "#787878")
                                }
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600">
                      No contact information available for this trial.
                    </p>
                  </div>
                )}

                {/* Generated Message Section */}
                {contactInfoModal.generatedMessage && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-indigo-900">
                        Generated Message
                      </label>
                      <button
                        onClick={copyGeneratedMessage}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all"
                      >
                        {contactInfoModal.copied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {contactInfoModal.generatedMessage}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setContactStepsModal({
                        open: true,
                        trial: contactInfoModal.trial,
                        currentStep: 1,
                        generatedEmail: "",
                        generating: false,
                        copied: false,
                      });
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all"
                    style={{
                      color: "#2F3C96",
                      backgroundColor: "rgba(208, 196, 226, 0.2)",
                      border: "1px solid rgba(208, 196, 226, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(208, 196, 226, 0.3)";
                      e.target.style.color = "#253075";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(208, 196, 226, 0.2)";
                      e.target.style.color = "#2F3C96";
                    }}
                  >
                    <Info className="w-4 h-4" />
                    How to Contact Trial Moderator
                  </button>
                  <button
                    onClick={closeContactInfoModal}
                    className="flex-1 px-6 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </Modal>

        {/* Contact Moderator Modal */}
        <Modal
          isOpen={contactModal.open}
          onClose={() => {
            if (!contactModal.sent) {
              setContactModal({
                open: false,
                trial: null,
                message: "",
                sent: false,
                generating: false,
              });
            }
          }}
          title="Contact Moderator"
        >
          <div className="space-y-4">
            {contactModal.sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">
                  Message Sent!
                </h3>
                <p className="text-gray-600">
                  Your message has been sent to the moderator. They will get
                  back to you soon.
                </p>
              </div>
            ) : (
              <>
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Beaker className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-lg">
                      {contactModal.trial?.title || "Trial"}
                    </h4>
                  </div>
                  <p className="text-sm text-slate-600">
                    Trial ID: {contactModal.trial?.id || "N/A"}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Your Message
                    </label>
                    {isSignedIn && (
                      <button
                        onClick={generateMessage}
                        disabled={contactModal.generating}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {contactModal.generating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Generate Message
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={contactModal.message}
                    onChange={(e) =>
                      setContactModal({
                        ...contactModal,
                        message: e.target.value,
                      })
                    }
                    placeholder={
                      isSignedIn
                        ? "Write your message to the moderator here... or click 'Generate Message' to create one automatically"
                        : "Write your message to the moderator here... (Sign in to use AI message generation)"
                    }
                    rows="6"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!contactModal.message.trim()}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 inline mr-2" />
                    Send Message
                  </Button>
                  <Button
                    onClick={() =>
                      setContactModal({
                        open: false,
                        trial: null,
                        message: "",
                        sent: false,
                        generating: false,
                      })
                    }
                    className="px-6 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Contact Steps Modal */}
        <Modal
          isOpen={contactStepsModal.open}
          onClose={closeContactStepsModal}
          title="How to Contact Trial Moderator"
        >
          <div className="space-y-6">
            {contactStepsModal.trial && (
              <>
                {/* Trial Info Header */}
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-slate-900 text-base">
                      {contactStepsModal.trial?.title || "Trial"}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Trial ID: {contactStepsModal.trial?.id || "N/A"}
                  </p>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={prevStep}
                      disabled={contactStepsModal.currentStep === 1}
                      className="px-3 py-1.5 text-xs border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {contactStepsModal.currentStep < 4 ? (
                      <button
                        onClick={nextStep}
                        className="flex-1 px-4 py-1.5 text-xs rounded-lg transition-all text-white"
                        style={{ backgroundColor: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#253075";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#2F3C96";
                        }}
                      >
                        Next Step
                      </button>
                    ) : (
                      <button
                        onClick={closeContactStepsModal}
                        className="flex-1 px-4 py-1.5 text-xs rounded-lg transition-all text-white"
                        style={{ backgroundColor: "#2F3C96" }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#253075";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#2F3C96";
                        }}
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Steps */}
                <div className="relative">
                  {/* Timeline Line */}
                  <div
                    className="absolute left-5 top-0 bottom-0 w-0.5"
                    style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
                  />

                  {/* Step 1: Check Eligibility */}
                  <div className="relative flex gap-3 pb-6">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 1
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep > 1 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <ListChecks
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 1
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep === 1
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 1: Check Your Eligibility
                      </h3>
                      {contactStepsModal.currentStep === 1 && (
                        <div className="space-y-2 mt-2">
                          {contactStepsModal.trial.eligibility ? (
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                {contactStepsModal.trial.eligibility.gender && (
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                      Gender
                                    </span>
                                    <p className="text-xs font-semibold text-indigo-900 mt-0.5">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .gender
                                      }
                                    </p>
                                  </div>
                                )}
                                {contactStepsModal.trial.eligibility
                                  .minimumAge && (
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                      Minimum Age
                                    </span>
                                    <p className="text-xs font-semibold text-indigo-900 mt-0.5">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .minimumAge
                                      }
                                    </p>
                                  </div>
                                )}
                                {contactStepsModal.trial.eligibility
                                  .maximumAge && (
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                      Maximum Age
                                    </span>
                                    <p className="text-xs font-semibold text-indigo-900 mt-0.5">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .maximumAge
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                              {contactStepsModal.trial.eligibility.criteria &&
                                contactStepsModal.trial.eligibility.criteria !==
                                  "Not specified" && (
                                  <div className="mt-2">
                                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide block mb-1.5">
                                      Detailed Criteria
                                    </span>
                                    <p className="text-xs text-slate-700 whitespace-pre-line bg-white rounded p-2 border border-indigo-100">
                                      {
                                        contactStepsModal.trial.eligibility
                                          .criteria
                                      }
                                    </p>
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-600">
                                Eligibility criteria not available. Please
                                review the trial details or contact the trial
                                team directly.
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-slate-600">
                            Review the eligibility criteria above to ensure you
                            meet the requirements before proceeding.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Contact Information */}
                  <div className="relative flex gap-3 pb-6">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 2
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep > 2 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <Mail
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 2
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep === 2
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 2: Get Contact Information
                      </h3>
                      {contactStepsModal.currentStep === 2 && (
                        <div className="space-y-2 mt-2">
                          {contactStepsModal.trial.contacts &&
                          contactStepsModal.trial.contacts.length > 0 ? (
                            <div className="space-y-2">
                              {contactStepsModal.trial.contacts.map(
                                (contact, i) => (
                                  <div
                                    key={i}
                                    className="bg-indigo-50 rounded-lg p-3 border border-indigo-200"
                                  >
                                    {contact.name && (
                                      <div className="font-bold mb-2 text-sm flex items-center gap-2 text-indigo-900">
                                        <User className="w-3.5 h-3.5" />
                                        {contact.name}
                                      </div>
                                    )}
                                    <div className="space-y-1.5">
                                      {contact.email && (
                                        <a
                                          href={`mailto:${contact.email}`}
                                          className="flex items-center gap-2 text-xs font-medium transition-colors text-indigo-700 hover:text-indigo-900"
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                          {contact.email}
                                        </a>
                                      )}
                                      {contact.phone && (
                                        <div className="flex items-center gap-2 text-xs text-slate-700">
                                          <Phone
                                            className="w-3.5 h-3.5"
                                            style={{ color: "#2F3C96" }}
                                          />
                                          <a
                                            href={`tel:${contact.phone}`}
                                            className="transition-colors hover:text-indigo-700"
                                          >
                                            {contact.phone}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-600">
                                Contact information not available for this
                                trial. Please visit the trial's official page
                                for contact details.
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-slate-600">
                            Save this contact information. You'll need it to
                            send your inquiry email.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Generate Email */}
                  <div className="relative flex gap-3 pb-6">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 3
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep > 3 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <Sparkles
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 3
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep === 3
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 3: Draft Your Email
                      </h3>
                      {contactStepsModal.currentStep === 3 && (
                        <div className="space-y-2 mt-2">
                          {!contactStepsModal.generatedEmail ? (
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                              <p className="text-xs text-slate-700 mb-3">
                                Click the button below to generate a
                                professional email draft for contacting the
                                trial moderator.
                              </p>
                              <button
                                onClick={generateContactEmail}
                                disabled={contactStepsModal.generating}
                                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                style={{
                                  color: "#2F3C96",
                                  backgroundColor: "rgba(208, 196, 226, 0.2)",
                                  border: "1px solid rgba(208, 196, 226, 0.3)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!contactStepsModal.generating) {
                                    e.target.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.3)";
                                    e.target.style.color = "#253075";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!contactStepsModal.generating) {
                                    e.target.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.2)";
                                    e.target.style.color = "#2F3C96";
                                  }
                                }}
                              >
                                {contactStepsModal.generating ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generating Email...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Generate Email Draft
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-xs font-semibold text-indigo-900">
                                    Generated Email Draft
                                  </label>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={copyGeneratedEmail}
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition-all"
                                    >
                                      {contactStepsModal.copied ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-2 border border-indigo-100">
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                                    {contactStepsModal.generatedEmail}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Follow Up */}
                  <div className="relative flex gap-3">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        contactStepsModal.currentStep >= 4
                          ? "bg-indigo-100 border-indigo-600"
                          : "bg-gray-100 border-gray-300"
                      }`}
                    >
                      {contactStepsModal.currentStep === 4 ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#2F3C96" }}
                        />
                      ) : (
                        <CheckCircle
                          className="w-5 h-5"
                          style={{
                            color:
                              contactStepsModal.currentStep === 4
                                ? "#2F3C96"
                                : "#787878",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-bold text-sm mb-1.5 ${
                          contactStepsModal.currentStep === 4
                            ? "text-indigo-900"
                            : "text-slate-700"
                        }`}
                      >
                        Step 4: Follow Up
                      </h3>
                      {contactStepsModal.currentStep === 4 && (
                        <div className="space-y-2 mt-2">
                          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                            <h4 className="font-semibold text-xs text-indigo-900 mb-2">
                              Important Follow-Up Tips:
                            </h4>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Wait 1-2 weeks</strong> before
                                  following up if you don't receive a response
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Keep your follow-up brief</strong> -
                                  reference your original inquiry and express
                                  continued interest
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Be patient</strong> - trial
                                  coordinators receive many inquiries and may
                                  take time to respond
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Consider calling</strong> if you have
                                  the phone number and haven't received a
                                  response after 2 weeks
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span>
                                  <strong>Keep records</strong> of all
                                  communications for your reference
                                </span>
                              </li>
                            </ul>
                          </div>
                          <p className="text-xs text-slate-600">
                            Following up shows your continued interest and can
                            help ensure your inquiry doesn't get overlooked.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </Layout>
  );
}
