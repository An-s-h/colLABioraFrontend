"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Heart,
  User,
  Building2,
  MapPin,
  GraduationCap,
  ExternalLink,
  Info,
  Mail,
  LinkIcon,
  Award,
  Briefcase,
  Calendar,
  BookOpen,
  Loader2,
  ChevronDown,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { AuroraText } from "@/components/ui/aurora-text";
import SmartSearchInput from "../components/SmartSearchInput.jsx";

export default function Experts() {
  const navigate = useNavigate();
  const initialFetchDone = useRef(false); // Track if initial fetch has been performed
  const [researchArea, setResearchArea] = useState("");
  const [diseaseOfInterest, setDiseaseOfInterest] = useState("");
  const [location, setLocation] = useState("");
  const [locationMode, setLocationMode] = useState("global"); // "current", "global", "custom"
  const [userLocation, setUserLocation] = useState(null);
  const [useMedicalInterest, setUseMedicalInterest] = useState(true); // Toggle for using medical interest
  const [userMedicalInterest, setUserMedicalInterest] = useState(""); // User's medical interest
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if it's the initial load
  const [isSignedIn, setIsSignedIn] = useState(false); // Track if user is signed in
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); // Start with loading false - no initial search
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [publications, setPublications] = useState({}); // Map of expert name/id to publications array
  const [loadingPublications, setLoadingPublications] = useState({}); // Map of expert name/id to loading state
  const [expandedCards, setExpandedCards] = useState({}); // Map of expert name/id to expanded state
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    expert: null,
  });

  // Quick search categories
  const quickFilters = [
    { label: "Oncology", value: "oncology", icon: "🩺" },
    { label: "Cardiology", value: "cardiology", icon: "❤️" },
    { label: "Neurology", value: "neurology", icon: "🧠" },
    { label: "Immunology", value: "immunology", icon: "🦠" },
    { label: "Genetics", value: "genetics", icon: "🧬" },
    { label: "Pediatrics", value: "pediatrics", icon: "👶" },
  ];

  const sharedExpertSuggestionTerms = [
    ...quickFilters.map((filter) => filter.label),
    ...quickFilters.map((filter) => filter.value),
  ].filter(Boolean);

  const diseaseSuggestionTerms = [
    ...sharedExpertSuggestionTerms,
    userMedicalInterest,
  ].filter(Boolean);

  async function search(overrides = {}) {
    setLoading(true);
    setResults([]);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const nextResearchArea =
      overrides.researchArea !== undefined
        ? overrides.researchArea
        : researchArea;
    const nextDiseaseOfInterest =
      overrides.diseaseOfInterest !== undefined
        ? overrides.diseaseOfInterest
        : diseaseOfInterest;

    // Build search query: "researchArea in diseaseOfInterest in location"
    const searchQueryParts = [];

    // Mark that initial load is complete when user performs search
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }

    // For manual searches, use medical interest if enabled
    let currentResearchArea = nextResearchArea.trim();
    let currentDiseaseOfInterest = nextDiseaseOfInterest.trim();

    // If medical interest is enabled and no disease of interest is set, use medical interest
    if (
      useMedicalInterest &&
      userMedicalInterest &&
      !currentDiseaseOfInterest
    ) {
      currentDiseaseOfInterest = userMedicalInterest;
    }

    if (currentResearchArea) {
      searchQueryParts.push(currentResearchArea);
    }

    if (currentDiseaseOfInterest) {
      if (searchQueryParts.length > 0) {
        searchQueryParts.push(`in ${currentDiseaseOfInterest}`);
      } else {
        searchQueryParts.push(currentDiseaseOfInterest);
      }
    }

    // Add location
    let locationStr = null;
    if (locationMode === "current" && userLocation) {
      locationStr = [userLocation.city, userLocation.country]
        .filter(Boolean)
        .join(", ");
      if (locationStr) {
        searchQueryParts.push(`in ${locationStr}`);
        params.set("location", locationStr);
      }
    } else if (locationMode === "custom" && location.trim()) {
      searchQueryParts.push(`in ${location.trim()}`);
      params.set("location", location.trim());
      locationStr = location.trim();
    } else if (locationMode === "global") {
      searchQueryParts.push("global");
    }

    const searchQuery = searchQueryParts.join(" ");

    if (searchQuery) params.set("q", searchQuery);

    // Add user profile data for matching
    if (user?._id || user?.id) {
      params.set("userId", user._id || user.id);
    } else if (currentDiseaseOfInterest || locationStr) {
      if (currentDiseaseOfInterest) {
        params.set("conditions", currentDiseaseOfInterest);
      }
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
      const response = await fetch(
        `${base}/api/search/experts?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        // Handle 503 or other errors
        const errorMsg = data.error || "Failed to search experts";
        toast.error(errorMsg);
        setResults([]);
      } else {
        const searchResults = data.results || [];
        // Sort by matchPercentage in descending order (highest first)
        const sortedResults = [...searchResults].sort((a, b) => {
          const aMatch = a.matchPercentage ?? -1;
          const bMatch = b.matchPercentage ?? -1;
          return bMatch - aMatch; // Descending order
        });
        setResults(sortedResults);

        // Save search state to sessionStorage
        const searchState = {
          researchArea: nextResearchArea,
          diseaseOfInterest: nextDiseaseOfInterest,
          location,
          locationMode,
          useMedicalInterest,
          userMedicalInterest,
          results: sortedResults,
          isInitialLoad: false,
        };
        sessionStorage.setItem(
          "experts_search_state",
          JSON.stringify(searchState)
        );

        if (data.message) {
          toast.error(data.message);
        }
        if (data.results && data.results.length === 0 && !data.message) {
          toast.error("No experts found. Try adjusting your search criteria.");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      toast.error("Failed to search experts. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function quickSearch(filterValue) {
    setResearchArea(filterValue);
    setDiseaseOfInterest("");
    setIsInitialLoad(false); // Mark initial load as complete when user performs quick search
    setLoading(true);
    setResults([]);
    setTimeout(async () => {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const params = new URLSearchParams();
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // Build search query
      const searchQueryParts = [filterValue];
      let locationStr = null;

      if (locationMode === "current" && userLocation) {
        locationStr = [userLocation.city, userLocation.country]
          .filter(Boolean)
          .join(", ");
        if (locationStr) {
          searchQueryParts.push(`in ${locationStr}`);
          params.set("location", locationStr);
        }
      } else if (locationMode === "custom" && location.trim()) {
        searchQueryParts.push(`in ${location.trim()}`);
        params.set("location", location.trim());
        locationStr = location.trim();
      } else if (locationMode === "global") {
        searchQueryParts.push("global");
      }

      const searchQuery = searchQueryParts.join(" ");
      params.set("q", searchQuery);

      // Add user profile data for matching
      if (user?._id || user?.id) {
        params.set("userId", user._id || user.id);
      } else if (locationStr) {
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
        const response = await fetch(
          `${base}/api/search/experts?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || "Failed to search experts";
          toast.error(errorMsg);
          setResults([]);
        } else {
          const searchResults = data.results || [];
          // Sort by matchPercentage in descending order (highest first)
          const sortedResults = [...searchResults].sort((a, b) => {
            const aMatch = a.matchPercentage ?? -1;
            const bMatch = b.matchPercentage ?? -1;
            return bMatch - aMatch; // Descending order
          });
          setResults(sortedResults);

          // Save search state to sessionStorage
          const searchState = {
            researchArea: filterValue,
            diseaseOfInterest: "",
            location,
            locationMode,
            useMedicalInterest,
            userMedicalInterest,
            results: sortedResults,
            isInitialLoad: false,
          };
          sessionStorage.setItem(
            "experts_search_state",
            JSON.stringify(searchState)
          );

          if (data.message) {
            toast.error(data.message);
          }
        }
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        toast.error("Failed to search experts. Please try again later.");
      } finally {
        setLoading(false);
      }
    }, 100);
  }

  function toggleCardExpansion(expert) {
    const expertId = expert.name || expert.id || expert._id;
    if (!expertId) return;

    const isExpanded = expandedCards[expertId];

    // If expanding, fetch publications if not already loaded
    if (!isExpanded && !publications[expertId]) {
      fetchPublications(expert);
    }

    setExpandedCards((prev) => ({
      ...prev,
      [expertId]: !isExpanded,
    }));
  }

  async function fetchPublications(expert) {
    const expertId = expert.name || expert.id || expert._id;
    if (!expertId) return;

    // Check if already loaded
    if (publications[expertId]) {
      return;
    }

    setLoadingPublications((prev) => ({ ...prev, [expertId]: true }));

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const response = await fetch(
        `${base}/api/search/expert/publications?author=${encodeURIComponent(
          expert.name
        )}`
      );
      const data = await response.json();

      setPublications((prev) => ({
        ...prev,
        [expertId]: data.publications || [],
      }));

      if (data.publications && data.publications.length === 0) {
        toast.error("No publications found for this researcher");
      }
    } catch (error) {
      console.error("Error fetching publications:", error);
      toast.error("Failed to fetch publications");
      setPublications((prev) => ({
        ...prev,
        [expertId]: [],
      }));
    } finally {
      setLoadingPublications((prev) => ({ ...prev, [expertId]: false }));
    }
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item) => {
    return `expert-${item.name || item.orcid || item.id || item._id}`;
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
    // For experts, use exact name as the primary identifier
    const itemId = item.name || item.id || item._id;

    const isFavorited = favorites.some((fav) => {
      if (fav.type !== "expert") return false;
      // Check by exact name match (primary identifier)
      if (item.name && fav.item?.name) {
        return fav.item.name === item.name;
      }
      // Fallback: check by id
      if (fav.item?.id === itemId || fav.item?._id === itemId) {
        return true;
      }
      return false;
    });

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== "expert") return true;
        // Check by exact name match (primary identifier)
        if (item.name && fav.item?.name) {
          return fav.item.name !== item.name;
        }
        // Fallback: check by id
        return !(fav.item?.id === itemId || fav.item?._id === itemId);
      });
    } else {
      // Optimistically add to favorites
      const itemToStore = {
        ...item,
        id: itemId,
        _id: item._id || itemId,
      };

      if (item.name) {
        itemToStore.name = item.name;
      }
      if (item.orcid) {
        itemToStore.orcid = item.orcid;
      }

      optimisticFavorites = [
        ...favorites,
        {
          type: "expert",
          item: itemToStore,
          _id: `temp-${Date.now()}`,
        },
      ];
    }

    // Update UI immediately
    setFavorites(optimisticFavorites);
    setFavoritingItems((prev) => new Set(prev).add(favoriteKey));

    try {
      if (isFavorited) {
        // Find the actual favorite to get its stored ID
        const foundFavorite = previousFavorites.find((fav) => {
          if (fav.type !== "expert") return false;

          // Check by exact name match (primary identifier)
          if (item.name && fav.item?.name) {
            return fav.item.name === item.name;
          }

          // Fallback: check by id
          if (fav.item?.id === itemId || fav.item?._id === itemId) {
            return true;
          }

          return false;
        });

        // Use the stored name or id from the favorite, or fallback to itemId
        let deleteId =
          foundFavorite?.item?.name ||
          foundFavorite?.item?.id ||
          foundFavorite?.item?._id ||
          item.name ||
          item.id ||
          item._id;

        const deleteResponse = await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }?type=expert&id=${encodeURIComponent(deleteId)}`,
          {
            method: "DELETE",
          }
        );

        if (!deleteResponse.ok) {
          throw new Error("Failed to delete favorite");
        }

        toast.success("Removed from favorites");
      } else {
        // Store complete item information
        const itemToStore = {
          ...item, // Store all item properties
          id: itemId,
          _id: item._id || itemId,
        };

        // Ensure name is stored as the primary identifier
        if (item.name) {
          itemToStore.name = item.name;
        }

        // Also store orcid if available (for reference, but not used for matching)
        if (item.orcid) {
          itemToStore.orcid = item.orcid;
        }

        const addResponse = await fetch(
          `${base}/api/favorites/${user._id || user.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "expert",
              item: itemToStore,
            }),
          }
        );

        if (!addResponse.ok) {
          throw new Error("Failed to add favorite");
        }

        toast.success("Added to favorites");
      }

      // Refresh favorites from backend - wait a bit to ensure backend has processed
      await new Promise((resolve) => setTimeout(resolve, 100));
      const favResponse = await fetch(
        `${base}/api/favorites/${user._id || user.id}`
      );

      if (favResponse.ok) {
        const favData = await favResponse.json();
        setFavorites(favData.items || []);
      } else {
        throw new Error("Failed to refresh favorites");
      }
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

  function openDetailsModal(expert) {
    setDetailsModal({
      open: true,
      expert: expert,
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      expert: null,
    });
  }

  // Restore search state from sessionStorage on mount (for all users, signed in or not)
  useEffect(() => {
    const savedState = sessionStorage.getItem("experts_search_state");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setResearchArea(state.researchArea || "");
        setDiseaseOfInterest(state.diseaseOfInterest || "");
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
      setResearchArea("");
      setDiseaseOfInterest("");
      setLocation("");
      setLocationMode("global");
      setUseMedicalInterest(true);
      setUserMedicalInterest("");
      setResults([]);
      setIsInitialLoad(true);
      setIsSignedIn(false);
      setUserLocation(null);
      initialFetchDone.current = false; // Reset the fetch flag
      sessionStorage.removeItem("experts_search_state");
    };

    window.addEventListener("logout", handleLogout);
    return () => window.removeEventListener("logout", handleLogout);
  }, []);

  // Fetch user profile to get location and medical interests, then auto-search if signed in
  useEffect(() => {
    // Skip if we've already done the initial fetch
    if (initialFetchDone.current) return;

    async function fetchUserData() {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user?._id && !user?.id) {
        setUseMedicalInterest(false);
        setIsSignedIn(false);
        initialFetchDone.current = true; // Mark as done even if no user
        return;
      }

      setIsSignedIn(true);

      // Only set location mode if not restored from sessionStorage
      const savedState = sessionStorage.getItem("experts_search_state");
      if (!savedState) {
        setLocationMode("global"); // Set to global by default
      }

      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        // Fetch profile for location
        const response = await fetch(
          `${base}/api/profile/${user._id || user.id}`
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
          user.medicalInterests &&
          Array.isArray(user.medicalInterests) &&
          user.medicalInterests.length > 0
        ) {
          const medicalInterest = user.medicalInterests[0];
          setUserMedicalInterest(medicalInterest); // Use first medical interest

          // Only auto-search if no saved state exists (no previous searches before sign-in)
          const savedState = sessionStorage.getItem("experts_search_state");
          if (!savedState) {
            // No previous searches, so auto-fill and search with user's medical interest
            setDiseaseOfInterest(medicalInterest);
            setUseMedicalInterest(true);

            // Auto-trigger search with medical interest as disease of interest
            setIsInitialLoad(false);
            setResearchArea(""); // Clear research area, will use medical interest as disease
            // Trigger search after state updates
            setTimeout(() => {
              search();
            }, 100);
          } else {
            // User had previous searches before signing in, preserve them
            // Just update medical interest info without triggering search
            setUseMedicalInterest(true);
          }
        } else {
          setUseMedicalInterest(false);
        }

        initialFetchDone.current = true; // Mark as done after successful fetch
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUseMedicalInterest(false);
        initialFetchDone.current = true; // Mark as done even on error
      }
    }

    fetchUserData();
  }, []);

  // Update disease of interest when toggle changes (only for manual searches)
  useEffect(() => {
    if (
      !isInitialLoad &&
      useMedicalInterest &&
      userMedicalInterest &&
      !diseaseOfInterest
    ) {
      setDiseaseOfInterest(userMedicalInterest);
    } else if (
      !useMedicalInterest &&
      diseaseOfInterest === userMedicalInterest
    ) {
      setDiseaseOfInterest("");
    }
  }, [useMedicalInterest, userMedicalInterest, isInitialLoad]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8 ">
          {/* Compact Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#38bdf8", "#6366F1", "#818CF8", "#9333EA", "#C084FC"]}
              >
                Explore Health Experts
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Connect with medical professionals and researchers worldwide
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
              {/* Main Search Inputs */}
              <div className="flex flex-col md:flex-row gap-2">
                <SmartSearchInput
                  value={researchArea}
                  onChange={setResearchArea}
                  onSubmit={(value) => search({ researchArea: value })}
                  placeholder="Research Area / Specialty"
                  extraTerms={sharedExpertSuggestionTerms}
                  className="flex-1"
                />
                <SmartSearchInput
                  value={diseaseOfInterest}
                  onChange={setDiseaseOfInterest}
                  onSubmit={(value) => search({ diseaseOfInterest: value })}
                  placeholder="Disease of Interest"
                  extraTerms={diseaseSuggestionTerms}
                  className="flex-1"
                />
                <Button
                  onClick={search}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                >
                  Search
                </Button>
              </div>

              {/* Medical Interest Toggle */}
              {userMedicalInterest && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <input
                    type="checkbox"
                    id="useMedicalInterest"
                    checked={useMedicalInterest}
                    onChange={(e) => {
                      setUseMedicalInterest(e.target.checked);
                      if (e.target.checked) {
                        setDiseaseOfInterest(userMedicalInterest);
                      } else {
                        setDiseaseOfInterest("");
                      }
                    }}
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
                  </label>
                </div>
              )}

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
            <div className="flex flex-col gap-4">
              {[...Array(8)].map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-md border border-slate-200 animate-pulse"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-200 to-slate-200 rounded-lg shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-slate-200 rounded w-60 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-40 mb-3"></div>
                        <div className="space-y-2 mb-3">
                          <div className="h-3 bg-slate-200 rounded w-full"></div>
                          <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                        </div>
                        <div className="h-20 bg-slate-100 rounded mb-3"></div>
                        <div className="flex flex-wrap gap-2">
                          <div className="h-6 w-20 bg-slate-100 rounded-md"></div>
                          <div className="h-6 w-24 bg-slate-100 rounded-md"></div>
                          <div className="h-6 w-18 bg-slate-100 rounded-md"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Section */}
          {!loading && results.length > 0 ? (
            <div className="flex flex-col gap-4">
              {results.slice(0, isSignedIn ? 10 : 3).map((expert, cardIdx) => {
                // Use name as the primary identifier
                const itemId = expert.name || expert.id || expert._id;
                const expertId = expert.name || expert.id || expert._id;
                const isExpanded = expandedCards[expertId];
                const expertPublications = publications[expertId] || [];
                const isLoadingPubs = loadingPublications[expertId];

                // Check if expert is favorited by exact name match
                const isExpertFavorited = favorites.some((fav) => {
                  if (fav.type !== "expert") return false;

                  // Check by exact name match (primary identifier)
                  if (expert.name && fav.item?.name) {
                    return fav.item.name === expert.name;
                  }

                  // Fallback: check by id
                  if (fav.item?.id === itemId || fav.item?._id === itemId) {
                    return true;
                  }

                  return false;
                });

                return (
                  <div
                    key={itemId}
                    className={`rounded-xl shadow-sm border transition-all duration-500  cursor-pointer group overflow-hidden transform hover:-translate-y-0.5 animate-fade-in ${
                      isExpanded
                        ? "bg-gradient-to-br from-indigo-50/30 via-white to-blue-50/20 shadow-lg border-indigo-400 ring-2 ring-indigo-200 ring-opacity-50"
                        : "bg-white border-slate-200 hover:shadow-lg hover:border-indigo-300"
                    }`}
                    style={{ animationDelay: `${cardIdx * 50}ms` }}
                    onClick={() => toggleCardExpansion(expert)}
                  >
                    <div
                      className={`h-1 bg-gradient-to-r transition-all duration-300 ${
                        isExpanded
                          ? "from-indigo-600 to-indigo-500"
                          : "from-indigo-500 to-blue-500 group-hover:from-indigo-600 group-hover:to-blue-600"
                      }`}
                    ></div>

                    <div className="p-3">
                      {/* Match Badge Banner */}
                      {expert.matchPercentage !== undefined && (
                        <div className="mb-2 -mt-1 -mx-3 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-xs font-bold text-purple-700">
                                {expert.matchPercentage}% Match
                              </span>
                            </div>
                            {expert.matchExplanation && (
                              <span className="text-[10px] text-purple-600 truncate flex-1 ml-1.5 max-w-[150px] sm:max-w-none">
                                {expert.matchExplanation}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0 ring-2 ring-indigo-100 group-hover:ring-indigo-300 group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110">
                          {expert.name?.charAt(0)?.toUpperCase() || "E"}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 mb-1 leading-tight group-hover:text-indigo-700 transition-colors duration-300">
                                {expert.name || "Unknown Expert"}
                              </h3>
                              {expert.orcid && (
                                <span className="text-sm text-slate-500 font-mono">
                                  {expert.orcid}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  favorite(expert);
                                }}
                                disabled={favoritingItems.has(
                                  getFavoriteKey(expert)
                                )}
                                className={`p-1 rounded-md border transition-all duration-300 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                  isExpertFavorited
                                    ? "bg-red-50 border-red-200 text-red-500 shadow-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                }`}
                                title={
                                  isExpertFavorited
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                                }
                              >
                                {favoritingItems.has(getFavoriteKey(expert)) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`w-3 h-3 transition-all duration-300 ${
                                      isExpertFavorited
                                        ? "fill-current animate-pulse"
                                        : ""
                                    }`}
                                  />
                                )}
                              </button>
                              <div
                                className={`p-0.5 rounded-md transition-all duration-300 ${
                                  isExpanded
                                    ? "bg-indigo-100 text-indigo-600"
                                    : "text-slate-500 group-hover:text-indigo-600"
                                }`}
                              >
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-500 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Basic Info */}
                          <div className="space-y-0.5 mb-1.5">
                            {expert.currentPosition && (
                              <div className="flex items-start text-sm text-slate-700">
                                <Briefcase className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                                <span className="flex-1 leading-relaxed">
                                  {expert.currentPosition}
                                </span>
                              </div>
                            )}
                            {!expert.currentPosition && expert.affiliation && (
                              <div className="flex items-start text-sm text-slate-700">
                                <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                                <span className="flex-1 leading-relaxed">
                                  {expert.affiliation}
                                </span>
                              </div>
                            )}
                            {expert.location && (
                              <div className="flex items-center text-sm text-slate-600">
                                <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                <span>{expert.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Biography */}
                          {expert.biography && (
                            <div className="mb-1.5">
                              <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                                {expert.biography}
                              </p>
                            </div>
                          )}

                          {/* Research Interests */}
                          {expert.researchInterests &&
                            Array.isArray(expert.researchInterests) &&
                            expert.researchInterests.length > 0 && (
                              <div className="mb-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {expert.researchInterests
                                    .slice(0, 5)
                                    .map((interest, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs bg-gradient-to-r from-indigo-50 to-slate-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 hover:border-indigo-300 transition-all duration-300"
                                      >
                                        {interest}
                                      </span>
                                    ))}
                                  {expert.researchInterests.length > 2 && (
                                    <span className="text-xs text-slate-500 px-2 py-0.5">
                                      +{expert.researchInterests.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Expanded Publications Section */}
                          <div
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${
                              isExpanded
                                ? "max-h-[500px] opacity-100 mt-2"
                                : "max-h-0 opacity-0 mt-0"
                            }`}
                          >
                            <div className="pt-2 border-t border-slate-200">
                              {isLoadingPubs ? (
                                <div className="flex items-center justify-center py-3">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                  <span className="ml-1.5 text-xs text-slate-600">
                                    Loading publications...
                                  </span>
                                </div>
                              ) : expertPublications.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300 to-transparent"></div>
                                    <h4 className="text-xs font-semibold text-indigo-700 flex items-center gap-1 px-1.5">
                                      <BookOpen className="w-3 h-3" />
                                      Top Publications
                                    </h4>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300 to-transparent"></div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {expertPublications
                                      .slice(0, 2)
                                      .map((pub, idx) => (
                                        <div
                                          key={idx}
                                          onClick={(e) => e.stopPropagation()}
                                          className="bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-slate-50 rounded-lg p-2 border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all duration-300 transform hover:scale-[1.01] hover:bg-indigo-100/80 group/pub"
                                        >
                                          <a
                                            href={pub.link || "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block"
                                          >
                                            <h5 className="text-xs font-semibold text-slate-900 line-clamp-2 mb-1.5 hover:text-indigo-600 leading-relaxed transition-colors group-hover/pub:text-indigo-700">
                                              {pub.title}
                                            </h5>
                                            <div className="text-xs text-slate-600 space-y-0.5">
                                              {pub.year && (
                                                <div className="font-medium text-indigo-600">
                                                  {pub.year}
                                                </div>
                                              )}
                                              {pub.citations > 0 && (
                                                <div className="text-xs text-slate-500">
                                                  {pub.citations}{" "}
                                                  {pub.citations === 1
                                                    ? "citation"
                                                    : "citations"}
                                                </div>
                                              )}
                                            </div>
                                          </a>
                                        </div>
                                      ))}
                                  </div>
                                  {expertPublications.length > 2 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDetailsModal(expert);
                                      }}
                                      className="w-full mt-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center justify-center gap-1 py-1 rounded-md hover:bg-indigo-50"
                                    >
                                      View all {expertPublications.length}{" "}
                                      publications
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <BookOpen className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                                  <p className="text-xs text-slate-500">
                                    No publications found
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const params = new URLSearchParams();
                                params.set("name", expert.name || "");
                                if (expert.affiliation)
                                  params.set("affiliation", expert.affiliation);
                                if (expert.location)
                                  params.set("location", expert.location);
                                if (expert.orcid)
                                  params.set("orcid", expert.orcid);
                                if (expert.biography)
                                  params.set("biography", expert.biography);
                                if (
                                  expert.researchInterests &&
                                  Array.isArray(expert.researchInterests)
                                ) {
                                  params.set(
                                    "researchInterests",
                                    JSON.stringify(expert.researchInterests)
                                  );
                                }
                                navigate(
                                  `/expert/profile?${params.toString()}`
                                );
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-md text-xs font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                            >
                              <User className="w-3.5 h-3.5" />
                              View Profile
                            </button>
                            {expert.email && (
                              <a
                                href={`mailto:${expert.email}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.success("Message sent successfully!");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-md text-xs font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Contact
                              </a>
                            )}
                            {expert.orcidUrl && (
                              <a
                                href={expert.orcidUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-200 hover:text-indigo-700 transition-all duration-300 transform hover:scale-105"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Profile
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailsModal(expert);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-200 hover:text-blue-700 transition-all duration-300 transform hover:scale-105"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Sign Up Message for More Results */}
          {!loading && results.length > 0 && !isSignedIn && results.length > 3 && (
            <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6 text-center shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-indigo-900">
                    Want to see more experts?
                  </h3>
                </div>
                <p className="text-sm text-indigo-700 max-w-md">
                  Sign up for free to view all {results.length} matching experts and get personalized recommendations based on your medical interests.
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
          {!loading && !isInitialLoad && results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                No Experts Found
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Try adjusting your search criteria or browse different
                categories.
              </p>
            </div>
          ) : !loading && isInitialLoad && !isSignedIn ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <User className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
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
          ) : null}
        </div>

        {/* Expert Details Modal */}
        <Modal
          isOpen={detailsModal.open}
          onClose={closeDetailsModal}
          title="Expert Details"
        >
          {detailsModal.expert && (
            <div className="space-y-6">
              {/* Header */}
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md transform hover:scale-110 transition-transform duration-300">
                    {detailsModal.expert.name?.charAt(0)?.toUpperCase() || "E"}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-lg">
                      {detailsModal.expert.name || "Unknown Expert"}
                    </h4>
                    {detailsModal.expert.orcid && (
                      <p className="text-sm text-indigo-600">
                        ORCID: {detailsModal.expert.orcid}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Position */}
              {detailsModal.expert.currentPosition && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    Current Position
                  </h4>
                  <p className="text-sm text-slate-700">
                    {detailsModal.expert.currentPosition}
                  </p>
                </div>
              )}

              {/* Affiliation */}
              {detailsModal.expert.affiliation && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Affiliation
                  </h4>
                  <p className="text-sm text-slate-700">
                    {detailsModal.expert.affiliation}
                  </p>
                </div>
              )}

              {/* Education */}
              {detailsModal.expert.education && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Education
                  </h4>
                  <p className="text-sm text-slate-700">
                    {detailsModal.expert.education}
                  </p>
                </div>
              )}

              {/* Age & Experience */}
              {(detailsModal.expert.age ||
                detailsModal.expert.yearsOfExperience) && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Age & Experience
                  </h4>
                  <div className="text-sm text-slate-700 space-y-1">
                    {detailsModal.expert.age && (
                      <p>
                        <strong>Age:</strong> {detailsModal.expert.age}
                      </p>
                    )}
                    {detailsModal.expert.yearsOfExperience && (
                      <p>
                        <strong>Experience:</strong>{" "}
                        {detailsModal.expert.yearsOfExperience}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {detailsModal.expert.location && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Location
                  </h4>
                  <p className="text-sm text-slate-700">
                    {detailsModal.expert.location}
                  </p>
                </div>
              )}

              {/* Biography */}
              {detailsModal.expert.biography && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    Biography
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {detailsModal.expert.biography}
                  </p>
                </div>
              )}

              {/* Specialties */}
              {detailsModal.expert.specialties &&
                Array.isArray(detailsModal.expert.specialties) &&
                detailsModal.expert.specialties.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Specialties
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailsModal.expert.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Research Interests */}
              {detailsModal.expert.researchInterests &&
                Array.isArray(detailsModal.expert.researchInterests) &&
                detailsModal.expert.researchInterests.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Research Interests
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailsModal.expert.researchInterests.map(
                        (interest, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full"
                          >
                            {interest}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Achievements */}
              {detailsModal.expert.achievements && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" />
                    Achievements
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {detailsModal.expert.achievements}
                  </p>
                </div>
              )}

              {/* Publications */}
              {(() => {
                const expertId =
                  detailsModal.expert.name ||
                  detailsModal.expert.id ||
                  detailsModal.expert._id;
                const expertPublications = publications[expertId] || [];
                const isLoadingPubs = loadingPublications[expertId];

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        Publications
                      </h4>
                      {expertPublications.length === 0 && (
                        <button
                          onClick={() => fetchPublications(detailsModal.expert)}
                          disabled={isLoadingPubs}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold text-sm hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md disabled:hover:from-indigo-600 disabled:hover:to-indigo-700"
                        >
                          {isLoadingPubs ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading Publications...</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-4 h-4" />
                              <span>Load Publications</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {isLoadingPubs && expertPublications.length === 0 && (
                      <div className="text-sm text-slate-600 italic">
                        Loading publications...
                      </div>
                    )}
                    {expertPublications.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {expertPublications.map((pub, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300"
                          >
                            <a
                              href={pub.link || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors block mb-1"
                            >
                              {pub.title}
                            </a>
                            {pub.snippet && (
                              <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                                {pub.snippet}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-600">
                              {pub.year && <span>{pub.year}</span>}
                              {pub.citations > 0 && (
                                <span>• {pub.citations} citations</span>
                              )}
                              {pub.publication && (
                                <span className="text-slate-600">
                                  • {pub.publication}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isLoadingPubs ? (
                      <p className="text-sm text-slate-600 italic">
                        Click "Load Publications" to fetch top publications.{" "}
                      </p>
                    ) : null}
                  </div>
                );
              })()}

              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  {detailsModal.expert.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Mail className="w-4 h-4" />
                      <a
                        href={`mailto:${detailsModal.expert.email}`}
                        onClick={() =>
                          toast.success("Message sent successfully!")
                        }
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {detailsModal.expert.email}
                      </a>
                    </div>
                  )}
                  {detailsModal.expert.orcidUrl && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <LinkIcon className="w-4 h-4" />
                      <a
                        href={detailsModal.expert.orcidUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-indigo-600 transition-colors"
                      >
                        View ORCID Profile
                      </a>
                    </div>
                  )}
                  {!detailsModal.expert.email && (
                    <p className="text-xs text-slate-600 italic">
                      Email not publicly available
                    </p>
                  )}
                </div>
              </div>

              {/* External Links */}
              {detailsModal.expert.orcidUrl && (
                <div>
                  <a
                    href={detailsModal.expert.orcidUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-white font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full ORCID Profile
                  </a>
                </div>
              )}
            </div>
          )}
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
