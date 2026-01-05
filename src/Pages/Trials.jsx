import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
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
  const [status, setStatus] = useState("");
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
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    text: "",
    summary: "",
    loading: false,
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    trial: null,
  });
  const [contactModal, setContactModal] = useState({
    open: false,
    trial: null,
    message: "",
    sent: false,
    generating: false,
  });

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

  const statusOptions = [
    "RECRUITING",
    "NOT_YET_RECRUITING",
    "ACTIVE_NOT_RECRUITING",
    "COMPLETED",
    "SUSPENDED",
    "TERMINATED",
    "WITHDRAWN",
  ];

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

    if (searchQuery) params.set("q", searchQuery);
    if (status) params.set("status", status);

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
        syncWithBackend().then((result) => {
          // Update remaining searches indicator with synced value
          window.dispatchEvent(new CustomEvent("freeSearchUsed", {
            detail: { remaining: result.remaining }
          }));
        }).catch(console.error);
        return;
      }

      const data = await response.json();
      const searchResults = data.results || [];

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
        window.dispatchEvent(new CustomEvent("freeSearchUsed", {
          detail: { remaining }
        }));
      }

      // Sort by matchPercentage in descending order (highest first)
      const sortedResults = [...searchResults].sort((a, b) => {
        const aMatch = a.matchPercentage ?? -1;
        const bMatch = b.matchPercentage ?? -1;
        return bMatch - aMatch; // Descending order
      });
      setResults(sortedResults);

      // Save search state to sessionStorage
      const searchState = {
        q: appliedQuery,
        status,
        location,
        locationMode,
        useMedicalInterest,
        userMedicalInterest,
        results: sortedResults,
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
            syncWithBackend().then((result) => {
              // Update remaining searches indicator with synced value
              window.dispatchEvent(new CustomEvent("freeSearchUsed", {
                detail: { remaining: result.remaining }
              }));
            }).catch(console.error);
            return;
          }
          return r.json();
        })
        .then((data) => {
          if (!data) return; // Skip if rate limited

          const searchResults = data.results || [];

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
            window.dispatchEvent(new CustomEvent("freeSearchUsed", {
              detail: { remaining }
            }));
          }

          // Sort by matchPercentage in descending order (highest first)
          const sortedResults = [...searchResults].sort((a, b) => {
            const aMatch = a.matchPercentage ?? -1;
            const bMatch = b.matchPercentage ?? -1;
            return bMatch - aMatch; // Descending order
          });
          setResults(sortedResults);

          // Save search state to sessionStorage
          const searchState = {
            q: filterValue,
            status: "",
            location,
            locationMode,
            useMedicalInterest,
            userMedicalInterest,
            results: sortedResults,
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
    setSummaryModal({
      open: true,
      title: item.title,
      text: "",
      summary: "",
      loading: true,
    });

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      // Build comprehensive summary text
      const summaryText = [
        item.title,
        item.status || "",
        item.phase || "",
        item.conditions?.join(", ") || "",
        item.description || "",
        item.eligibility?.criteria || "",
      ]
        .filter(Boolean)
        .join(" ");

      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: summaryText,
        }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary: res.summary || "Summary unavailable",
        loading: false,
      }));
    } catch (e) {
      setSummaryModal((prev) => ({
        ...prev,
        summary: "Failed to generate summary. Please try again.",
        loading: false,
      }));
    }
  }

  function openDetailsModal(trial) {
    setDetailsModal({
      open: true,
      trial,
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      trial: null,
    });
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
        setStatus(state.status || "");
        setLocation(state.location || "");
        setLocationMode(state.locationMode || "global");
        setUseMedicalInterest(
          state.useMedicalInterest !== undefined
            ? state.useMedicalInterest
            : true
        );
        setUserMedicalInterest(state.userMedicalInterest || "");
        setResults(state.results || []);
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
        // Fetch profile for location
        const response = await fetch(
          `${base}/api/profile/${userData._id || userData.id}`
        );
        const data = await response.json();
        if (data.profile) {
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

          // Only auto-search if no saved state exists
          const savedState = sessionStorage.getItem("trials_search_state");
          if (!savedState) {
            setUseMedicalInterest(true);
            // Auto-trigger search with medical interest
            setIsInitialLoad(false);
            setQ(""); // Clear search query, will use medical interest only
            // Trigger search after state updates
            setTimeout(() => {
              search();
            }, 100);
          }
        } else {
          setUseMedicalInterest(false);
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
      {/* Free Searches Indicator */}
      <FreeSearchesIndicator user={user} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          {/* Compact Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#38bdf8", "#6366F1", "#818CF8", "#9333EA", "#C084FC"]}
              >
                Explore Clinical Trials
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Discover trials that match your needs
            </p>
          </div>

          {/* Quick Filters */}
          <div className="mb-4">
            <div className="flex flex-wrap justify-center gap-2">
              {quickFilters.map((filter, idx) => (
                <button
                  key={filter.value}
                  onClick={() => quickSearch(filter.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-full hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-lg transition-all duration-300 shadow-sm text-xs font-medium text-slate-700 hover:text-indigo-700 animate-fade-in active:bg-blue-50 active:border-blue-300"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <span className="text-sm">{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-lg p-5 mb-4 border border-slate-200 animate-fade-in">
            <BorderBeam
              duration={10}
              size={100}
              reverse={true}
              className="from-transparent via-indigo-500 to-transparent"
            />
            <BorderBeam
              duration={10}
              size={300}
              borderWidth={3}
              className="from-transparent via-blue-500 to-transparent"
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
                  onSubmit={(value) => search(value)}
                  placeholder="Search by disease, treatment, condition..."
                  extraTerms={trialSuggestionTerms}
                  className="flex-1"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={search}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                >
                  Search
                </Button>
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

          {/* Skeleton Loaders */}
          {loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, idx) => (
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
              {results.slice(0, isSignedIn ? 9 : 6).map((trial, cardIdx) => (
                <div
                  key={trial.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${cardIdx * 50}ms` }}
                >
                  <div className="p-5">
                    {/* Match Badge Banner */}
                    {trial.matchPercentage !== undefined && (
                      <div className="mb-3 -mt-2 -mx-5 px-5 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-bold text-indigo-700">
                              {trial.matchPercentage}% Match
                            </span>
                          </div>
                          {trial.matchExplanation && (
                            <span className="text-xs text-indigo-600 truncate flex-1 ml-2 max-w-[200px] sm:max-w-none">
                              {trial.matchExplanation}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                        <Beaker className="w-3 h-3 mr-1" />
                        {trial.id}
                      </span>
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

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-2">
                      {trial.title}
                    </h3>

                    {/* Basic Info */}
                    <div className="space-y-1.5 mb-3 text-sm text-slate-700">
                      {trial.conditions?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" />
                          <span className="line-clamp-1">
                            {trial.conditions.join(", ")}
                          </span>
                        </div>
                      )}
                      {trial.phase && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3.5 h-3.5" /> Phase{" "}
                          {trial.phase}
                        </div>
                      )}
                    </div>

                    {/* Description with Info Button */}
                    {trial.description && (
                      <div className="mb-3">
                        <button
                          onClick={() => openDetailsModal(trial)}
                          className="w-full flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-700 font-medium py-2 px-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <Info className="w-4 h-4" />
                          <span className="flex-1 text-left line-clamp-2">
                            {trial.description}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => generateSummary(trial)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm"
                      >
                        <Sparkles className="w-4 h-4" /> Summarize
                      </button>
                      <button
                        onClick={() => favorite(trial)}
                        disabled={favoritingItems.has(getFavoriteKey(trial))}
                        className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          favorites.some(
                            (fav) =>
                              fav.type === "trial" &&
                              (fav.item?.id === trial.id ||
                                fav.item?._id === trial.id)
                          )
                            ? "bg-red-50 border-red-200 text-red-500"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                        }`}
                      >
                        {favoritingItems.has(getFavoriteKey(trial)) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Heart
                            className={`w-4 h-4 ${
                              favorites.some(
                                (fav) =>
                                  fav.type === "trial" &&
                                  (fav.item?.id === trial.id ||
                                    fav.item?._id === trial.id)
                              )
                                ? "fill-current"
                                : ""
                            }`}
                          />
                        )}
                      </button>
                    </div>

                    {/* Action Button */}
                    <div className="mt-3">
                      <button
                        onClick={() => openContactModal(trial)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 font-medium"
                      >
                        <Send className="w-4 h-4" /> Contact Moderator
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
              text: "",
              summary: "",
              loading: false,
            })
          }
          title="AI Trial Summary"
        >
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <Beaker className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-lg">
                  {summaryModal.title}
                </h4>
              </div>
              <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                Clinical Trial
              </span>
            </div>

            {summaryModal.loading ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 text-indigo-600 mb-4">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">
                    Generating AI summary...
                  </span>
                </div>
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-indigo-100 rounded"></div>
                  <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
                  <div className="h-4 bg-indigo-100 rounded w-4/6"></div>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {summaryModal.summary}
                </p>
              </div>
            )}
          </div>
        </Modal>

        {/* Details Modal */}
        <Modal
          isOpen={detailsModal.open}
          onClose={closeDetailsModal}
          title="Trial Details"
        >
          {detailsModal.trial && (
            <div className="space-y-6">
              {/* Header */}
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <Beaker className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-lg">
                    {detailsModal.trial.title}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                    {detailsModal.trial.id}
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
                    <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                      Phase {detailsModal.trial.phase}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {detailsModal.trial.description && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Description
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {detailsModal.trial.description}
                  </p>
                </div>
              )}

              {/* Location */}
              {detailsModal.trial.location &&
                detailsModal.trial.location !== "Not specified" && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                      <MapPin className="w-5 h-5 text-green-600" />
                      Trial Locations
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {detailsModal.trial.location}
                    </p>
                  </div>
                )}

              {/* Conditions */}
              {detailsModal.trial.conditions?.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Conditions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detailsModal.trial.conditions.map((condition, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-white text-blue-700 text-sm font-medium rounded-lg border border-blue-300 shadow-sm"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Eligibility */}
              {detailsModal.trial.eligibility && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200">
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-base">
                    <ListChecks className="w-5 h-5 text-indigo-600" />
                    Eligibility Criteria
                  </h4>

                  {/* Quick Eligibility Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {/* Gender */}
                    <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Gender
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {detailsModal.trial.eligibility.gender || "All"}
                      </p>
                    </div>

                    {/* Age Range */}
                    <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Age Range
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {detailsModal.trial.eligibility.minimumAge !==
                          "Not specified" &&
                        detailsModal.trial.eligibility.minimumAge
                          ? detailsModal.trial.eligibility.minimumAge
                          : "N/A"}
                        {" - "}
                        {detailsModal.trial.eligibility.maximumAge !==
                          "Not specified" &&
                        detailsModal.trial.eligibility.maximumAge
                          ? detailsModal.trial.eligibility.maximumAge
                          : "N/A"}
                      </p>
                    </div>

                    {/* Healthy Volunteers */}
                    <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Volunteers
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {detailsModal.trial.eligibility.healthyVolunteers ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Eligibility Criteria */}
                  {detailsModal.trial.eligibility.criteria &&
                    detailsModal.trial.eligibility.criteria !==
                      "Not specified" && (
                      <div className="mt-4 pt-4 border-t border-indigo-200">
                        <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                          <Info className="w-4 h-4 text-indigo-600" />
                          Detailed Eligibility Criteria
                        </h5>
                        <div className="bg-white rounded-lg p-4 border border-indigo-100">
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {detailsModal.trial.eligibility.criteria}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Contacts */}
              {detailsModal.trial.contacts?.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                    <User className="w-5 h-5 text-indigo-600" />
                    Contact Information
                  </h4>
                  <div className="space-y-3">
                    {detailsModal.trial.contacts.map((contact, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm"
                      >
                        {contact.name && (
                          <div className="font-bold text-slate-900 mb-2 text-sm">
                            {contact.name}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              <Mail className="w-4 h-4" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="text-indigo-600">📞</span>
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ClinicalTrials.gov Link */}
              {detailsModal.trial.clinicalTrialsGovUrl && (
                <div className="pt-4 border-t border-slate-200">
                  <a
                    href={detailsModal.trial.clinicalTrialsGovUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Details on ClinicalTrials.gov
                  </a>
                </div>
              )}
            </div>
          )}
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
