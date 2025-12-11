import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Heart,
  Sparkles,
  FileText,
  BookOpen,
  ExternalLink,
  Info,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  Loader2,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { LinkPreview } from "@/components/ui/link-preview";
import { AuroraText } from "@/components/ui/aurora-text";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import FreeSearchesIndicator, {
  useFreeSearches,
} from "../components/FreeSearchesIndicator.jsx";
import apiFetch from "../utils/api.js";

export default function Publications() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [useMedicalInterest, setUseMedicalInterest] = useState(true); // Toggle for using medical interest
  const [userMedicalInterest, setUserMedicalInterest] = useState(""); // User's medical interest
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if it's the initial load
  const [isSignedIn, setIsSignedIn] = useState(false); // Track if user is signed in
  const [user, setUser] = useState(null); // Track user state
  const [location, setLocation] = useState("");
  const [locationMode, setLocationMode] = useState("global"); // "current", "global", "custom"
  const [userLocation, setUserLocation] = useState(null);
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
    publication: null,
  });

  // Quick search categories
  const quickFilters = [
    { label: "Oncology", value: "oncology", icon: "🩺" },
    { label: "Cardiology", value: "cardiology", icon: "❤️" },
    { label: "Neurology", value: "neurology", icon: "🧠" },
    { label: "Immunology", value: "immunology", icon: "🦠" },
    { label: "COVID-19", value: "covid", icon: "🦠" },
    { label: "AI/ML", value: "machine learning", icon: "🤖" },
  ];

  const publicationSuggestionTerms = [
    ...quickFilters.map((filter) => filter.label),
    ...quickFilters.map((filter) => filter.value),
    userMedicalInterest,
  ].filter(Boolean);

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
      // Combine: "breast cancer diet" if user searches "diet" and has "breast cancer" interest
      searchQuery = `${userMedicalInterest} ${searchQuery}`;
    } else if (useMedicalInterest && userMedicalInterest && !searchQuery) {
      // If no search query but medical interest is enabled, use just the medical interest
      searchQuery = userMedicalInterest;
    }

    if (searchQuery) params.set("q", searchQuery);

    // Add location parameter (use only country for publications)
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
    if (userData?._id || userData?.id) {
      params.set("userId", userData._id || userData.id);
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

    try {
      const response = await apiFetch(
        `/api/search/publications?${params.toString()}`
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
        window.dispatchEvent(new Event("freeSearchUsed"));
        return;
      }

      const data = await response.json();
      const searchResults = data.results || [];

      // Handle remaining searches from server response
      if (!isUserSignedIn && data.remaining !== undefined) {
        const remaining = data.remaining;
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
        window.dispatchEvent(new Event("freeSearchUsed"));
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
        location,
        locationMode,
        useMedicalInterest,
        userMedicalInterest,
        results: sortedResults,
        isInitialLoad: false,
      };
      sessionStorage.setItem(
        "publications_search_state",
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

      // Add location parameter (use only country for publications)
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
      if (userData?._id || userData?.id) {
        params.set("userId", userData._id || userData.id);
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

      apiFetch(`/api/search/publications?${params.toString()}`)
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
            window.dispatchEvent(new Event("freeSearchUsed"));
            return;
          }
          return r.json();
        })
        .then((data) => {
          if (!data) return; // Skip if rate limited

          const searchResults = data.results || [];

          // Handle remaining searches from server response
          if (!isUserSignedIn && data.remaining !== undefined) {
            const remaining = data.remaining;
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
            window.dispatchEvent(new Event("freeSearchUsed"));
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
            location,
            locationMode,
            useMedicalInterest,
            userMedicalInterest,
            results: sortedResults,
            isInitialLoad: false,
          };
          sessionStorage.setItem(
            "publications_search_state",
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
    return `publication-${item.pmid || item.id || item._id}`;
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
    const itemId = item.id || item.pmid;
    const isFavorited = favorites.some(
      (fav) =>
        fav.type === "publication" &&
        (fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.pmid === itemId ||
          fav.item?.title === item.title)
    );

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== "publication") return true;
        return !(
          fav.item?.id === itemId ||
          fav.item?._id === itemId ||
          fav.item?.pmid === itemId ||
          fav.item?.title === item.title
        );
      });
    } else {
      // Optimistically add to favorites
      optimisticFavorites = [
        ...favorites,
        {
          type: "publication",
          item: {
            ...item,
            id: itemId,
            _id: item._id || itemId,
            pmid: item.pmid || itemId,
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
          }?type=publication&id=${encodeURIComponent(itemId)}`,
          { method: "DELETE" }
        );
        toast.success("Removed from favorites");
      } else {
        // Store complete item information
        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "publication",
            item: {
              ...item, // Store all item properties
              id: itemId,
              _id: item._id || itemId,
              pmid: item.pmid || itemId,
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

  function openDetailsModal(pub) {
    setDetailsModal({
      open: true,
      publication: pub,
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      publication: null,
    });
  }

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
        item.journal || "",
        item.abstract || "",
        Array.isArray(item.authors)
          ? item.authors.join(", ")
          : item.authors || "",
        item.year || "",
      ]
        .filter(Boolean)
        .join(" ");

      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summaryText }),
      }).then((r) => r.json());
      setSummaryModal((prev) => ({
        ...prev,
        summary: res.summary || "Summary unavailable",
        loading: false,
      }));
    } catch (e) {
      setSummaryModal((prev) => ({
        ...prev,
        summary: "Failed to generate summary",
        loading: false,
      }));
    }
  }

  // Restore search state from sessionStorage on mount (for all users, signed in or not)
  useEffect(() => {
    const savedState = sessionStorage.getItem("publications_search_state");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setQ(state.q || "");
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
      setLocation("");
      setLocationMode("global");
      setUseMedicalInterest(true);
      setUserMedicalInterest("");
      setResults([]);
      setIsInitialLoad(true);
      setIsSignedIn(false);
      setUserLocation(null);
      sessionStorage.removeItem("publications_search_state");
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
          !sessionStorage.getItem("publications_search_state")
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
      const savedState = sessionStorage.getItem("publications_search_state");
      if (!savedState) {
        setLocationMode("global"); // Set to global by default
      }

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        // Get medical interests from user object
        if (
          userData.medicalInterests &&
          Array.isArray(userData.medicalInterests) &&
          userData.medicalInterests.length > 0
        ) {
          const medicalInterest = userData.medicalInterests[0]; // Use first medical interest
          setUserMedicalInterest(medicalInterest);

          // Only auto-search if no saved state exists
          const savedState = sessionStorage.getItem(
            "publications_search_state"
          );
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
                Explore Publications
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Search through recent research and medical publications
            </p>
          </div>

          {/* Quick Search Categories */}
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
                  placeholder="Search by keyword, author, or topic..."
                  extraTerms={publicationSuggestionTerms}
                  className="flex-1"
                />
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
                    placeholder="Enter country (e.g., Canada)"
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
                      <div className="h-6 w-28 bg-indigo-200 rounded-full"></div>
                      <div className="h-6 w-32 bg-slate-200 rounded-full"></div>
                    </div>

                    {/* Title Skeleton */}
                    <div className="mb-3 space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-full"></div>
                      <div className="h-5 bg-slate-200 rounded w-4/5"></div>
                    </div>

                    {/* Info Skeleton */}
                    <div className="space-y-2 mb-3">
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                      <div className="h-4 bg-indigo-100 rounded w-2/3"></div>
                      <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
                    </div>

                    {/* Abstract Button Skeleton */}
                    <div className="mb-3">
                      <div className="h-16 bg-indigo-50 rounded-lg"></div>
                    </div>

                    {/* Buttons Skeleton */}
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                    </div>

                    {/* Open Paper Button Skeleton */}
                    <div className="mt-3">
                      <div className="h-8 bg-indigo-100 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Section */}
          {!loading && results.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results
                .slice(0, isSignedIn ? results.length : 6)
                .map((pub, cardIdx) => {
                  const itemId = pub.id || pub.pmid;
                  return (
                    <div
                      key={itemId}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in overflow-hidden"
                      style={{ animationDelay: `${cardIdx * 50}ms` }}
                    >
                      <div className="p-5">
                        {/* Match Badge Banner */}
                        {pub.matchPercentage !== undefined && (
                          <div className="mb-3 -mt-2 -mx-5 px-5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-bold text-blue-700">
                                  {pub.matchPercentage}% Match
                                </span>
                              </div>
                              {pub.matchExplanation && (
                                <span className="text-xs text-blue-600 truncate flex-1 ml-2 max-w-[200px] sm:max-w-none">
                                  {pub.matchExplanation}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Publication Header */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                            <FileText className="w-3 h-3 mr-1" />
                            {pub.pmid
                              ? `PMID: ${pub.pmid}`
                              : pub.id || "PUB-001"}
                          </span>
                          {pub.journal && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200">
                              {pub.journal.length > 20
                                ? `${pub.journal.substring(0, 20)}...`
                                : pub.journal}
                            </span>
                          )}
                        </div>

                        {/* Publication Title */}
                        <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-2 leading-tight">
                          {pub.title}
                        </h3>

                        {/* Basic Info - Authors and Published Date */}
                        <div className="space-y-1.5 mb-3">
                          {pub.authors &&
                            Array.isArray(pub.authors) &&
                            pub.authors.length > 0 && (
                              <div className="flex items-center text-sm text-slate-700">
                                <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                                <span className="line-clamp-1">
                                  {pub.authors.join(", ")}
                                </span>
                              </div>
                            )}
                          {(pub.year || pub.month) && (
                            <div className="flex items-center text-sm text-slate-600">
                              <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                              <span>
                                {pub.month && pub.month + " "}
                                {pub.year || ""}
                              </span>
                            </div>
                          )}
                          {pub.journal && (
                            <div className="flex items-center text-sm text-slate-600">
                              <BookOpen className="w-3.5 h-3.5 mr-2 shrink-0" />
                              <span className="line-clamp-1">
                                {pub.journal}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* One-line Abstract Description */}
                        {pub.abstract && (
                          <div className="mb-3">
                            <button
                              onClick={() => openDetailsModal(pub)}
                              className="w-full text-left text-sm text-slate-700 hover:text-indigo-700 font-medium py-2 px-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <span className="line-clamp-2 flex-1">
                                  {pub.abstract}
                                </span>
                              </div>
                            </button>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateSummary(pub)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm"
                          >
                            <Sparkles className="w-4 h-4" />
                            Summarize
                          </button>

                          <button
                            onClick={() => favorite(pub)}
                            disabled={favoritingItems.has(getFavoriteKey(pub))}
                            className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              favorites.some(
                                (fav) =>
                                  fav.type === "publication" &&
                                  (fav.item?.id === itemId ||
                                    fav.item?._id === itemId ||
                                    fav.item?.pmid === itemId)
                              )
                                ? "bg-red-50 border-red-200 text-red-500"
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                            }`}
                          >
                            {favoritingItems.has(getFavoriteKey(pub)) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Heart
                                className={`w-4 h-4 ${
                                  favorites.some(
                                    (fav) =>
                                      fav.type === "publication" &&
                                      (fav.item?.id === itemId ||
                                        fav.item?._id === itemId ||
                                        fav.item?.pmid === itemId)
                                  )
                                    ? "fill-current"
                                    : ""
                                }`}
                              />
                            )}
                          </button>
                        </div>

                        {/* Open Paper Action */}
                        {pub.url && (
                          <a
                            href={pub.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 py-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors mt-3 w-full"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Paper
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Sign Up Message for More Results */}
          {!loading &&
            results.length > 0 &&
            !isSignedIn &&
            results.length > 6 && (
              <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6 text-center shadow-lg">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-indigo-900">
                      Want to see more publications?
                    </h3>
                  </div>
                  <p className="text-sm text-indigo-700 max-w-md">
                    Sign up for free to view all {results.length} matching
                    publications and get personalized recommendations based on
                    your medical interests.
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
              </div>
            )}

          {/* Empty State */}
          {!loading && results.length === 0 && !isInitialLoad && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                No Publications Found
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
              <FileText className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
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

        {/* Details Modal */}
        <Modal
          isOpen={detailsModal.open}
          onClose={closeDetailsModal}
          title="Publication Details"
        >
          {detailsModal.publication && (
            <div className="flex flex-col h-full -mx-6 -my-6">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-5">
                {/* Header */}
                <div className="pb-4 border-b border-slate-200/60">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                    {detailsModal.publication.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detailsModal.publication.pmid && (
                      <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">
                        <FileText className="w-3 h-3 mr-1.5" />
                        PMID: {detailsModal.publication.pmid}
                      </span>
                    )}
                    {detailsModal.publication.journal && (
                      <span className="inline-flex items-center px-3 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200">
                        <BookOpen className="w-3 h-3 mr-1.5" />
                        {detailsModal.publication.journal}
                      </span>
                    )}
                  </div>
                </div>

                {/* Abstract Section - Moved to Top */}
                {detailsModal.publication.abstract && (
                  <div>
                    <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-xl p-5 border border-indigo-100/50">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-indigo-700">
                        <Info className="w-4 h-4" />
                        Abstract
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {detailsModal.publication.abstract}
                      </p>
                    </div>
                  </div>
                )}

                {/* Authors Section */}
                {detailsModal.publication.authors &&
                  Array.isArray(detailsModal.publication.authors) &&
                  detailsModal.publication.authors.length > 0 && (
                    <div>
                      <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                          <User className="w-4 h-4" />
                          Authors
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {detailsModal.publication.authors.join(", ")}
                        </p>
                        {detailsModal.publication.authors.length > 1 && (
                          <p className="text-xs text-slate-500 mt-2">
                            {detailsModal.publication.authors.length} authors
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {/* Publication Metadata Cards */}
                <div>
                  <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                      <Calendar className="w-4 h-4" />
                      Publication Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Publication Date */}
                      {(detailsModal.publication.year ||
                        detailsModal.publication.month) && (
                        <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Published
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            {detailsModal.publication.month
                              ? `${detailsModal.publication.month} `
                              : ""}
                            {detailsModal.publication.day
                              ? `${detailsModal.publication.day}, `
                              : ""}
                            {detailsModal.publication.year || "N/A"}
                          </p>
                        </div>
                      )}

                      {/* Volume & Issue */}
                      {(detailsModal.publication.volume ||
                        detailsModal.publication.issue) && (
                        <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                          <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Volume / Issue
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            {detailsModal.publication.volume || "N/A"}
                            {detailsModal.publication.issue
                              ? ` (Issue ${detailsModal.publication.issue})`
                              : ""}
                          </p>
                        </div>
                      )}

                      {/* Pages */}
                      {detailsModal.publication.Pages && (
                        <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                          <div className="flex items-center gap-2 mb-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Pages
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            {detailsModal.publication.Pages}
                          </p>
                        </div>
                      )}

                      {/* Language */}
                      {detailsModal.publication.language && (
                        <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Language
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            {detailsModal.publication.language}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Keywords Section */}
                {detailsModal.publication.keywords &&
                  detailsModal.publication.keywords.length > 0 && (
                    <div>
                      <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                          <TrendingUp className="w-4 h-4" />
                          Keywords
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {detailsModal.publication.keywords.map(
                            (keyword, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100"
                              >
                                {keyword}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* MeSH Terms Section */}
                {detailsModal.publication.meshTerms &&
                  detailsModal.publication.meshTerms.length > 0 && (
                    <div>
                      <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                          <Info className="w-4 h-4" />
                          MeSH Terms
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {detailsModal.publication.meshTerms
                            .slice(0, 10)
                            .map((term, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200"
                              >
                                {term}
                              </span>
                            ))}
                          {detailsModal.publication.meshTerms.length > 10 && (
                            <span className="px-3 py-1.5 text-slate-500 text-xs">
                              +{detailsModal.publication.meshTerms.length - 10}{" "}
                              more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Affiliations Section */}
                {detailsModal.publication.affiliations &&
                  detailsModal.publication.affiliations.length > 0 && (
                    <div>
                      <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                          <MapPin className="w-4 h-4" />
                          Affiliation
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {detailsModal.publication.affiliations[0]}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Publication Types */}
                {detailsModal.publication.publicationTypes &&
                  detailsModal.publication.publicationTypes.length > 0 && (
                    <div>
                      <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                          <FileText className="w-4 h-4" />
                          Publication Type
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {detailsModal.publication.publicationTypes.map(
                            (type, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200"
                              >
                                {type}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Sticky Actions Footer */}
              <div className="sticky bottom-[-100px] px-6 pb-5 borderbackdrop-blur-sm shadow-lg">
                <div className="flex flex-wrap gap-3">
                  {detailsModal.publication.url && (
                    <a
                      href={detailsModal.publication.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on PubMed
                    </a>
                  )}
                  <button
                    onClick={() => favorite(detailsModal.publication)}
                    disabled={favoritingItems.has(
                      getFavoriteKey(detailsModal.publication)
                    )}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                      favorites.some(
                        (fav) =>
                          fav.type === "publication" &&
                          (fav.item?.id ===
                            (detailsModal.publication.id ||
                              detailsModal.publication.pmid) ||
                            fav.item?._id ===
                              (detailsModal.publication.id ||
                                detailsModal.publication.pmid) ||
                            fav.item?.pmid ===
                              (detailsModal.publication.id ||
                                detailsModal.publication.pmid))
                      )
                        ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {favoritingItems.has(
                      getFavoriteKey(detailsModal.publication)
                    ) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.some(
                            (fav) =>
                              fav.type === "publication" &&
                              (fav.item?.id ===
                                (detailsModal.publication.id ||
                                  detailsModal.publication.pmid) ||
                                fav.item?._id ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid) ||
                                fav.item?.pmid ===
                                  (detailsModal.publication.id ||
                                    detailsModal.publication.pmid))
                          )
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    )}
                    {favoritingItems.has(
                      getFavoriteKey(detailsModal.publication)
                    )
                      ? "Processing..."
                      : favorites.some(
                          (fav) =>
                            fav.type === "publication" &&
                            (fav.item?.id ===
                              (detailsModal.publication.id ||
                                detailsModal.publication.pmid) ||
                              fav.item?._id ===
                                (detailsModal.publication.id ||
                                  detailsModal.publication.pmid) ||
                              fav.item?.pmid ===
                                (detailsModal.publication.id ||
                                  detailsModal.publication.pmid))
                        )
                      ? "Remove from Favorites"
                      : "Add to Favorites"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>

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
          title="AI Publication Summary"
        >
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-lg">
                  {summaryModal.title}
                </h4>
              </div>
              <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                Research Publication
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
