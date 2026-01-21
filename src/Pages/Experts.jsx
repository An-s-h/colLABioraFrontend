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
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { AuroraText } from "@/components/ui/aurora-text";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
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
  const [expertSource, setExpertSource] = useState("platform"); // "global" or "platform"
  const [isSignedIn, setIsSignedIn] = useState(false); // Track if user is signed in
  const [user, setUser] = useState(null); // Track user state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); // Start with loading false - no initial search
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const { checkAndUseSearch, getRemainingSearches } = useFreeSearches();
  const [publications, setPublications] = useState({}); // Map of expert name/id to publications array
  const [loadingPublications, setLoadingPublications] = useState({}); // Map of expert name/id to loading state
  const [expandedCards, setExpandedCards] = useState({}); // Map of expert name/id to expanded state
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    expert: null,
  });

  // Determine if user is a researcher to show "Collaborators" instead of "Experts"
  const isResearcher = user?.role === "researcher";
  const expertLabel = isResearcher ? "Collaborator" : "Expert";
  const expertsLabel = isResearcher ? "Collaborators" : "Experts";

  const sharedExpertSuggestionTerms = [];

  const diseaseSuggestionTerms = [
    ...sharedExpertSuggestionTerms,
    userMedicalInterest,
  ].filter(Boolean);

  async function search(overrides = {}) {
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
    setResults([]);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const params = new URLSearchParams();
    const user = userData;
    const nextResearchArea =
      overrides.researchArea !== undefined
        ? overrides.researchArea
        : researchArea;
    const nextDiseaseOfInterest =
      overrides.diseaseOfInterest !== undefined
        ? overrides.diseaseOfInterest
        : diseaseOfInterest;

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

    // Determine which endpoint to use based on expertSource
    const endpoint = expertSource === "platform" 
      ? "/api/search/experts/platform"
      : "/api/search/experts";

    // For platform experts, use different query structure
    if (expertSource === "platform") {
      // Allow browsing all experts if no search terms provided
      if (currentResearchArea) {
        params.set("researchArea", currentResearchArea);
      }
      if (currentDiseaseOfInterest) {
        params.set("diseaseOfInterest", currentDiseaseOfInterest);
      }
      
      // Add location
      let locationStr = null;
      if (locationMode === "current" && userLocation) {
        locationStr = [userLocation.city, userLocation.country]
          .filter(Boolean)
          .join(", ");
        if (locationStr) {
          params.set("location", locationStr);
        }
      } else if (locationMode === "custom" && location.trim()) {
        params.set("location", location.trim());
        locationStr = location.trim();
      }

      // Add user profile data for matching
      if (userData?._id || userData?.id) {
        params.set("userId", userData._id || userData.id);
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
    } else {
      // For global experts, use the existing query structure
      // Build search query: "researchArea in diseaseOfInterest in location"
      const searchQueryParts = [];

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
      if (userData?._id || userData?.id) {
        params.set("userId", userData._id || userData.id);
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
    }

    try {
      const response = await apiFetch(
        `${endpoint}?${params.toString()}`
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

      if (!response.ok) {
        // Handle 503 or other errors
        const errorMsg = data.error || "Failed to search experts";
        toast.error(errorMsg);
        setResults([]);
      } else {
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
            expertSource,
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
          toast.error(`No ${expertsLabel.toLowerCase()} found. Try adjusting your search criteria.`);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      toast.error(`Failed to search ${expertsLabel.toLowerCase()}. Please try again later.`);
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

    setResearchArea(filterValue);
    setDiseaseOfInterest("");
    setIsInitialLoad(false); // Mark initial load as complete when user performs quick search
    setLoading(true);
    setResults([]);
    setTimeout(async () => {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const params = new URLSearchParams();
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      // Determine which endpoint to use based on expertSource
      const endpoint = expertSource === "platform" 
        ? "/api/search/experts/platform"
        : "/api/search/experts";

      // For platform experts, use different query structure
      if (expertSource === "platform") {
        params.set("researchArea", filterValue);
        
        // Add location
        let locationStr = null;
        if (locationMode === "current" && userLocation) {
          locationStr = [userLocation.city, userLocation.country]
            .filter(Boolean)
            .join(", ");
          if (locationStr) {
            params.set("location", locationStr);
          }
        } else if (locationMode === "custom" && location.trim()) {
          params.set("location", location.trim());
          locationStr = location.trim();
        }

        // Add user profile data for matching
        if (userData?._id || userData?.id) {
          params.set("userId", userData._id || userData.id);
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
      } else {
        // For global experts, use the existing query structure
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
        if (userData?._id || userData?.id) {
          params.set("userId", userData._id || userData.id);
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
      }

      try {
        const response = await apiFetch(
          `${endpoint}?${params.toString()}`
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

        if (!response.ok) {
          const errorMsg = data.error || "Failed to search experts";
          toast.error(errorMsg);
          setResults([]);
        } else {
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
            expertSource,
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
        toast.error(`Failed to search ${expertsLabel.toLowerCase()}. Please try again later.`);
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
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    if (!userData?._id && !userData?.id) {
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
            userData._id || userData.id
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
          `${base}/api/favorites/${userData._id || userData.id}`,
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
        `${base}/api/favorites/${userData._id || userData.id}`
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
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");
    if (userData?._id && token) {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      fetch(`${base}/api/favorites/${userData._id || userData.id}`)
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
        setExpertSource(state.expertSource || "platform");
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
      setExpertSource("platform");
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

  // Check for guest info or URL parameters, then fetch user profile
  useEffect(() => {
    // Skip if we've already done the initial fetch
    if (initialFetchDone.current) return;

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

    // If URL has a query, set it as research area
    if (urlQuery) {
      setResearchArea(urlQuery);
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
          setDiseaseOfInterest(condition);
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
          !sessionStorage.getItem("experts_search_state")
        ) {
          setUseMedicalInterest(true);
        } else {
          setUseMedicalInterest(false);
        }
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
          const medicalInterest = userData.medicalInterests[0];
          setUserMedicalInterest(medicalInterest); // Use first medical interest

          // Don't auto-search - user must manually search
          // Just update medical interest info
          setUseMedicalInterest(true);
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
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8 ">
          {/* Compact Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#2F3C96", "#474F97", "#757BB1", "#B8A5D5", "#D0C4E2"]}
              >
                Explore Health {expertsLabel}
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              {isResearcher && isSignedIn
                ? "What would you like to collaborate on?"
                : "Connect with medical professionals and researchers worldwide"}
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

              {/* Expert Source Toggle */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-700">
                    {expertsLabel} Source:
                  </span>
                  <button
                    onClick={() => {
                      setExpertSource("global");
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      expertSource === "global"
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Global {expertsLabel}
                  </button>
                  <button
                    onClick={() => {
                      setExpertSource("platform");
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      expertSource === "platform"
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Platform {expertsLabel}
                  </button>
                </div>
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
                    className={`rounded-xl shadow-sm border transition-all duration-300 cursor-pointer group overflow-hidden transform hover:-translate-y-0.5 animate-fade-in ${
                      isExpanded
                        ? "bg-white shadow-lg border-indigo-300 ring-1 ring-indigo-200 ring-opacity-50"
                        : "bg-white border-slate-200 hover:shadow-lg hover:border-indigo-300"
                    }`}
                    style={{ animationDelay: `${cardIdx * 50}ms` }}
                    onClick={() => toggleCardExpansion(expert)}
                  >
                    <div className="p-5">
                      {/* Match Badge Banner */}
                      {expert.matchPercentage !== undefined && (
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
                                {expert.matchPercentage}% Match
                              </span>
                            </div>
                            {expert.matchExplanation && (
                              <span
                                className="text-xs truncate flex-1 ml-1.5 max-w-[150px] sm:max-w-none"
                                style={{ color: "#2F3C96" }}
                              >
                                {expert.matchExplanation}
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
                                width: `${expert.matchPercentage}%`,
                                background:
                                  "linear-gradient(90deg, #2F3C96, #253075)",
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0 transition-all duration-300 group-hover:shadow-lg">
                          {expert.name?.charAt(0)?.toUpperCase() || "E"}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-indigo-600" />
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                  {expertLabel}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-slate-900 mb-1">
                                {expert.name || `Unknown ${expertLabel}`}
                              </h3>
                              {expert.orcid && (
                                <p className="text-xs text-indigo-600 mt-0.5">
                                  ORCID: {expert.orcid}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  favorite(expert);
                                }}
                                disabled={favoritingItems.has(
                                  getFavoriteKey(expert)
                                )}
                                className={`p-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isExpertFavorited
                                    ? "bg-red-50 text-red-500 hover:bg-red-100"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                }`}
                                title={
                                  isExpertFavorited
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                                }
                              >
                                {favoritingItems.has(getFavoriteKey(expert)) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`w-4 h-4 transition-all duration-300 ${
                                      isExpertFavorited
                                        ? "fill-current"
                                        : ""
                                    }`}
                                  />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCardExpansion(expert);
                                }}
                                className={`p-2 rounded-lg transition-all duration-300 ${
                                  isExpanded
                                    ? "bg-indigo-100 text-indigo-600"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                                }`}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-500 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Basic Info */}
                          <div className="space-y-1 mb-3">
                            {expert.currentPosition && (
                              <p className="text-xs text-slate-700 line-clamp-1">
                                {expert.currentPosition}
                              </p>
                            )}
                            {!expert.currentPosition && expert.affiliation && (
                              <p className="text-xs text-slate-700 line-clamp-1">
                                {expert.affiliation}
                              </p>
                            )}
                            {expert.location && (
                              <div className="flex items-center text-xs text-slate-600">
                                <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                                <span>{expert.location}</span>
                              </div>
                            )}
                            {/* Biography */}
                            {expert.biography && (
                              <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                                {expert.biography}
                              </p>
                            )}
                            {/* Research Interests */}
                            {expert.researchInterests &&
                              Array.isArray(expert.researchInterests) &&
                              expert.researchInterests.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {expert.researchInterests
                                    .slice(0, 3)
                                    .map((interest, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"
                                      >
                                        {interest}
                                      </span>
                                    ))}
                                  {expert.researchInterests.length > 3 && (
                                    <span className="text-xs text-slate-600">
                                      +{expert.researchInterests.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>

                          {/* Expanded Publications Section */}
                          <div
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${
                              isExpanded
                                ? "max-h-[500px] opacity-100 mt-3"
                                : "max-h-0 opacity-0 mt-0"
                            }`}
                          >
                            <div className="pt-3 border-t border-slate-200">
                              {isLoadingPubs ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                  <span className="ml-2 text-sm text-slate-600">
                                    Loading publications...
                                  </span>
                                </div>
                              ) : expertPublications.length > 0 ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-4 h-4 text-indigo-600" />
                                    <h4 className="text-sm font-semibold text-indigo-700">
                                      Top Publications
                                    </h4>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {expertPublications
                                      .slice(0, 2)
                                      .map((pub, idx) => (
                                        <div
                                          key={idx}
                                          onClick={(e) => e.stopPropagation()}
                                          className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-300"
                                        >
                                          <a
                                            href={pub.link || "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block"
                                          >
                                            <h5 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2 hover:text-indigo-600 transition-colors">
                                              {pub.title}
                                            </h5>
                                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                              {pub.year && (
                                                <span className="font-medium text-indigo-600">
                                                  {pub.year}
                                                </span>
                                              )}
                                              {pub.citations > 0 && (
                                                <span>
                                                  {pub.citations}{" "}
                                                  {pub.citations === 1
                                                    ? "citation"
                                                    : "citations"}
                                                </span>
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
                                      className="w-full text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-indigo-50"
                                    >
                                      View all {expertPublications.length}{" "}
                                      publications
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                  <p className="text-sm text-slate-500">
                                    No publications found
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
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
                              className="flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                              style={{
                                background:
                                  "linear-gradient(135deg, #2F3C96, #253075)",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background =
                                  "linear-gradient(135deg, #253075, #1C2454)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background =
                                  "linear-gradient(135deg, #2F3C96, #253075)";
                              }}
                            >
                              <User className="w-4 h-4" />
                              View Profile
                            </button>
                            {expert.email && (
                              <a
                                href={`mailto:${expert.email}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.success("Message sent successfully!");
                                }}
                                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors"
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
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {expert.orcidUrl && (
                              <a
                                href={expert.orcidUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors"
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
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailsModal(expert);
                              }}
                              className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors"
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
          {!loading &&
            results.length > 0 &&
            !isSignedIn &&
            results.length > 3 && (
              <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6 text-center shadow-lg">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-indigo-900">
                      Want to see more {expertsLabel.toLowerCase()}?
                    </h3>
                  </div>
                  <p className="text-sm text-indigo-700 max-w-md">
                    Sign up for free to view all {results.length} matching
                    {expertsLabel.toLowerCase()} and get personalized recommendations based on your
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
              </div>
            )}

          {/* Empty State */}
          {!loading && !isInitialLoad && results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-slate-200 animate-fade-in">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                No {expertsLabel} Found
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
          title={`${expertLabel} Details`}
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
                      {detailsModal.expert.name || `Unknown ${expertLabel}`}
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
