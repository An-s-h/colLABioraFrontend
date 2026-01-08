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
  ListChecks,
  AlertCircle,
  X,
  Plus,
  ChevronDown,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import CustomSelect from "../components/ui/CustomSelect.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { LinkPreview } from "@/components/ui/link-preview";
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

export default function Publications() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [useMedicalInterest, setUseMedicalInterest] = useState(true); // Toggle for using medical interest
  const [userMedicalInterest, setUserMedicalInterest] = useState(""); // User's medical interest
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if it's the initial load
  const [isSignedIn, setIsSignedIn] = useState(false); // Track if user is signed in
  const [user, setUser] = useState(null); // Track user state
  const [userProfile, setUserProfile] = useState(null); // Track user profile
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
    type: "",
    summary: "",
    loading: false,
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    publication: null,
  });

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [queryTerms, setQueryTerms] = useState([
    { field: "All Fields", term: "", operator: "AND" },
  ]);
  const [addedTerms, setAddedTerms] = useState([]); // Terms that have been added (confirmed)
  const [constructedQuery, setConstructedQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);

  // Essential PubMed field options (simplified list)
  const fieldOptionsList = [
    "All Fields",
    "Author",
    "Title",
    "Title/Abstract",
    "Text Word",
    "Journal",
    "MeSH Terms",
    "MeSH Major Topic",
    "Publication Type",
    "Date - Publication",
    "Publisher",
    "ISBN",
    "Book",
    "Language",
    "Volume",
    "Pagination",
  ];

  // Convert to format for CustomSelect
  const fieldOptions = fieldOptionsList.map((field) => ({
    value: field,
    label: field,
  }));

  // Operator options for CustomSelect
  const operatorOptions = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" },
    { value: "NOT", label: "NOT" },
  ];

  // Field-specific help text and examples
  const fieldHelpText = {
    "All Fields": "Search across all fields. Example: 'cancer treatment'",
    Author:
      "Format: LastName FirstInitial (e.g., 'Smith J') or LastName FirstName. PubMed searches author names in this format.",
    Title: "Search in article titles only. Example: 'breast cancer diagnosis'",
    "Title/Abstract":
      "Search in both title and abstract. Example: 'diabetes management'",
    "Text Word":
      "Search in title, abstract, and other text fields. Example: 'immunotherapy'",
    Journal:
      "Journal name abbreviation or full name. Example: 'Nature' or 'JAMA'",
    "MeSH Terms":
      "Medical Subject Headings. Example: 'Diabetes Mellitus, Type 2'",
    "MeSH Major Topic": "Major MeSH terms only. Example: 'Neoplasms'",
    "Publication Type":
      "Type of publication. Examples: 'Review', 'Clinical Trial', 'Case Reports', 'Meta-Analysis'",
    "Date - Publication":
      "Publication date range. Format: YYYY/MM/DD or YYYY. Example: '2020:2024' or '2023/01/01:2023/12/31'",
    Publisher: "Publisher name. Example: 'Elsevier' or 'Springer'",
    ISBN: "International Standard Book Number. Example: '9780123456789'",
    Book: "Book title or chapter. Example: 'Harrison's Principles of Internal Medicine'",
    Language:
      "Language code. Examples: 'English', 'Spanish', 'French', 'German'",
    Volume: "Journal volume number. Example: '15' or '2023'",
    Pagination: "Page numbers. Example: '123-145' or '123'",
  };

  const publicationSuggestionTerms = [userMedicalInterest].filter(Boolean);

  // Advanced search functions
  const addQueryTerm = () => {
    // Only add a new term if the current term has content
    const lastTerm = queryTerms[queryTerms.length - 1];
    if (lastTerm && lastTerm.term.trim()) {
      // Add the current term to addedTerms (confirmed terms)
      setAddedTerms([...addedTerms, { ...lastTerm }]);
      // Build query with all added terms
      buildQueryFromAddedTerms([...addedTerms, { ...lastTerm }]);
      // Reset current term and add new empty term
      setQueryTerms([{ field: "All Fields", term: "", operator: "AND" }]);
    }
  };

  const removeQueryTerm = (index) => {
    if (queryTerms.length > 1) {
      setQueryTerms(queryTerms.filter((_, i) => i !== index));
    }
  };

  const updateQueryTerm = (index, field, value) => {
    const updated = [...queryTerms];
    updated[index] = { ...updated[index], [field]: value };
    setQueryTerms(updated);
    // Don't build query automatically - only when ADD is pressed
  };

  const buildQueryFromAddedTerms = (terms = addedTerms) => {
    const queryParts = terms
      .filter((t) => t.term.trim())
      .map((t) => {
        if (t.field === "All Fields") {
          return t.term;
        }
        // Map field names to PubMed field tags (simplified essential fields)
        const fieldMap = {
          Author: "[AU]",
          Title: "[TI]",
          "Title/Abstract": "[TIAB]",
          "Text Word": "[TW]",
          Journal: "[TA]",
          "MeSH Terms": "[MH]",
          "MeSH Major Topic": "[MAJR]",
          "Publication Type": "[PT]",
          "Date - Publication": "[PDAT]",
          Publisher: "[PU]",
          ISBN: "[ISBN]",
          Book: "[BOOK]",
          Language: "[LA]",
          Volume: "[VI]",
          Pagination: "[PG]",
        };
        const fieldTag = fieldMap[t.field] || `[${t.field}]`;
        let termValue = t.term.trim();

        // For Author field, format for better exact matching in PubMed
        if (t.field === "Author") {
          // PubMed author search works best with "LastName FirstInitial" or "LastName FirstName"
          // Wrap in quotes for exact phrase matching
          // Remove extra spaces and format properly
          termValue = termValue.replace(/\s+/g, " ").trim();
          // If it contains quotes already, don't add more
          if (!termValue.startsWith('"') && !termValue.endsWith('"')) {
            termValue = `"${termValue}"`;
          }
        }

        return `${termValue}${fieldTag}`;
      });

    if (queryParts.length === 0) {
      setConstructedQuery("");
      return;
    }

    // Combine with operators
    let query = queryParts[0];
    for (let i = 1; i < queryParts.length; i++) {
      const operator = terms[i].operator || "AND";
      query += ` ${operator} ${queryParts[i]}`;
    }
    setConstructedQuery(query);
  };

  const addToQuery = () => {
    buildQueryFromAddedTerms();
    if (constructedQuery) {
      setQ(constructedQuery);
      setShowAdvancedSearch(false);
    }
  };

  const executeAdvancedSearch = () => {
    // Check if there are any added terms or if current term should be added first
    const lastTerm = queryTerms[queryTerms.length - 1];
    let finalAddedTerms = [...addedTerms];

    // If current term has content, add it first
    if (lastTerm && lastTerm.term.trim()) {
      finalAddedTerms = [...addedTerms, { ...lastTerm }];
      setAddedTerms(finalAddedTerms);
      setQueryTerms([{ field: "All Fields", term: "", operator: "AND" }]);
    }

    buildQueryFromAddedTerms(finalAddedTerms);

    // Check if there are any valid terms before searching
    if (constructedQuery && finalAddedTerms.length > 0) {
      setQ(constructedQuery);
      // Add to search history
      const historyItem = {
        query: constructedQuery,
        terms: finalAddedTerms,
        timestamp: new Date().toISOString(),
        results: results.length,
      };
      setSearchHistory([historyItem, ...searchHistory.slice(0, 9)]);
      search(constructedQuery);
      setShowAdvancedSearch(false); // Close modal after search
    } else {
      toast.error("Please add at least one search term before searching");
    }
  };

  const clearQuery = () => {
    setQueryTerms([{ field: "All Fields", term: "", operator: "AND" }]);
    setAddedTerms([]);
    setConstructedQuery("");
    setQ("");
  };

  // Remove auto-build - query only builds when ADD is pressed

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
    // Determine if user is patient or researcher
    const isPatient = userProfile?.patient !== undefined;
    const isResearcher = userProfile?.researcher !== undefined;
    // Default to patient if profile not loaded (simplified view)
    const shouldSimplify = isPatient || (!isPatient && !isResearcher);

    const title = item.title || "Publication";
    const text = [
      item.title || "",
      item.journal || "",
      item.abstract || "",
      Array.isArray(item.authors)
        ? item.authors.join(", ")
        : item.authors || "",
      item.year || "",
    ]
      .filter(Boolean)
      .join(" ");

    setSummaryModal({
      open: true,
      title,
      type: "publication",
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
          type: "publication",
          simplify: shouldSimplify, // Simplify for patients, technical for researchers
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
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#2F3C96", "#474F97", "#757BB1", "#B8A5D5", "#D0C4E2"]}
              >
                Explore Publications
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Search through recent research and medical publications
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
                  onSubmit={(value) => search(value)}
                  placeholder="Search by keyword, author, or topic..."
                  extraTerms={publicationSuggestionTerms}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                  >
                    {showAdvancedSearch ? "Hide" : "Advanced"}
                  </Button>
                  <Button
                    onClick={search}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
                  >
                    Search
                  </Button>
                </div>
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

          {/* Advanced Search Modal */}
          <Modal
            isOpen={showAdvancedSearch}
            onClose={() => setShowAdvancedSearch(false)}
            title="Advanced Search"
          >
            <div className="space-y-4">
              {/* Display added terms as chips - only show confirmed added terms */}
              {addedTerms.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-slate-600 mb-2">
                    Added Terms:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {addedTerms.map((term, index) => {
                      const prevTerm = index > 0 ? addedTerms[index - 1] : null;
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 group hover:bg-indigo-100 transition-colors"
                        >
                          {prevTerm && (
                            <span className="text-xs font-medium text-indigo-700 mr-1">
                              {term.operator || "AND"}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-indigo-700">
                            {term.field === "All Fields"
                              ? ""
                              : `${term.field} - `}
                          </span>
                          <span className="text-xs text-slate-700">
                            {term.term}
                          </span>
                          <button
                            onClick={() => {
                              const updated = addedTerms.filter(
                                (_, i) => i !== index
                              );
                              setAddedTerms(updated);
                              buildQueryFromAddedTerms(updated);
                            }}
                            className="ml-1 p-0.5 hover:bg-indigo-200 rounded-full transition-colors"
                            title="Remove term"
                          >
                            <X className="w-3 h-3 text-indigo-600" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add new term form */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">
                  Add terms to the query box
                </h3>
                <div className="space-y-3">
                  {queryTerms.map((term, index) => (
                    <div key={index}>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        {index > 0 && (
                          <div className="w-full sm:w-auto">
                            <CustomSelect
                              value={term.operator}
                              onChange={(value) =>
                                updateQueryTerm(index, "operator", value)
                              }
                              options={operatorOptions}
                              className="w-full sm:w-auto"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-[150px]">
                          <CustomSelect
                            value={term.field}
                            onChange={(value) =>
                              updateQueryTerm(index, "field", value)
                            }
                            options={fieldOptions}
                            placeholder="Select field..."
                            className="w-full"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={term.term}
                            onChange={(e) =>
                              updateQueryTerm(index, "term", e.target.value)
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && term.term.trim()) {
                                e.preventDefault();
                                addQueryTerm();
                                // Focus on the new term input if it exists
                                setTimeout(() => {
                                  const inputs =
                                    document.querySelectorAll(
                                      'input[type="text"]'
                                    );
                                  const lastInput = inputs[inputs.length - 1];
                                  if (lastInput) lastInput.focus();
                                }, 100);
                              }
                            }}
                            placeholder={
                              term.field === "Author"
                                ? "e.g., Smith J or Smith John"
                                : term.field === "Date - Publication"
                                ? "e.g., 2020:2024 or 2023/01/01:2023/12/31"
                                : term.field === "Publication Type"
                                ? "e.g., Review, Clinical Trial, Case Reports"
                                : term.field === "Journal"
                                ? "e.g., Nature, JAMA, New England Journal"
                                : term.field === "MeSH Terms"
                                ? "e.g., Diabetes Mellitus, Type 2"
                                : term.field === "Language"
                                ? "e.g., English, Spanish, French"
                                : "Enter a search term"
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                          />
                        </div>
                        <Button
                          onClick={() => addQueryTerm()}
                          disabled={!term.term.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          ADD
                        </Button>
                      </div>
                      {/* Help text below input box only - aligned with first input position */}
                      {term.field !== "All Fields" && (
                        <div className="mt-1 mb-2 ">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {fieldHelpText[term.field]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Query box
                </h3>
                <textarea
                  value={constructedQuery}
                  onChange={(e) => {
                    setConstructedQuery(e.target.value);
                    setQ(e.target.value);
                  }}
                  placeholder="Enter / edit your search query here"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-y"
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={executeAdvancedSearch}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg text-sm font-medium flex-1"
                  >
                    Search
                  </Button>
                  <Button
                    onClick={clearQuery}
                    className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </Modal>

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
                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full animate-fade-in"
                      style={{
                        borderColor: "rgba(208, 196, 226, 0.3)",
                        animationDelay: `${cardIdx * 50}ms`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 10px 15px -3px rgba(47, 60, 150, 0.1), 0 4px 6px -2px rgba(47, 60, 150, 0.05)";
                        e.currentTarget.style.borderColor =
                          "rgba(47, 60, 150, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
                        e.currentTarget.style.borderColor =
                          "rgba(208, 196, 226, 0.3)";
                      }}
                    >
                      <div className="p-5 flex flex-col flex-grow">
                        {/* Match Progress Bar */}
                        {pub.matchPercentage !== undefined && (
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
                                  {pub.matchPercentage}% Match
                                </span>
                              </div>
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
                                  width: `${pub.matchPercentage}%`,
                                  background:
                                    "linear-gradient(90deg, #2F3C96, #253075)",
                                }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Publication Title */}
                        <div className="mb-4">
                          <h3
                            className="text-lg font-bold mb-0 line-clamp-3 leading-snug"
                            style={{ color: "#2F3C96" }}
                          >
                            {pub.title || "Untitled Publication"}
                          </h3>
                        </div>

                        {/* Basic Info - Authors and Published Date */}
                        <div className="space-y-1.5 mb-4">
                          {pub.authors &&
                            Array.isArray(pub.authors) &&
                            pub.authors.length > 0 && (
                              <div
                                className="flex items-center text-sm"
                                style={{ color: "#787878" }}
                              >
                                <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                                <span className="line-clamp-1">
                                  {pub.authors.join(", ")}
                                </span>
                              </div>
                            )}
                          {(pub.year || pub.month) && (
                            <div
                              className="flex items-center text-sm"
                              style={{ color: "#787878" }}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                              <span>
                                {pub.month && pub.month + " "}
                                {pub.year || ""}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Abstract Preview */}
                        {pub.abstract && (
                          <div className="mb-4 flex-grow">
                            <button
                              onClick={() => openDetailsModal(pub)}
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
                                      {pub.abstract}
                                    </span>
                                  </div>
                                  <div
                                    className="mt-1.5 flex items-center gap-1 font-medium transition-all duration-200"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    <span>View full details</span>
                                    <span className="inline-block group-hover:translate-x-0.5 transition-transform duration-200">
                                      →
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        )}

                        {/* Spacer for cards without abstract */}
                        {!pub.abstract && <div className="flex-grow"></div>}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => generateSummary(pub)}
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
                            <Sparkles className="w-4 h-4" />
                            Understand this Paper
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
                                : ""
                            }`}
                            style={
                              !favorites.some(
                                (fav) =>
                                  fav.type === "publication" &&
                                  (fav.item?.id === itemId ||
                                    fav.item?._id === itemId ||
                                    fav.item?.pmid === itemId)
                              )
                                ? {
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                    color: "#787878",
                                  }
                                : {}
                            }
                            onMouseEnter={(e) => {
                              const isFavorited = favorites.some(
                                (fav) =>
                                  fav.type === "publication" &&
                                  (fav.item?.id === itemId ||
                                    fav.item?._id === itemId ||
                                    fav.item?.pmid === itemId)
                              );
                              if (!isFavorited && !e.currentTarget.disabled) {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.3)";
                                e.currentTarget.style.color = "#dc2626";
                              }
                            }}
                            onMouseLeave={(e) => {
                              const isFavorited = favorites.some(
                                (fav) =>
                                  fav.type === "publication" &&
                                  (fav.item?.id === itemId ||
                                    fav.item?._id === itemId ||
                                    fav.item?.pmid === itemId)
                              );
                              if (!isFavorited) {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(208, 196, 226, 0.2)";
                                e.currentTarget.style.color = "#787878";
                              }
                            }}
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
              <div className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-24">
                {/* Header */}
                <div
                  className="pb-4 border-b"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h3
                    className="text-xl font-bold mb-3 leading-tight"
                    style={{ color: "#2F3C96" }}
                  >
                    {detailsModal.publication.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detailsModal.publication.pmid && (
                      <span
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                        style={{
                          backgroundColor: "rgba(47, 60, 150, 0.15)",
                          color: "#2F3C96",
                          borderColor: "rgba(47, 60, 150, 0.3)",
                        }}
                      >
                        <FileText className="w-3 h-3 mr-1.5" />
                        PMID: {detailsModal.publication.pmid}
                      </span>
                    )}
                    {detailsModal.publication.journal && (
                      <span
                        className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
                          color: "#787878",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <BookOpen className="w-3 h-3 mr-1.5" />
                        {detailsModal.publication.journal}
                      </span>
                    )}
                  </div>
                </div>

                {/* Abstract Section - Moved to Top */}
                {detailsModal.publication.abstract && (
                  <div>
                    <div
                      className="rounded-xl p-5 border"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(208, 196, 226, 0.2), rgba(232, 224, 239, 0.2))",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <h4
                        className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                        style={{ color: "#2F3C96" }}
                      >
                        <Info className="w-4 h-4" />
                        Abstract
                      </h4>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ color: "#787878" }}
                      >
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
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <User className="w-4 h-4" />
                          Authors
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {detailsModal.publication.authors.join(", ")}
                        </p>
                        {detailsModal.publication.authors.length > 1 && (
                          <p
                            className="text-xs mt-2"
                            style={{ color: "#787878" }}
                          >
                            {detailsModal.publication.authors.length} authors
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {/* Publication Metadata Cards */}
                <div>
                  <div
                    className="bg-white rounded-xl p-5 border shadow-sm"
                    style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                  >
                    <h4
                      className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"
                      style={{ color: "#2F3C96" }}
                    >
                      <Calendar className="w-4 h-4" />
                      Publication Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Publication Date */}
                      {(detailsModal.publication.year ||
                        detailsModal.publication.month) && (
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.1)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Calendar
                              className="w-3.5 h-3.5"
                              style={{ color: "#787878" }}
                            />
                            <span
                              className="text-xs font-medium uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              Published
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
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
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.1)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen
                              className="w-3.5 h-3.5"
                              style={{ color: "#787878" }}
                            />
                            <span
                              className="text-xs font-medium uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              Volume / Issue
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            {detailsModal.publication.volume || "N/A"}
                            {detailsModal.publication.issue
                              ? ` (Issue ${detailsModal.publication.issue})`
                              : ""}
                          </p>
                        </div>
                      )}

                      {/* Pages */}
                      {detailsModal.publication.Pages && (
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.1)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <FileText
                              className="w-3.5 h-3.5"
                              style={{ color: "#787878" }}
                            />
                            <span
                              className="text-xs font-medium uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              Pages
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            {detailsModal.publication.Pages}
                          </p>
                        </div>
                      )}

                      {/* Language */}
                      {detailsModal.publication.language && (
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.1)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-xs font-medium uppercase tracking-wide"
                              style={{ color: "#787878" }}
                            >
                              Language
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
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
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <TrendingUp className="w-4 h-4" />
                          Keywords
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {detailsModal.publication.keywords.map(
                            (keyword, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border"
                                style={{
                                  backgroundColor: "rgba(47, 60, 150, 0.15)",
                                  color: "#2F3C96",
                                  borderColor: "rgba(47, 60, 150, 0.3)",
                                }}
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
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <Info className="w-4 h-4" />
                          MeSH Terms
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {detailsModal.publication.meshTerms
                            .slice(0, 10)
                            .map((term, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border"
                                style={{
                                  backgroundColor: "rgba(208, 196, 226, 0.2)",
                                  color: "#787878",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                {term}
                              </span>
                            ))}
                          {detailsModal.publication.meshTerms.length > 10 && (
                            <span
                              className="px-3 py-1.5 text-xs"
                              style={{ color: "#787878" }}
                            >
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
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <MapPin className="w-4 h-4" />
                          Affiliation
                        </h4>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {detailsModal.publication.affiliations[0]}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Publication Types */}
                {detailsModal.publication.publicationTypes &&
                  detailsModal.publication.publicationTypes.length > 0 && (
                    <div>
                      <div
                        className="bg-white rounded-xl p-5 border shadow-sm"
                        style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                      >
                        <h4
                          className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"
                          style={{ color: "#2F3C96" }}
                        >
                          <FileText className="w-4 h-4" />
                          Publication Type
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {detailsModal.publication.publicationTypes.map(
                            (type, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border"
                                style={{
                                  backgroundColor: "rgba(208, 196, 226, 0.2)",
                                  color: "#787878",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
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
              <div
                className="bottom-0 px-6 py-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <div className="flex flex-wrap gap-3">
                  {detailsModal.publication.url && (
                    <a
                      href={detailsModal.publication.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      style={{
                        background: "linear-gradient(135deg, #2F3C96, #253075)",
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
                      <ExternalLink className="w-4 h-4" />
                      View on PubMed
                    </a>
                  )}
                  <button
                    onClick={() => favorite(detailsModal.publication)}
                    disabled={favoritingItems.has(
                      getFavoriteKey(detailsModal.publication)
                    )}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={
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
                        ? {
                            backgroundColor: "#fee2e2",
                            borderColor: "#fecaca",
                            color: "#dc2626",
                          }
                        : {
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                            borderColor: "rgba(208, 196, 226, 0.3)",
                            color: "#787878",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (
                        !favorites.some(
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
                      ) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(208, 196, 226, 0.3)";
                        e.currentTarget.style.color = "#2F3C96";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (
                        !favorites.some(
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
                      ) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(208, 196, 226, 0.2)";
                        e.currentTarget.style.color = "#787878";
                      }
                    }}
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
                Research Publication
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
            ) : summaryModal.type === "publication" &&
              summaryModal.summary &&
              typeof summaryModal.summary === "object" &&
              summaryModal.summary.structured ? (
              // Structured Publication Summary with Visual Aids
              <div className="space-y-5 py-2">
                {/* Core Message - Most Important First */}
                {summaryModal.summary.coreMessage && (
                  <div
                    className="rounded-xl p-5 border-2 shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232, 224, 239, 0.6), rgba(245, 242, 248, 0.8))",
                      borderColor: "rgba(208, 196, 226, 0.6)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: "#2F3C96" }}
                      >
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-bold text-base mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          Key Finding
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#253075" }}
                        >
                          {summaryModal.summary.coreMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What Section */}
                {summaryModal.summary.what && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#2F3C96" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <FileText
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#2F3C96" }}
                          >
                            1
                          </span>
                          What This Study Was About
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.what}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Why Section */}
                {summaryModal.summary.why && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#D0C4E2" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <Heart
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#D0C4E2" }}
                          >
                            2
                          </span>
                          Why This Research Matters
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.why}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* How Section */}
                {summaryModal.summary.how && (
                  <div
                    className="bg-white rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: "#253075" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <ListChecks
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#253075" }}
                          >
                            3
                          </span>
                          How They Did The Study
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.how}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* So What Section */}
                {summaryModal.summary.soWhat && (
                  <div
                    className="rounded-lg p-4 border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232, 224, 239, 0.4), rgba(245, 242, 248, 0.6))",
                      borderLeftColor: "#D0C4E2",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      >
                        <TrendingUp
                          className="w-4 h-4"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-semibold text-sm mb-2 flex items-center gap-2"
                          style={{ color: "#2F3C96" }}
                        >
                          <span
                            className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#D0C4E2" }}
                          >
                            4
                          </span>
                          What This Means For You
                        </h5>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#787878" }}
                        >
                          {summaryModal.summary.soWhat}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Takeaway */}
                {summaryModal.summary.keyTakeaway && (
                  <div
                    className="rounded-xl p-4 border-2 shadow-sm"
                    style={{
                      backgroundColor: "rgba(232, 224, 239, 0.3)",
                      borderColor: "rgba(208, 196, 226, 0.6)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "#2F3C96" }}
                      >
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h5
                          className="font-bold text-sm mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          Remember This
                        </h5>
                        <p
                          className="text-sm leading-relaxed font-medium"
                          style={{ color: "#253075" }}
                        >
                          {summaryModal.summary.keyTakeaway}
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
