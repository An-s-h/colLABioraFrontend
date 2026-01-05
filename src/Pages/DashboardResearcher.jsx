import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  FileText,
  Beaker,
  Star,
  MessageCircle,
  User,
  Sparkles,
  Heart,
  MapPin,
  Link as LinkIcon,
  Calendar as CalendarIcon,
  MoreVertical,
  Info,
  Calendar,
  ExternalLink,
  BookOpen,
  UserPlus,
  Check,
  Bell,
  Send,
  Filter,
  Edit3,
  Briefcase,
  Building2,
  Mail,
  Activity,
  ListChecks,
  CheckCircle,
  TrendingUp,
  GraduationCap,
  Award,
  Loader2,
  AlertCircle,
  MessageSquare,
  Clock,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import { MultiStepLoader } from "../components/ui/multi-step-loader";
import { useProfile } from "../contexts/ProfileContext.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import ScrollToTop from "../components/ui/ScrollToTop.jsx";
import VerifyEmailModal from "../components/VerifyEmailModal.jsx";
import { listenForMessages } from "../utils/crossTabSync.js";

export default function DashboardResearcher() {
  const [data, setData] = useState({
    trials: [],
    publications: [],
    experts: [], // Collabiora Experts (from recommendations)
  });
  const [globalExperts, setGlobalExperts] = useState([]); // Global Experts (from external search, loaded on initial page load)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Track if this is the first load (cache miss)
  const [selectedCategory, setSelectedCategory] = useState("profile"); // "profile", "collaborators", "forums", "publications", "trials", "favorites"
  const [trialFilter, setTrialFilter] = useState("RECRUITING"); // Status filter for trials - default to RECRUITING
  const [forumsCategories, setForumsCategories] = useState([]);
  const [forumThreads, setForumThreads] = useState({}); // Map of categoryId to threads array
  const [publicationSort, setPublicationSort] = useState("relevance"); // Sort option for publications
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [userProfile, setUserProfile] = useState(null);
  const [verifyEmailModalOpen, setVerifyEmailModalOpen] = useState(false);
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
    isSimplified: false,
    originalSummary: null,
    originalItem: null,
  });
  const [collaboratorModal, setCollaboratorModal] = useState({
    open: false,
    collaborator: null,
  });
  const [messageModal, setMessageModal] = useState({
    open: false,
    collaborator: null,
    body: "",
  });
  const [followingStatus, setFollowingStatus] = useState({});
  const [trialDetailsModal, setTrialDetailsModal] = useState({
    open: false,
    trial: null,
    loading: false,
  });
  const [contactModal, setContactModal] = useState({
    open: false,
    trial: null,
    message: "",
    sent: false,
    generating: false,
  });
  const [publicationDetailsModal, setPublicationDetailsModal] = useState({
    open: false,
    publication: null,
  });
  const [expertModal, setExpertModal] = useState({
    open: false,
    expert: null,
  });
  const [globalExpertDetailsModal, setGlobalExpertDetailsModal] = useState({
    open: false,
    expert: null,
  });
  const [globalExpertPublications, setGlobalExpertPublications] = useState({}); // Map of expert name/id to publications array
  const [loadingGlobalExpertPublications, setLoadingGlobalExpertPublications] =
    useState({}); // Map of expert name/id to loading state
  const [favorites, setFavorites] = useState([]);
  const [insights, setInsights] = useState({ unreadCount: 0 });
  const [orcidStats, setOrcidStats] = useState(null);
  const [loadingOrcidStats, setLoadingOrcidStats] = useState(false);
  const [orcidError, setOrcidError] = useState(null);
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const { updateProfileSignature, markDataFetched, generateProfileSignature } =
    useProfile();

  // Fetch ORCID stats
  const fetchOrcidStats = async (orcidId, userId) => {
    if (!orcidId || !userId) return;

    setLoadingOrcidStats(true);
    setOrcidError(null);
    try {
      // Use the curalink-expert/profile endpoint which fetches ORCID data
      const response = await fetch(
        `${base}/api/curalink-expert/profile/${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        const orcidId = data.profile?.orcid || data.profile?.orcidId;
        if (orcidId) {
          const publications =
            data.profile?.publications || data.profile?.works || [];
          const totalWorks = data.profile.totalWorks || publications.length;
          const hasBiography = !!data.profile.biography;
          const hasAffiliation = !!data.profile.affiliation;
          const hasCurrentPosition = !!data.profile.currentPosition;
          const hasEmployments =
            data.profile.employments && data.profile.employments.length > 0;
          const hasEducations =
            data.profile.educations && data.profile.educations.length > 0;

          // Check if ORCID profile is invalid - if we have an ORCID ID but no data at all
          // (no publications, no biography, no employment, no education, etc.)
          const hasNoData =
            !totalWorks &&
            !hasBiography &&
            !hasAffiliation &&
            !hasCurrentPosition &&
            !hasEmployments &&
            !hasEducations &&
            !data.profile.location &&
            (!data.profile.researchInterests ||
              data.profile.researchInterests.length === 0);

          if (hasNoData) {
            // Invalid ORCID - no data found
            setOrcidError("not_found");
            setOrcidStats(null);
          } else {
            // Sort publications by year (most recent first)
            const sortedPublications = [...publications].sort((a, b) => {
              const yearA = a.year || 0;
              const yearB = b.year || 0;
              return yearB - yearA;
            });

            // Format location - handle both string and object formats
            let locationText = null;
            if (data.profile.location) {
              if (typeof data.profile.location === "string") {
                locationText = data.profile.location;
              } else if (
                data.profile.location.city ||
                data.profile.location.country
              ) {
                locationText = [
                  data.profile.location.city,
                  data.profile.location.country,
                ]
                  .filter(Boolean)
                  .join(", ");
              }
            }

            setOrcidStats({
              orcidId: orcidId,
              orcidUrl: `https://orcid.org/${orcidId}`,
              totalPublications: totalWorks,
              recentPublications: sortedPublications.slice(0, 5), // Top 5 most recent
              impactMetrics: data.profile.impactMetrics || {
                totalPublications: totalWorks,
                hIndex: 0,
                totalCitations: 0,
                maxCitations: 0,
              },
              affiliation: data.profile.affiliation || null,
              currentPosition: data.profile.currentPosition || null,
              location: locationText,
              biography: data.profile.biography || null,
              researchInterests: data.profile.researchInterests || [],
              externalLinks: data.profile.externalLinks || {},
              // Additional ORCID data
              employments: data.profile.employments || [],
              educations: data.profile.educations || [],
              fundings: data.profile.fundings || [],
              totalFundings: data.profile.totalFundings || 0,
              totalPeerReviews: data.profile.totalPeerReviews || 0,
              country: data.profile.country || null,
            });
          }
        }
      } else {
        // Check for 404 error specifically
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            const errorMessage =
              errorData.error || errorData.message || response.statusText || "";
            if (
              errorMessage.toLowerCase().includes("404") ||
              errorMessage.toLowerCase().includes("not found") ||
              errorMessage.toLowerCase().includes("resource was not found")
            ) {
              setOrcidError("not_found");
            } else {
              setOrcidError("error");
            }
          } catch (e) {
            // If response is not JSON, check status text
            const statusText = response.statusText || "";
            if (statusText.toLowerCase().includes("not found")) {
              setOrcidError("not_found");
            } else {
              setOrcidError("error");
            }
          }
        } else {
          setOrcidError("error");
        }
        console.error(
          "Failed to fetch ORCID profile:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching ORCID stats:", error);
      setOrcidError("error");
    } finally {
      setLoadingOrcidStats(false);
    }
  };

  const statusOptions = [
    "RECRUITING",
    "NOT_YET_RECRUITING",
    "ACTIVE_NOT_RECRUITING",
    "COMPLETED",
    "SUSPENDED",
    "TERMINATED",
    "WITHDRAWN",
  ];

  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "year_desc", label: "Year (Newest First)" },
    { value: "year_asc", label: "Year (Oldest First)" },
    { value: "title_asc", label: "Title (A-Z)" },
    { value: "title_desc", label: "Title (Z-A)" },
  ];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    // Redirect to sign in if user is not logged in
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in first");
      navigate("/signin");
      return;
    }

    setUser(userData);
    setLoading(true);

    // Listen for login events to refresh user data
    const handleLoginEvent = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(updatedUser);
    };
    window.addEventListener("login", handleLoginEvent);

    // Listen for cross-tab messages (email verification, user updates)
    const cleanupCrossTab = listenForMessages((type, data) => {
      if (type === "email-verified" || type === "user-updated") {
        const updatedUser = data.user || JSON.parse(localStorage.getItem("user") || "{}");
        setUser(updatedUser);
        // Also trigger login event for other listeners
        window.dispatchEvent(new Event("login"));
        if (type === "email-verified") {
          toast.success("Email verified successfully! (Updated from another tab)");
        }
      }
    });

    // Function to check email verification status from backend
    const checkEmailVerificationStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${base}/api/auth/check-email-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          
          // If email verification status changed, update user state
          if (currentUser.emailVerified !== data.emailVerified && data.emailVerified) {
            currentUser.emailVerified = true;
            localStorage.setItem("user", JSON.stringify(currentUser));
            setUser(currentUser);
            window.dispatchEvent(new Event("login"));
            toast.success("Email verified successfully! (Updated from another device)");
            
            // Stop polling once verified
            if (emailCheckInterval) {
              clearInterval(emailCheckInterval);
              emailCheckInterval = null;
            }
          }
        }
      } catch (error) {
        // Silently fail - don't show errors for background checks
        console.error("Error checking email verification status:", error);
      }
    };

    // Check email verification status periodically if not verified
    let emailCheckInterval = null;
    if (userData && !userData.emailVerified) {
      // Check immediately
      checkEmailVerificationStatus();
      
      // Then check every 30 seconds
      emailCheckInterval = setInterval(() => {
        checkEmailVerificationStatus();
      }, 30000); // 30 seconds
    }

    // Check email verification status when page regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (currentUser && !currentUser.emailVerified) {
          checkEmailVerificationStatus();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (userData?._id || userData?.id) {
      // Check if this is the first load in this session
      const firstLoadKey = `dashboard_researcher_first_load_${
        userData._id || userData.id
      }`;
      const hasLoadedBefore = sessionStorage.getItem(firstLoadKey) === "true";

      // Set isFirstLoad based on whether user has loaded dashboard before in this session
      setIsFirstLoad(!hasLoadedBefore);

      // Fetch data and detect cache hits vs cache misses
      const fetchData = async () => {
        const startTime = Date.now();
        let isCacheHit = false;

        try {
          const response = await fetch(
            `${base}/api/recommendations/${userData._id || userData.id}`
          );
          const responseTime = Date.now() - startTime;

          // If response time is very fast (< 300ms), it's likely a cache hit
          isCacheHit = responseTime < 300;

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            console.error(
              "Error fetching recommendations:",
              response.status,
              errorText
            );
            toast.error("Failed to load recommendations");
            setData({ trials: [], publications: [], experts: [] });
            setGlobalExperts([]);
          } else {
            const fetchedData = await response.json();
            setData(fetchedData);
            // Set globalExperts from the recommendations response (cached on backend)
            setGlobalExperts(fetchedData.globalExperts || []);
          }

          // Fetch favorites
          try {
            const favResponse = await fetch(
              `${base}/api/favorites/${userData._id || userData.id}`
            );
            if (favResponse.ok) {
              const favData = await favResponse.json();
              setFavorites(favData.items || []);
            }
          } catch (error) {
            console.error("Error fetching favorites:", error);
          }

          // Fetch insights unread count
          try {
            const insightsResponse = await fetch(
              `${base}/api/insights/${userData._id || userData.id}?limit=0`
            );
            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              setInsights({ unreadCount: insightsData.unreadCount || 0 });
            }
          } catch (error) {
            console.error("Error fetching insights:", error);
          }

          // Fetch user profile
          try {
            const profileResponse = await fetch(
              `${base}/api/profile/${userData._id || userData.id}`
            );
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              const profile = profileData.profile || null;
              setUserProfile(profile);

              // Update profile signature and mark data as fetched
              if (profile) {
                const conditions =
                  profile.patient?.conditions ||
                  profile.researcher?.interests ||
                  [];
                const location =
                  profile.patient?.location || profile.researcher?.location;
                const currentSignature = generateProfileSignature(
                  conditions,
                  location
                );

                // Update both the current signature and mark it as fetched
                updateProfileSignature(conditions, location);
                markDataFetched(currentSignature);

                // Fetch ORCID stats if user has ORCID ID
                if (profile.researcher?.orcid) {
                  fetchOrcidStats(
                    profile.researcher.orcid,
                    userData._id || userData.id
                  );
                }
              }
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
          }
        } catch (error) {
          console.error("Error fetching recommendations:", error);
          toast.error("Failed to load dashboard data");
          setData({ trials: [], publications: [], experts: [] });
          setGlobalExperts([]);
        }

        const totalElapsedTime = Date.now() - startTime;

        // Mark that user has loaded dashboard before in this session
        if (!hasLoadedBefore) {
          sessionStorage.setItem(firstLoadKey, "true");
        }

        // Only apply minimum loading time for cache misses (first load)
        // Cache hits should load instantly without skeleton loaders
        if (isCacheHit) {
          // Cache hit - load immediately, no skeleton needed
          setLoading(false);
        } else {
          // Cache miss - apply minimum loading time for smooth UX
          // For first load, use longer delay for multi-step loader
          // For subsequent loads, use shorter delay for simple spinner
          const minLoadingTime = !hasLoadedBefore ? 1500 : 800; // 1.5s for first load, 0.8s for subsequent
          const maxLoadingTime = !hasLoadedBefore ? 2000 : 1200; // 2s for first load, 1.2s for subsequent
          const randomDelay =
            Math.random() * (maxLoadingTime - minLoadingTime) + minLoadingTime;

          if (totalElapsedTime < randomDelay) {
            const remainingTime = randomDelay - totalElapsedTime;
            setTimeout(() => {
              setLoading(false);
            }, remainingTime);
          } else {
            setLoading(false);
          }
        }
      };

      fetchData();
    } else {
      // No user, don't show multi-step loader
      setIsFirstLoad(false);
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }

    // Cleanup event listeners
    return () => {
      window.removeEventListener("login", handleLoginEvent);
      cleanupCrossTab();
      if (emailCheckInterval) {
        clearInterval(emailCheckInterval);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("logout"));
    navigate("/");
  }

  async function openTrialDetailsModal(trial) {
    setTrialDetailsModal({
      open: true,
      trial: trial, // Show basic info immediately
      loading: true,
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
            setTrialDetailsModal({
              open: true,
              trial: { ...trial, ...data.trial },
              loading: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching detailed trial info:", error);
      }
    }

    // If fetch fails or no NCT ID, just use the trial we have
    setTrialDetailsModal({
      open: true,
      trial: trial,
      loading: false,
    });
  }

  function closeTrialDetailsModal() {
    setTrialDetailsModal({
      open: false,
      trial: null,
      loading: false,
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

    setContactModal((prev) => ({ ...prev, generating: true }));

    try {
      const userName = user?.username || "Researcher";
      const userLocation =
        userProfile?.researcher?.location ||
        userProfile?.patient?.location ||
        null;

      const response = await fetch(`${base}/api/ai/generate-trial-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userLocation,
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
      toast.success("Message generated successfully!");
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Failed to generate message. Please try again.");
      setContactModal((prev) => ({ ...prev, generating: false }));
    }
  }

  function handleSendMessage() {
    if (!contactModal.message.trim()) return;
    toast.success("Message sent successfully!");
    setContactModal((prev) => ({ ...prev, sent: true }));
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

  function openPublicationDetailsModal(pub) {
    setPublicationDetailsModal({
      open: true,
      publication: pub,
    });
  }

  function closePublicationDetailsModal() {
    setPublicationDetailsModal({
      open: false,
      publication: null,
    });
  }

  function openGlobalExpertDetailsModal(expert) {
    setGlobalExpertDetailsModal({
      open: true,
      expert: expert,
    });
  }

  function closeGlobalExpertDetailsModal() {
    setGlobalExpertDetailsModal({
      open: false,
      expert: null,
    });
  }

  async function fetchGlobalExpertPublications(expert) {
    const expertId = expert.name || expert.id || expert._id;
    if (!expertId) return;

    // Check if already loaded
    if (globalExpertPublications[expertId]) {
      return;
    }

    setLoadingGlobalExpertPublications((prev) => ({
      ...prev,
      [expertId]: true,
    }));

    try {
      const response = await fetch(
        `${base}/api/search/expert/publications?author=${encodeURIComponent(
          expert.name
        )}`
      );
      const data = await response.json();

      setGlobalExpertPublications((prev) => ({
        ...prev,
        [expertId]: data.publications || [],
      }));

      if (data.publications && data.publications.length === 0) {
        toast.error("No publications found for this researcher");
      }
    } catch (error) {
      console.error("Error fetching publications:", error);
      toast.error("Failed to fetch publications");
      setGlobalExpertPublications((prev) => ({
        ...prev,
        [expertId]: [],
      }));
    } finally {
      setLoadingGlobalExpertPublications((prev) => ({
        ...prev,
        [expertId]: false,
      }));
    }
  }

  async function generateSummary(item, type, simplify = false) {
    let text = "";
    let title = "";
    if (type === "trial") {
      title = item.title || "Clinical Trial";
      text = [
        item.title || "",
        item.status || "",
        item.phase || "",
        item.description || "",
        item.conditionDescription || "",
        Array.isArray(item.conditions)
          ? item.conditions.join(", ")
          : item.conditions || "",
        item.eligibility?.criteria || "",
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      title = item.title || "Publication";
      text = [
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
    }

    setSummaryModal({
      open: true,
      title,
      type,
      summary: "",
      loading: true,
      isSimplified: simplify,
      originalSummary: null,
      originalItem: item,
    });

    try {
      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type,
          simplify,
          // Pass full trial object for structured summary
          ...(type === "trial" && { trial: item }),
        }),
      }).then((r) => r.json());

      const newSummary =
        res.summary ||
        (type === "publication"
          ? { structured: false, summary: "Summary unavailable" }
          : type === "trial"
          ? { structured: false, summary: "Summary unavailable" }
          : "Summary unavailable");

      setSummaryModal((prev) => ({
        ...prev,
        summary: newSummary,
        loading: false,
        // Store original summary if this is the first (technical) version
        originalSummary: simplify ? prev.originalSummary : newSummary,
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

  async function simplifySummary() {
    if (!summaryModal.originalItem || summaryModal.isSimplified) return;

    setSummaryModal((prev) => ({
      ...prev,
      loading: true,
    }));

    await generateSummary(
      summaryModal.originalItem,
      summaryModal.type,
      true // simplify = true
    );
  }

  function closeModal() {
    setSummaryModal({
      open: false,
      title: "",
      type: "",
      summary: "",
      loading: false,
      isSimplified: false,
      originalSummary: null,
      originalItem: null,
    });
  }

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (type, itemId, item) => {
    if (type === "expert" || type === "collaborator") {
      return `${type}-${
        item.name || item.orcid || item.id || item._id || itemId
      }`;
    } else if (type === "publication") {
      return `${type}-${item.pmid || item.id || item._id || itemId}`;
    } else {
      return `${type}-${item.id || item._id || itemId}`;
    }
  };

  async function toggleFavorite(type, itemId, item) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    const favoriteKey = getFavoriteKey(type, itemId, item);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    // Determine the correct ID to use for checking and deletion
    let checkId = itemId;
    if (type === "expert" || type === "collaborator") {
      checkId = item.orcid || item.id || item._id || item.userId || itemId;
    } else if (type === "publication") {
      checkId = item.pmid || item.id || item._id || itemId;
    } else if (type === "trial") {
      checkId = item.id || item._id || itemId;
    } else if (type === "thread" || type === "forum") {
      checkId = item._id || item.id || itemId;
    }

    // Check if favorited - for thread/forum types, allow matching between both types
    const isFavorited = favorites.some((fav) => {
      // For thread/forum types, allow matching between both types
      if (
        (type === "thread" || type === "forum") &&
        (fav.type === "thread" || fav.type === "forum")
      ) {
        return (
          fav.item?._id === checkId ||
          fav.item?.id === checkId ||
          (fav.item?.name && item.name && fav.item.name === item.name)
        );
      }
      // For other types, match exactly
      if (fav.type !== type) return false;
      return (
        fav.item?.id === checkId ||
        fav.item?._id === checkId ||
        fav.item?.orcid === checkId ||
        fav.item?.pmid === checkId ||
        (type === "expert" && fav.item?.name === item.name) ||
        (type === "publication" && fav.item?.title === item.title) ||
        (type === "trial" && fav.item?.title === item.title)
      );
    });

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        // For thread/forum types, allow matching between both types
        if (
          (type === "thread" || type === "forum") &&
          (fav.type === "thread" || fav.type === "forum")
        ) {
          return !(
            fav.item?._id === checkId ||
            fav.item?.id === checkId ||
            (fav.item?.name && item.name && fav.item.name === item.name)
          );
        }
        if (fav.type !== type) return true;
        return !(
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.orcid === checkId ||
          fav.item?.pmid === checkId ||
          (type === "expert" && fav.item?.name === item.name) ||
          (type === "publication" && fav.item?.title === item.title) ||
          (type === "trial" && fav.item?.title === item.title)
        );
      });
    } else {
      // Optimistically add to favorites
      const itemToStore = {
        ...item,
        id: checkId,
        _id: item._id || checkId,
      };

      if ((type === "expert" || type === "collaborator") && item.orcid) {
        itemToStore.orcid = item.orcid;
      }
      if (type === "publication" && item.pmid) {
        itemToStore.pmid = item.pmid;
      }

      // Use "thread" as the type for forum favorites (consistent with backend)
      const favoriteType =
        type === "forum" || type === "thread" ? "thread" : type;

      optimisticFavorites = [
        ...favorites,
        {
          type: favoriteType,
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
        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }?type=${type}&id=${encodeURIComponent(checkId)}`,
          { method: "DELETE" }
        );
        toast.success("Removed from favorites");
      } else {
        // Store complete item information
        const itemToStore = {
          ...item, // Store all item properties
          id: checkId,
          _id: item._id || checkId,
        };

        // Add type-specific IDs
        if ((type === "expert" || type === "collaborator") && item.orcid) {
          itemToStore.orcid = item.orcid;
        }
        if (type === "publication" && item.pmid) {
          itemToStore.pmid = item.pmid;
        }

        // Use "thread" as the type for forum favorites (consistent with backend)
        const favoriteType =
          type === "forum" || type === "thread" ? "thread" : type;

        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: favoriteType,
            item: itemToStore,
          }),
        });
        toast.success("Added to favorites");
      }

      // Refresh favorites
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

  async function checkFollowStatus(collaboratorId) {
    if (!user?._id && !user?.id) return false;
    try {
      const response = await fetch(
        `${base}/api/insights/${
          user._id || user.id
        }/following/${collaboratorId}`
      );
      const data = await response.json();
      return data.isFollowing;
    } catch (error) {
      console.error("Error checking follow status:", error);
      return false;
    }
  }

  async function toggleFollow(collaboratorId, collaboratorRole = "researcher") {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow collaborators");
      return;
    }

    const isFollowing = await checkFollowStatus(collaboratorId);

    try {
      if (isFollowing) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: collaboratorId,
          }),
        });
        toast.success("Unfollowed successfully");
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: collaboratorId,
            followerRole: user.role,
            followingRole: collaboratorRole,
          }),
        });
        toast.success("Connected successfully!");
      }

      setFollowingStatus((prev) => ({
        ...prev,
        [collaboratorId]: !isFollowing,
      }));
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  }

  async function sendMessage() {
    if (!messageModal.body.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!user?._id && !user?.id) {
      toast.error("Please sign in to send messages");
      return;
    }

    try {
      const collaboratorId =
        messageModal.collaborator?._id ||
        messageModal.collaborator?.userId ||
        messageModal.collaborator?.id;
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user._id || user.id,
          receiverId: collaboratorId,
          senderRole: user.role,
          receiverRole: "researcher",
          body: messageModal.body,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setMessageModal({ open: false, collaborator: null, body: "" });
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }

  // Load follow status when collaborator modal opens
  useEffect(() => {
    if (collaboratorModal.collaborator && collaboratorModal.open) {
      const collaboratorId =
        collaboratorModal.collaborator._id ||
        collaboratorModal.collaborator.userId ||
        collaboratorModal.collaborator.id;
      checkFollowStatus(collaboratorId).then((isFollowing) => {
        setFollowingStatus((prev) => ({
          ...prev,
          [collaboratorId]: isFollowing,
        }));
      });
    }
  }, [collaboratorModal]);

  // Load follow status when expert modal opens
  useEffect(() => {
    if (expertModal.expert && expertModal.open) {
      const expertId =
        expertModal.expert._id ||
        expertModal.expert.userId ||
        expertModal.expert.id;
      checkFollowStatus(expertId).then((isFollowing) => {
        setFollowingStatus((prev) => ({
          ...prev,
          [expertId]: isFollowing,
        }));
      });
    }
  }, [expertModal]);

  // Fetch filtered trials when filter changes
  async function fetchFilteredTrials() {
    if (!user?._id && !user?.id) return;
    if (selectedCategory !== "trials") return;

    setLoadingFiltered(true);
    try {
      const params = new URLSearchParams();
      const userDisease =
        user?.medicalInterests?.[0] ||
        userProfile?.researcher?.interests?.[0] ||
        "oncology";
      params.set("q", userDisease);
      // Default to RECRUITING if no filter is set
      params.set("status", trialFilter || "RECRUITING");

      // Add location (country only for trials)
      if (userLocation?.country) {
        params.set("location", userLocation.country);
      }

      // Add userId to calculate match percentages
      params.set("userId", user._id || user.id);

      const response = await fetch(
        `${base}/api/search/trials?${params.toString()}`
      );
      if (response.ok) {
        const fetchedData = await response.json();
        // Sort by match percentage (descending)
        const sortedTrials = (fetchedData.results || []).sort((a, b) => {
          const matchA = a.matchPercentage ?? 0;
          const matchB = b.matchPercentage ?? 0;
          return matchB - matchA;
        });
        setData((prev) => ({
          ...prev,
          trials: sortedTrials,
        }));
      } else {
        // Handle non-ok responses
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server error: ${response.status}` };
        }
        console.error(
          "Error fetching filtered trials:",
          response.status,
          errorData
        );
        // Only show error toast if it's not a search limit error (handled by the API)
        if (response.status !== 429) {
          toast.error(errorData.error || "Failed to load filtered trials");
        }
      }
    } catch (error) {
      console.error("Error fetching filtered trials:", error);
      // Only show error if it's a network error, not if it's already handled
      if (error.name !== "AbortError") {
        toast.error("Failed to load filtered trials");
      }
    } finally {
      setLoadingFiltered(false);
    }
  }

  // Sort publications client-side
  function sortPublications(publications, sortBy) {
    const sorted = [...publications];
    switch (sortBy) {
      case "year_desc":
        return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
      case "year_asc":
        return sorted.sort((a, b) => (a.year || 0) - (b.year || 0));
      case "title_asc":
        return sorted.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        );
      case "title_desc":
        return sorted.sort((a, b) =>
          (b.title || "").localeCompare(a.title || "")
        );
      default:
        // relevance - sort by match percentage (descending), then keep original order
        return sorted.sort((a, b) => {
          const matchA = a.matchPercentage ?? 0;
          const matchB = b.matchPercentage ?? 0;
          return matchB - matchA;
        });
    }
  }

  // Sort items by match percentage (descending)
  function sortByMatchPercentage(items) {
    return [...items].sort((a, b) => {
      const matchA = a.matchPercentage ?? 0;
      const matchB = b.matchPercentage ?? 0;
      return matchB - matchA;
    });
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

  // Load forums categories on mount
  useEffect(() => {
    const loadForumsCategories = async () => {
      try {
        const response = await fetch(`${base}/api/forums/categories`);
        if (response.ok) {
          const data = await response.json();
          setForumsCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error loading forums categories:", error);
      }
    };
    loadForumsCategories();
  }, [base]);

  // Load forum threads when forums category is selected
  useEffect(() => {
    if (selectedCategory === "forums" && forumsCategories.length > 0) {
      const fetchForumThreads = async () => {
        const threadsMap = {};
        const forumsWithThreads = forumsCategories.filter(
          (category) => (category.threadCount || 0) >= 2
        );

        // Fetch threads for each category (limit to 3 most recent per category)
        for (const category of forumsWithThreads) {
          try {
            const response = await fetch(
              `${base}/api/forums/threads?categoryId=${category._id}`
            );
            if (response.ok) {
              const data = await response.json();
              threadsMap[category._id] = (data.threads || []).slice(0, 3); // Get top 3 threads
            }
          } catch (error) {
            console.error(
              `Error fetching threads for category ${category._id}:`,
              error
            );
          }
        }
        setForumThreads(threadsMap);
      };

      fetchForumThreads();
    }
  }, [selectedCategory, forumsCategories, base]);

  // Reset filters when switching categories
  useEffect(() => {
    if (selectedCategory !== "trials") {
      setTrialFilter("RECRUITING"); // Keep RECRUITING as default
    }
    if (selectedCategory !== "publications") {
      setPublicationSort("relevance");
    }
  }, [selectedCategory]);

  // Effect to fetch filtered trials when filter changes or category is selected
  useEffect(() => {
    // Always fetch trials when trials category is selected (defaults to RECRUITING)
    if (selectedCategory === "trials" && user?._id) {
      // If no filter is set, use RECRUITING as default
      if (!trialFilter) {
        setTrialFilter("RECRUITING");
      }
      // Fetch filtered trials
      fetchFilteredTrials();
    }
  }, [trialFilter, selectedCategory, user?._id]);

  // Loading states for multi-step loader (only shown on first load)
  const loadingStates = [
    { text: "Getting personalized trials..." },
    { text: "Getting publications..." },
    { text: "Getting global experts..." },
    { text: "Getting collaborators..." },
    { text: "Creating personalized dashboard..." },
  ];

  // Skeleton loader for subsequent loads
  function SimpleLoader() {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackgroundDiff />
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-6 pb-12 relative">
          {/* Top Bar Skeleton */}
          <div className="mb-8">
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl shadow-xl border relative overflow-hidden w-full p-5 sm:p-4 mt-18"
              style={{
                background:
                  "linear-gradient(135deg, #D0C4E2, #E8E0EF, #F5F2F8)",
                borderColor: "rgba(208, 196, 226, 0.5)",
              }}
            >
              <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
                {/* Avatar Skeleton */}
                <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse"></div>
                {/* Profile Info Skeleton */}
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-5 w-32 bg-white/20 rounded animate-pulse"></div>
                  <div className="flex gap-2">
                    <div className="h-6 w-24 bg-white/20 rounded-full animate-pulse"></div>
                    <div className="h-6 w-28 bg-white/20 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              {/* Action Buttons Skeleton */}
              <div className="relative z-10 flex items-center gap-3 shrink-0">
                <div className="h-10 w-24 bg-white/20 rounded-xl animate-pulse"></div>
                <div className="h-10 w-32 bg-white/20 rounded-xl animate-pulse"></div>
                <div className="h-10 w-24 bg-white/20 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Category Buttons Skeleton */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-28 bg-slate-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-36 bg-slate-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-40 bg-slate-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-28 bg-slate-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6 sm:p-8">
            {/* Title Skeleton */}
            <div className="mb-8">
              <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
              <div className="h-4 w-96 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-5">
                    {/* Header Skeleton */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse"></div>
                      <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse"></div>
                    </div>
                    {/* Title Skeleton */}
                    <div className="h-6 w-full bg-slate-200 rounded-lg animate-pulse mb-3"></div>
                    <div className="h-6 w-3/4 bg-slate-200 rounded-lg animate-pulse mb-3"></div>
                    {/* Info Skeleton */}
                    <div className="space-y-2 mb-3">
                      <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                    {/* Description Skeleton */}
                    <div className="h-16 w-full bg-slate-100 rounded-lg animate-pulse mb-4"></div>
                    {/* Buttons Skeleton */}
                    <div className="flex gap-2">
                      <div className="h-9 flex-1 bg-slate-200 rounded-lg animate-pulse"></div>
                      <div className="h-9 w-9 bg-slate-200 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show multi-step loader for first load (cache miss), simple spinner for cache hits
  if (loading) {
    if (isFirstLoad) {
      return (
        <MultiStepLoader
          loadingStates={loadingStates}
          loading={loading}
          duration={1500}
          loop={false}
        />
      );
    } else {
      return <SimpleLoader />;
    }
  }

  const getCategoryCount = (category) => {
    switch (category) {
      case "profile":
        return userProfile?.researcher?.orcid ? 1 : 0;
      case "collaborators":
        return data.experts.length + globalExperts.length - 1;
      case "forums":
        return forumsCategories.filter(
          (category) => (category.threadCount || 0) >= 2
        ).length;
      case "publications":
        return data.publications.length;
      case "trials":
        return data.trials.length;
      case "favorites":
        return favorites.length;
      default:
        return 0;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case "profile":
        return "Your Profile";
      case "collaborators":
        return "Collaborators";
      case "forums":
        return "Forums";
      case "publications":
        return "Publications";
      case "trials":
        return "Clinical Trials";
      case "favorites":
        return "Favorites";
      default:
        return "";
    }
  };

  const userInterests =
    userProfile?.researcher?.interests?.[0] ||
    userProfile?.researcher?.specialties?.[0] ||
    "Research";
  const userLocation = userProfile?.researcher?.location || null;
  const locationText = userLocation
    ? `${userLocation.city || ""}${
        userLocation.city && userLocation.country ? ", " : ""
      }${userLocation.country || ""}`.trim() || "Not specified"
    : "Not specified";

  return (
    <div className="min-h-screen relative">
      <style>{`
        .category-button-hover:hover:not(:active) {
          background-color: rgba(255, 255, 255, 0.8) !important;
          border-color: rgba(47, 60, 150, 0.3) !important;
        }
      `}</style>
      <AnimatedBackgroundDiff />
      <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-6 pb-12 relative">
        {/* Top Bar with Profile and Insights */}
        <div className="mb-8">
          {/* Profile Section with Insights */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl shadow-xl border relative overflow-hidden w-full p-5 sm:p-4 mt-18"
            style={{
              background: "linear-gradient(135deg, #D0C4E2, #E8E0EF, #F5F2F8)",
              borderColor: "rgba(208, 196, 226, 0.5)",
            }}
          >
            {/* Decorative background elements */}
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32"
              style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
            ></div>
            <div
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-24 -mb-24"
              style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
            ></div>

            <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
              {/* Avatar */}
              <div
                className="w-12 h-12 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 shrink-0"
                style={{
                  backgroundColor: "#2F3C96",
                  ringColor: "rgba(47, 60, 150, 0.5)",
                }}
              >
                {user?.username?.charAt(0)?.toUpperCase() || "R"}
              </div>

              {/* Profile Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-base sm:text-lg font-bold mb-1"
                    style={{ color: "#2F3C96" }}
                  >
                    Hello, {user?.username || "Researcher"} 👋
                  </h3>
                  <div
                    className="flex flex-wrap items-center gap-3 text-xs sm:text-sm"
                    style={{ color: "#787878" }}
                  >
                    {userProfile?.researcher?.specialties &&
                      userProfile.researcher.specialties.length > 0 && (
                        <span
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.15)",
                            border: "1px solid rgba(47, 60, 150, 0.3)",
                            color: "#2F3C96",
                          }}
                        >
                          <Briefcase className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            Specialties:{" "}
                            {userProfile.researcher.specialties.join(", ")}
                          </span>
                        </span>
                      )}
                    {userProfile?.researcher?.interests &&
                      userProfile.researcher.interests.length > 0 && (
                        <span
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.15)",
                            border: "1px solid rgba(47, 60, 150, 0.3)",
                            color: "#2F3C96",
                          }}
                        >
                          <Beaker className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            Research Interests:{" "}
                            {userProfile.researcher.interests.join(", ")}
                          </span>
                        </span>
                      )}
                    {(!userProfile?.researcher?.specialties ||
                      userProfile.researcher.specialties.length === 0) &&
                      (!userProfile?.researcher?.interests ||
                        userProfile.researcher.interests.length === 0) && (
                        <span
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.15)",
                            border: "1px solid rgba(47, 60, 150, 0.3)",
                            color: "#2F3C96",
                          }}
                        >
                          <Beaker className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            {userInterests}
                          </span>
                        </span>
                      )}
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: "rgba(47, 60, 150, 0.15)",
                        border: "1px solid rgba(47, 60, 150, 0.3)",
                        color: "#2F3C96",
                      }}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[150px] sm:max-w-none">
                        {locationText}
                      </span>
                    </span>
                    {/* Email Verification Status */}
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                        user?.emailVerified
                          ? "bg-green-50 border-green-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                      style={{
                        border: user?.emailVerified
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid rgba(234, 179, 8, 0.3)",
                        color: user?.emailVerified ? "#059669" : "#d97706",
                      }}
                    >
                      {user?.emailVerified ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            Verified
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            Unverified
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap">
              {/* Email Verification Button */}
              {!user?.emailVerified && (
                <button
                  onClick={() => setVerifyEmailModalOpen(true)}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105"
                  style={{
                    backgroundColor: "#d97706",
                    border: "1px solid rgba(217, 119, 6, 0.5)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#b45309";
                    e.currentTarget.style.borderColor = "rgba(217, 119, 6, 0.7)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#d97706";
                    e.currentTarget.style.borderColor = "rgba(217, 119, 6, 0.5)";
                  }}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">
                    Verify Now
                  </span>
                </button>
              )}
              {/* View All Saved Items Button */}
              <button
                onClick={() => navigate("/favorites")}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105"
                style={{
                  backgroundColor: "#2F3C96",
                  border: "1px solid rgba(47, 60, 150, 0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#253075";
                  e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2F3C96";
                  e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.5)";
                }}
              >
                <Star className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">
                  View All Saved Items
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Section - Full Width */}
        <div className="mb-8">
          {/* Activity Bar - Upcoming Meetings & Mentions */}
          <div
            className="rounded-xl shadow-md border p-2 mb-4"
            style={{
              background: "linear-gradient(135deg, #D0C4E2, #E8E0EF, #F5F2F8)",
              borderColor: "rgba(208, 196, 226, 0.5)",
            }}
          >
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Upcoming Meeting 1 */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid rgba(208, 196, 226, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.7)";
                  e.currentTarget.style.borderColor =
                    "rgba(208, 196, 226, 0.3)";
                }}
              >
                <Calendar className="w-4 h-4" style={{ color: "#2F3C96" }} />
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium leading-tight"
                    style={{ color: "#787878" }}
                  >
                    Next Meeting
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#2F3C96" }}
                  >
                    Dec 15, 2:00 PM
                  </span>
                </div>
              </div>

              {/* Recent Mentions */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid rgba(208, 196, 226, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.7)";
                  e.currentTarget.style.borderColor =
                    "rgba(208, 196, 226, 0.3)";
                }}
              >
                <Bell className="w-4 h-4" style={{ color: "#2F3C96" }} />
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium leading-tight"
                    style={{ color: "#787878" }}
                  >
                    Recent Activity
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#2F3C96" }}
                  >
                    3 Mentions
                  </span>
                </div>
              </div>

              {/* Upcoming Meeting 2 */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid rgba(208, 196, 226, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.borderColor = "rgba(47, 60, 150, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.7)";
                  e.currentTarget.style.borderColor =
                    "rgba(208, 196, 226, 0.3)";
                }}
              >
                <Calendar className="w-4 h-4" style={{ color: "#2F3C96" }} />
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium leading-tight"
                    style={{ color: "#787878" }}
                  >
                    Upcoming
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#2F3C96" }}
                  >
                    Dec 20, 10:00 AM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Buttons Bar */}
          <div
            className="rounded-xl shadow-md border p-2 mb-6"
            style={{
              background: "linear-gradient(135deg, #D0C4E2, #E8E0EF, #F5F2F8)",
              borderColor: "rgba(208, 196, 226, 0.5)",
            }}
          >
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                {
                  key: "profile",
                  label: "Your Profile",
                  icon: User,
                },
                {
                  key: "collaborators",
                  label: "Collaborators",
                  icon: Users,
                },
                {
                  key: "forums",
                  label: "Forums",
                  icon: MessageCircle,
                },
                {
                  key: "publications",
                  label: "Publications",
                  icon: FileText,
                },
                {
                  key: "trials",
                  label: "Clinical Trials",
                  icon: Beaker,
                },
                {
                  key: "favorites",
                  label: "Favorites",
                  icon: Star,
                },
              ].map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.key;
                return (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap ${
                      !isSelected ? "category-button-hover" : ""
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: "#2F3C96",
                            color: "#FFFFFF",
                            borderColor: "#2F3C96",
                            userSelect: "text",
                          }
                        : {
                            backgroundColor: "rgba(255, 255, 255, 0.6)",
                            color: "#787878",
                            borderColor: "rgba(47, 60, 150, 0.2)",
                            userSelect: "text",
                          }
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-semibold">
                      {category.label}
                    </span>
                    {category.key !== "profile" && (
                      <span
                        className="text-sm font-bold"
                        style={
                          isSelected
                            ? { color: "rgba(255, 255, 255, 0.9)" }
                            : { color: "#2F3C96" }
                        }
                      >
                        ({getCategoryCount(category.key)})
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Filter/Sort Button */}
              {(selectedCategory === "trials" ||
                selectedCategory === "publications") && (
                <button
                  onClick={() => setFilterModalOpen(true)}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap"
                  style={{
                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                    color: "#2F3C96",
                    borderColor: "rgba(208, 196, 226, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "rgba(208, 196, 226, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "rgba(208, 196, 226, 0.2)";
                  }}
                >
                  <Filter className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold">
                    {selectedCategory === "trials" ? "Filter" : "Sort"}
                  </span>
                  {(trialFilter || publicationSort !== "relevance") && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: "#2F3C96" }}
                    ></span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Main Recommendations Section */}
          <div
            className="bg-white rounded-2xl shadow-xl border p-6 sm:p-8"
            style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
          >
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #2F3C96, #253075)",
                    }}
                  >
                    Your Personalized Recommendations
                  </h2>
                  <p
                    className="text-sm sm:text-base"
                    style={{ color: "#787878" }}
                  >
                    Discover tailored content based on your research profile
                  </p>
                </div>
                {selectedCategory !== "favorites" && (
                  <div
                    className="flex items-center gap-3 px-4 py-2 rounded-xl border"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.2)",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                  >
                    <div
                      className="h-2 w-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "#2F3C96" }}
                    ></div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      Viewing:{" "}
                      <span style={{ color: "#2F3C96" }}>
                        {getCategoryLabel(selectedCategory)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Grid of Items - Larger Cards - Full Width with 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {selectedCategory === "profile" && (
                <div className="col-span-full">
                  {!userProfile?.researcher?.orcid ? (
                    <div
                      className="backdrop-blur-xl rounded-xl shadow-lg border p-6 sm:p-8"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.3)",
                          }}
                        >
                          <LinkIcon
                            className="w-6 h-6"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className="text-lg font-semibold mb-2"
                            style={{ color: "#2F3C96" }}
                          >
                            ORCID ID Not Added
                          </h3>
                          <p
                            className="text-sm mb-4"
                            style={{ color: "#787878" }}
                          >
                            Add your ORCID ID to link your research activities
                            and display your publication stats, research
                            interests, and professional information.
                          </p>
                          <button
                            onClick={() => navigate("/profile")}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors"
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
                            <Edit3 className="w-4 h-4" />
                            Add ORCID ID
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="backdrop-blur-xl rounded-xl shadow-lg border p-6 sm:p-8"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <div
                        className="flex items-center justify-between mb-6 pb-4"
                        style={{
                          borderBottom: "1px solid rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.3)",
                            }}
                          >
                            <CheckCircle
                              className="w-6 h-6"
                              style={{ color: "#2F3C96" }}
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <h3
                                className="text-lg font-semibold"
                                style={{ color: "#2F3C96" }}
                              >
                                ORCID Profile Connected
                              </h3>
                              <a
                                href={
                                  orcidStats?.orcidUrl ||
                                  `https://orcid.org/${userProfile.researcher.orcid}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm flex items-center gap-1 mt-1"
                                style={{ color: "#2F3C96" }}
                                onMouseEnter={(e) => {
                                  e.target.style.color = "#253075";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.color = "#2F3C96";
                                }}
                              >
                                {userProfile.researcher.orcid}
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            {orcidStats && (
                              <div
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                                style={{
                                  backgroundColor: "rgba(208, 196, 226, 0.2)",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <FileText
                                  className="w-5 h-5"
                                  style={{ color: "#2F3C96" }}
                                />
                                <div>
                                  <p
                                    className="text-2xl font-bold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {orcidStats.totalPublications || 0}
                                  </p>
                                  <p
                                    className="text-xs"
                                    style={{ color: "#787878" }}
                                  >
                                    Total works
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {loadingOrcidStats ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2
                            className="w-8 h-8 animate-spin"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                      ) : orcidStats ? (
                        <div className="space-y-6">
                          {/* Biography at the top */}
                          {orcidStats.biography && (
                            <div
                              className="rounded-lg p-5 border"
                              style={{
                                backgroundColor: "rgba(245, 242, 248, 0.5)",
                                borderColor: "rgba(208, 196, 226, 0.3)",
                              }}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <User
                                  className="w-5 h-5"
                                  style={{ color: "#2F3C96" }}
                                />
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: "#2F3C96" }}
                                >
                                  Biography
                                </span>
                              </div>
                              <p
                                className="text-sm leading-relaxed"
                                style={{ color: "#787878" }}
                              >
                                {orcidStats.biography}
                              </p>
                            </div>
                          )}

                          {/* Profile Information Section as a list */}
                          <div className="space-y-4">
                            {/* Current Position */}
                            {orcidStats.currentPosition && (
                              <div
                                className="rounded-lg p-4 border"
                                style={{
                                  backgroundColor: "rgba(245, 242, 248, 0.5)",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Briefcase
                                    className="w-5 h-5"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Current Position
                                  </span>
                                </div>
                                <p
                                  className="text-sm"
                                  style={{ color: "#787878" }}
                                >
                                  {orcidStats.currentPosition}
                                </p>
                              </div>
                            )}

                            {/* Location */}
                            {orcidStats.location && (
                              <div
                                className="rounded-lg p-4 border"
                                style={{
                                  backgroundColor: "rgba(245, 242, 248, 0.5)",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin
                                    className="w-5 h-5"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Location
                                  </span>
                                </div>
                                <p
                                  className="text-sm"
                                  style={{ color: "#787878" }}
                                >
                                  {orcidStats.location}
                                </p>
                              </div>
                            )}

                            {/* Research Interests */}
                            {orcidStats.researchInterests &&
                              orcidStats.researchInterests.length > 0 && (
                                <div
                                  className="rounded-lg p-4 border"
                                  style={{
                                    backgroundColor: "rgba(245, 242, 248, 0.5)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <Sparkles
                                      className="w-5 h-5"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <span
                                      className="text-sm font-semibold"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Research Interests
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {orcidStats.researchInterests
                                      .slice(0, 10)
                                      .map((interest, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors"
                                          style={{
                                            backgroundColor:
                                              "rgba(208, 196, 226, 0.3)",
                                            color: "#2F3C96",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.4)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor =
                                              "rgba(208, 196, 226, 0.3)";
                                          }}
                                        >
                                          {interest}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              )}

                            {/* External Links */}
                            {orcidStats.externalLinks &&
                              Object.keys(orcidStats.externalLinks).length >
                                1 && (
                                <div
                                  className="rounded-lg p-4 border"
                                  style={{
                                    backgroundColor: "rgba(245, 242, 248, 0.5)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <LinkIcon
                                      className="w-5 h-5"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <span
                                      className="text-sm font-semibold"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      External Links
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {orcidStats.externalLinks.googleScholar && (
                                      <a
                                        href={
                                          orcidStats.externalLinks.googleScholar
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium"
                                        style={{ color: "#2F3C96" }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = "#253075";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = "#2F3C96";
                                        }}
                                      >
                                        Google Scholar
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                    {orcidStats.externalLinks.researchGate && (
                                      <a
                                        href={
                                          orcidStats.externalLinks.researchGate
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium"
                                        style={{ color: "#2F3C96" }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = "#253075";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = "#2F3C96";
                                        }}
                                      >
                                        ResearchGate
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                    {orcidStats.externalLinks.pubmed && (
                                      <a
                                        href={orcidStats.externalLinks.pubmed}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium"
                                        style={{ color: "#2F3C96" }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = "#253075";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = "#2F3C96";
                                        }}
                                      >
                                        PubMed
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Employment History */}
                            {orcidStats.employments &&
                              orcidStats.employments.length > 0 && (
                                <div
                                  className="rounded-lg p-4 border"
                                  style={{
                                    backgroundColor: "rgba(245, 242, 248, 0.5)",
                                    borderColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-4">
                                    <Briefcase
                                      className="w-5 h-5"
                                      style={{ color: "#2F3C96" }}
                                    />
                                    <span
                                      className="text-sm font-semibold"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Employment History
                                    </span>
                                  </div>
                                  <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {orcidStats.employments.map((emp, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          borderBottom:
                                            idx <
                                            orcidStats.employments.length - 1
                                              ? "1px solid rgba(208, 196, 226, 0.3)"
                                              : "none",
                                        }}
                                        className="pb-3 last:pb-0"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1">
                                            <p
                                              className="text-sm font-semibold mb-1"
                                              style={{ color: "#2F3C96" }}
                                            >
                                              {emp.roleTitle || "Position"}
                                            </p>
                                            <p
                                              className="text-sm mb-1"
                                              style={{ color: "#787878" }}
                                            >
                                              {emp.organization ||
                                                "Organization"}
                                            </p>
                                            {emp.department && (
                                              <p
                                                className="text-xs mb-1"
                                                style={{ color: "#787878" }}
                                              >
                                                {emp.department}
                                              </p>
                                            )}
                                            {(emp.startDate || emp.endDate) && (
                                              <p
                                                className="text-xs"
                                                style={{ color: "#787878" }}
                                              >
                                                {emp.startDate || "?"} -{" "}
                                                {emp.endDate || "Present"}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* Recent Publications */}
                            {orcidStats.recentPublications &&
                              orcidStats.recentPublications.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                          <BookOpen className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                          <h3 className="text-base font-bold text-slate-900">
                                            Recent Publications
                                          </h3>
                                          {orcidStats.totalPublications > 5 && (
                                            <p className="text-xs text-slate-600 mt-0.5">
                                              Showing 5 of{" "}
                                              {orcidStats.totalPublications}{" "}
                                              publications
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                                    {orcidStats.recentPublications.map(
                                      (pub, idx) => (
                                        <div
                                          key={idx}
                                          className="group bg-slate-50 hover:bg-indigo-50 rounded-lg p-4 border border-slate-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-md"
                                        >
                                          <a
                                            href={pub.link || pub.url || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                          >
                                            <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 line-clamp-2 mb-2 transition-colors">
                                              {pub.title}
                                            </h4>
                                          </a>
                                          <div className="space-y-2">
                                            {pub.authors &&
                                              pub.authors.length > 0 && (
                                                <div className="flex items-start gap-2">
                                                  <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                  <p className="text-xs text-slate-600 line-clamp-2">
                                                    {pub.authors
                                                      .slice(0, 4)
                                                      .join(", ")}
                                                    {pub.authors.length > 4 &&
                                                      ` +${
                                                        pub.authors.length - 4
                                                      } more`}
                                                  </p>
                                                </div>
                                              )}
                                            <div className="flex items-center gap-4 flex-wrap">
                                              {pub.journal && (
                                                <div className="flex items-center gap-1.5">
                                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                  <span className="text-xs text-slate-600 font-medium">
                                                    {pub.journal}
                                                  </span>
                                                </div>
                                              )}
                                              {pub.year && (
                                                <div className="flex items-center gap-1.5">
                                                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                                  <span className="text-xs text-slate-600">
                                                    {pub.year}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            {(pub.link || pub.url) && (
                                              <div className="pt-2 border-t border-slate-200">
                                                <a
                                                  href={pub.link || pub.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  <ExternalLink className="w-3.5 h-3.5" />
                                                  View Publication
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  {orcidStats.totalPublications > 5 && (
                                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                                      <a
                                        href={orcidStats.orcidUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors group"
                                      >
                                        <span>
                                          View all{" "}
                                          {orcidStats.totalPublications}{" "}
                                          publications on ORCID
                                        </span>
                                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      ) : orcidError === "not_found" ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <Info className="w-6 h-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                                ORCID Profile Not Found
                              </h3>
                              <p className="text-sm text-amber-800 mb-4">
                                We couldn't find your ORCID profile. Please
                                check your ORCID ID or start your research to
                                build your profile.
                              </p>
                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() => navigate("/profile")}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Check Your ORCID ID
                                </button>
                                <a
                                  href={`https://orcid.org/${userProfile.researcher.orcid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 text-sm font-semibold rounded-lg border border-amber-300 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Visit ORCID Profile
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-sm text-slate-500">
                          Unable to load ORCID stats. Please try again later.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedCategory === "trials" &&
                (loadingFiltered ? (
                  <div className="col-span-full text-center py-16">
                    <div
                      className="inline-flex items-center justify-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <div
                        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "#2F3C96" }}
                      ></div>
                      <span className="text-sm font-medium">
                        Loading recruiting trials...
                      </span>
                    </div>
                  </div>
                ) : (
                  (() => {
                    // Filter trials by RECRUITING status when trialFilter is RECRUITING
                    const filteredTrials =
                      trialFilter === "RECRUITING"
                        ? data.trials.filter((t) => t.status === "RECRUITING")
                        : data.trials;
                    return filteredTrials.length > 0 ? (
                      sortByMatchPercentage(filteredTrials).map((t, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                          style={{
                            borderColor: "rgba(208, 196, 226, 0.3)",
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
                            {t.matchPercentage !== undefined && (
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
                                      {t.matchPercentage}% Match
                                    </span>
                                  </div>
                                  {/* Status Badge */}
                                  {t.status && (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                        t.status
                                      )}`}
                                    >
                                      {t.status.replace(/_/g, " ")}
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
                                      width: `${t.matchPercentage}%`,
                                      background:
                                        "linear-gradient(90deg, #2F3C96, #253075)",
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Title */}
                            <div className="mb-4">
                              <h3
                                className="text-lg font-bold mb-0 line-clamp-3 leading-snug"
                                style={{ color: "#2F3C96" }}
                              >
                                {t.title}
                              </h3>
                            </div>


                            {/* Description/Details Preview */}
                            {(t.description || t.conditionDescription) && (
                              <div className="mb-4 flex-grow">
                                <button
                                  onClick={() => openTrialDetailsModal(t)}
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
                                          {t.description ||
                                            t.conditionDescription ||
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
                            {!t.description && !t.conditionDescription && (
                              <div className="flex-grow"></div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-auto">
                              <button
                                onClick={() => generateSummary(t, "trial")}
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
                                onClick={() =>
                                  toggleFavorite("trial", t._id || t.id, t)
                                }
                                disabled={favoritingItems.has(
                                  getFavoriteKey("trial", t._id || t.id, t)
                                )}
                                className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  favorites.some(
                                    (fav) =>
                                      fav.type === "trial" &&
                                      (fav.item?.id === (t._id || t.id) ||
                                        fav.item?._id === (t._id || t.id))
                                  )
                                    ? "bg-red-50 border-red-200 text-red-500"
                                    : ""
                                }`}
                                style={
                                  !favorites.some(
                                    (fav) =>
                                      fav.type === "trial" &&
                                      (fav.item?.id === (t._id || t.id) ||
                                        fav.item?._id === (t._id || t.id))
                                  )
                                    ? {
                                        backgroundColor:
                                          "rgba(208, 196, 226, 0.2)",
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
                                        (fav.item?.id === (t._id || t.id) ||
                                          fav.item?._id === (t._id || t.id))
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
                                        (fav.item?.id === (t._id || t.id) ||
                                          fav.item?._id === (t._id || t.id))
                                    )
                                  ) {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.2)";
                                    e.currentTarget.style.color = "#787878";
                                  }
                                }}
                              >
                                {favoritingItems.has(
                                  getFavoriteKey("trial", t._id || t.id, t)
                                ) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`w-4 h-4 ${
                                      favorites.some(
                                        (fav) =>
                                          fav.type === "trial" &&
                                          (fav.item?.id === (t._id || t.id) ||
                                            fav.item?._id === (t._id || t.id))
                                      )
                                        ? "fill-current"
                                        : ""
                                    }`}
                                  />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                          }}
                        >
                          <Beaker
                            className="w-10 h-10"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <h3
                          className="text-lg font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          No Recruiting Clinical Trials Found
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          We're working on finding relevant recruiting clinical
                          trials for you. Check back soon!
                        </p>
                      </div>
                    );
                  })()
                ))}

              {selectedCategory === "publications" &&
                (sortPublications(data.publications, publicationSort).length >
                0 ? (
                  sortPublications(data.publications, publicationSort).map(
                    (p, idx) => {
                      const itemId = p.id || p.pmid;
                      const isFavorited = favorites.some(
                        (fav) =>
                          fav.type === "publication" &&
                          (fav.item?.id === itemId ||
                            fav.item?._id === itemId ||
                            fav.item?.pmid === itemId)
                      );
                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                          style={{
                            borderColor: "rgba(208, 196, 226, 0.3)",
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
                            {p.matchPercentage !== undefined && (
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
                                      {p.matchPercentage}% Match
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
                                      width: `${p.matchPercentage}%`,
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
                                {p.title || "Untitled Publication"}
                              </h3>
                            </div>

                            {/* Basic Info - Authors and Published Date */}
                            <div className="space-y-1.5 mb-4">
                              {p.authors &&
                                Array.isArray(p.authors) &&
                                p.authors.length > 0 && (
                                  <div
                                    className="flex items-center text-sm"
                                    style={{ color: "#787878" }}
                                  >
                                    <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                                    <span className="line-clamp-1">
                                      {p.authors.join(", ")}
                                    </span>
                                  </div>
                                )}
                              {(p.year || p.month) && (
                                <div
                                  className="flex items-center text-sm"
                                  style={{ color: "#787878" }}
                                >
                                  <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                                  <span>
                                    {p.month && p.month + " "}
                                    {p.year || ""}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Abstract Preview */}
                            {p.abstract && (
                              <div className="mb-4 flex-grow">
                                <button
                                  onClick={() => openPublicationDetailsModal(p)}
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
                                          {p.abstract}
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
                            {!p.abstract && <div className="flex-grow"></div>}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-auto">
                              <button
                                onClick={() =>
                                  generateSummary(p, "publication")
                                }
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
                                onClick={() =>
                                  toggleFavorite("publication", itemId, p)
                                }
                                disabled={favoritingItems.has(
                                  getFavoriteKey("publication", itemId, p)
                                )}
                                className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isFavorited
                                    ? "bg-red-50 border-red-200 text-red-500"
                                    : ""
                                }`}
                                style={
                                  !isFavorited
                                    ? {
                                        backgroundColor:
                                          "rgba(208, 196, 226, 0.2)",
                                        borderColor: "rgba(208, 196, 226, 0.3)",
                                        color: "#787878",
                                      }
                                    : {}
                                }
                                onMouseEnter={(e) => {
                                  if (
                                    !isFavorited &&
                                    !e.currentTarget.disabled
                                  ) {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.3)";
                                    e.currentTarget.style.color = "#dc2626";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isFavorited) {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.2)";
                                    e.currentTarget.style.color = "#787878";
                                  }
                                }}
                              >
                                {favoritingItems.has(
                                  getFavoriteKey("publication", itemId, p)
                                ) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Heart
                                    className={`w-4 h-4 ${
                                      isFavorited ? "fill-current" : ""
                                    }`}
                                  />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                      <FileText className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      No Publications Found
                    </h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      We're curating relevant research publications for you.
                      Check back soon!
                    </p>
                  </div>
                ))}

              {selectedCategory === "collaborators" && (
                <div className="col-span-full">
                  {/* Collaborators List - Experts on Platform First, Then Global Experts */}
                  {(() => {
                    const collabioraExperts = sortByMatchPercentage(
                      data.experts
                    ).slice(0, 6);
                    const globalExpertsList =
                      sortByMatchPercentage(globalExperts);
                    const hasRecommendedExperts = collabioraExperts.length > 0;
                    const hasGlobalExperts = globalExpertsList.length > 0;

                    return hasRecommendedExperts || hasGlobalExperts ? (
                      <div className="space-y-8">
                        {/* Experts on Platform Section */}
                        {hasRecommendedExperts && (
                          <>
                            <div className="col-span-full">
                              <div
                                className="mb-8 p-6 rounded-2xl border-2 shadow-lg"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(47, 60, 150, 0.1), rgba(37, 48, 117, 0.05))",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                    }}
                                  >
                                    <UserPlus className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h3
                                      className="text-2xl font-bold mb-2 flex items-center gap-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Experts on Platform
                                      <span
                                        className="text-sm font-normal px-3 py-1 rounded-full"
                                        style={{
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.3)",
                                          color: "#253075",
                                        }}
                                      >
                                        {collabioraExperts.length}{" "}
                                        {collabioraExperts.length === 1
                                          ? "Expert"
                                          : "Experts"}
                                      </span>
                                    </h3>
                                    <p
                                      className="text-sm leading-relaxed"
                                      style={{ color: "#787878" }}
                                    >
                                      Connect with leading researchers and
                                      experts in your field. Explore their
                                      profiles, publications, and research
                                      interests.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {collabioraExperts.map((e, idx) => {
                                  const isCuralinkExpert = !!(
                                    e._id || e.userId
                                  );
                                  const expertId =
                                    e.name ||
                                    e.id ||
                                    e._id ||
                                    e.userId ||
                                    `expert-${idx}`;
                                  const itemId =
                                    e.name || e.orcid || e.id || e._id;
                                  const medicalInterests = isCuralinkExpert
                                    ? [
                                        ...(e.specialties || []),
                                        ...(e.interests || []),
                                      ]
                                    : e.researchInterests || [];
                                  const locationText =
                                    isCuralinkExpert && e.location
                                      ? typeof e.location === "string"
                                        ? e.location
                                        : `${e.location.city || ""}${
                                            e.location.city &&
                                            e.location.country
                                              ? ", "
                                              : ""
                                          }${e.location.country || ""}`.trim()
                                      : e.location || null;

                                  // Check if expert is favorited
                                  const isFavorited = favorites.some((fav) => {
                                    if (
                                      fav.type !== "collaborator" &&
                                      fav.type !== "expert"
                                    )
                                      return false;
                                    const collaboratorId =
                                      e._id || e.userId || e.id;
                                    if (
                                      collaboratorId &&
                                      (fav.item?.id === collaboratorId ||
                                        fav.item?._id === collaboratorId)
                                    ) {
                                      return true;
                                    }
                                    if (e.name && fav.item?.name) {
                                      return fav.item.name === e.name;
                                    }
                                    if (
                                      fav.item?.id === itemId ||
                                      fav.item?._id === itemId ||
                                      fav.item?.orcid === itemId
                                    ) {
                                      return true;
                                    }
                                    return false;
                                  });

                                  return (
                                    <div
                                      key={expertId}
                                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                                      style={{
                                        borderColor: "rgba(208, 196, 226, 0.3)",
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
                                        {e.matchPercentage !== undefined && (
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
                                                  {e.matchPercentage}% Match
                                                </span>
                                              </div>
                                              {isCuralinkExpert && (
                                                <div
                                                  className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(208, 196, 226, 0.2)",
                                                    border:
                                                      "1px solid rgba(208, 196, 226, 0.3)",
                                                  }}
                                                >
                                                  <CheckCircle
                                                    className="w-3.5 h-3.5"
                                                    style={{ color: "#2F3C96" }}
                                                  />
                                                  <span
                                                    className="text-xs font-semibold"
                                                    style={{ color: "#2F3C96" }}
                                                  >
                                                    On Platform
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            {/* Progress Bar */}
                                            <div
                                              className="w-full h-2.5 rounded-full overflow-hidden"
                                              style={{
                                                backgroundColor:
                                                  "rgba(208, 196, 226, 0.3)",
                                              }}
                                            >
                                              <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                  width: `${e.matchPercentage}%`,
                                                  background:
                                                    "linear-gradient(90deg, #2F3C96, #253075)",
                                                }}
                                              ></div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Available for Collaboration */}
                                        {isCuralinkExpert &&
                                          e.available === true && (
                                            <div
                                              className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg border"
                                              style={{
                                                backgroundColor:
                                                  "rgba(208, 196, 226, 0.2)",
                                                borderColor:
                                                  "rgba(208, 196, 226, 0.3)",
                                                color: "#2F3C96",
                                              }}
                                            >
                                              <Calendar className="w-4 h-4" />
                                              <span className="text-xs font-semibold">
                                                Available for Collaboration
                                              </span>
                                            </div>
                                          )}

                                        <div className="flex items-start gap-4 mb-4">
                                          {/* Avatar */}
                                          <div
                                            className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0 ring-2"
                                            style={{
                                              background:
                                                "linear-gradient(135deg, #2F3C96, #253075)",
                                              ringColor:
                                                "rgba(208, 196, 226, 0.3)",
                                            }}
                                          >
                                            {e.name?.charAt(0)?.toUpperCase() ||
                                              "E"}
                                          </div>

                                          {/* Main Content */}
                                          <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="mb-1.5">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                  <h3
                                                    className="text-lg font-bold mb-1 leading-tight"
                                                    style={{ color: "#2F3C96" }}
                                                  >
                                                    {e.name || "Unknown Expert"}
                                                  </h3>
                                                  {/* Hide ORCID for on-platform experts */}
                                                  {e.orcid && !isCuralinkExpert && (
                                                    <span className="text-sm text-slate-500 font-mono">
                                                      {e.orcid}
                                                    </span>
                                                  )}
                                                </div>
                                                <button
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    const collaboratorId =
                                                      e._id || e.userId || e.id;
                                                    if (collaboratorId) {
                                                      toggleFavorite(
                                                        "collaborator",
                                                        collaboratorId,
                                                        e
                                                      );
                                                    } else {
                                                      toggleFavorite(
                                                        "expert",
                                                        itemId,
                                                        e
                                                      );
                                                    }
                                                  }}
                                                  disabled={favoritingItems.has(
                                                    getFavoriteKey(
                                                      isCuralinkExpert
                                                        ? "collaborator"
                                                        : "expert",
                                                      isCuralinkExpert
                                                        ? e._id ||
                                                            e.userId ||
                                                            e.id
                                                        : itemId,
                                                      e
                                                    )
                                                  )}
                                                  className={`p-1.5 rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    isFavorited
                                                      ? "bg-red-50 border-red-200 text-red-500 shadow-sm"
                                                      : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                                  }`}
                                                >
                                                  {favoritingItems.has(
                                                    getFavoriteKey(
                                                      isCuralinkExpert
                                                        ? "collaborator"
                                                        : "expert",
                                                      isCuralinkExpert
                                                        ? e._id ||
                                                            e.userId ||
                                                            e.id
                                                        : itemId,
                                                      e
                                                    )
                                                  ) ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                  ) : (
                                                    <Heart
                                                      className={`w-4 h-4 ${
                                                        isFavorited
                                                          ? "fill-current"
                                                          : ""
                                                      }`}
                                                    />
                                                  )}
                                                </button>
                                              </div>
                                            </div>

                                            {/* Basic Info */}
                                            <div className="space-y-1 mb-3">
                                              {locationText && (
                                                <div className="flex items-center text-sm text-slate-600">
                                                  <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                                  <span>{locationText}</span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Research Interests */}
                                            {medicalInterests.length > 0 && (
                                              <div className="mb-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                  {medicalInterests
                                                    .slice(0, 5)
                                                    .map((interest, idx) => (
                                                      <span
                                                        key={idx}
                                                        className="text-xs px-2 py-0.5 rounded-md border"
                                                        style={{
                                                          backgroundColor:
                                                            "rgba(208, 196, 226, 0.2)",
                                                          color: "#2F3C96",
                                                          borderColor:
                                                            "rgba(208, 196, 226, 0.3)",
                                                        }}
                                                      >
                                                        {interest}
                                                      </span>
                                                    ))}
                                                  {medicalInterests.length >
                                                    5 && (
                                                    <span className="text-xs text-slate-500 px-2 py-0.5">
                                                      +
                                                      {medicalInterests.length -
                                                        5}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Biography */}
                                            {e.bio && (
                                              <div className="mb-3">
                                                <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">
                                                  {e.bio}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-3 border-t border-slate-100 mt-auto">
                                          {isCuralinkExpert ? (
                                            <button
                                              onClick={() => {
                                                const collaboratorId =
                                                  e._id || e.userId || e.id;
                                                if (collaboratorId) {
                                                  const params =
                                                    new URLSearchParams();
                                                  if (e.name)
                                                    params.set("name", e.name);
                                                  const locationText =
                                                    e.location
                                                      ? typeof e.location ===
                                                        "string"
                                                        ? e.location
                                                        : `${
                                                            e.location.city ||
                                                            ""
                                                          }${
                                                            e.location.city &&
                                                            e.location.country
                                                              ? ", "
                                                              : ""
                                                          }${
                                                            e.location
                                                              .country || ""
                                                          }`.trim()
                                                      : null;
                                                  if (locationText)
                                                    params.set(
                                                      "location",
                                                      locationText
                                                    );
                                                  if (e.bio)
                                                    params.set("bio", e.bio);
                                                  navigate(
                                                    `/curalink-expert/profile/${collaboratorId}?${params.toString()}`
                                                  );
                                                } else {
                                                  setCollaboratorModal({
                                                    open: true,
                                                    collaborator: e,
                                                  });
                                                }
                                              }}
                                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm hover:shadow-md text-white"
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
                                              <UserPlus className="w-3.5 h-3.5" />
                                              View Profile
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                const params =
                                                  new URLSearchParams();
                                                params.set(
                                                  "name",
                                                  e.name || ""
                                                );
                                                if (e.affiliation)
                                                  params.set(
                                                    "affiliation",
                                                    e.affiliation
                                                  );
                                                if (e.location)
                                                  params.set(
                                                    "location",
                                                    e.location
                                                  );
                                                if (e.orcid)
                                                  params.set("orcid", e.orcid);
                                                if (e.biography)
                                                  params.set(
                                                    "biography",
                                                    e.biography
                                                  );
                                                if (
                                                  e.researchInterests &&
                                                  Array.isArray(
                                                    e.researchInterests
                                                  )
                                                ) {
                                                  params.set(
                                                    "researchInterests",
                                                    JSON.stringify(
                                                      e.researchInterests
                                                    )
                                                  );
                                                }
                                                params.set("from", "dashboard");
                                                navigate(
                                                  `/expert/profile?${params.toString()}`
                                                );
                                              }}
                                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm hover:shadow-md text-white"
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
                                              <Info className="w-3.5 h-3.5" />
                                              View Profile
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Global Experts Section */}
                        {hasGlobalExperts && (
                          <>
                            {hasRecommendedExperts && (
                              <div className="col-span-full my-8 flex items-center gap-4">
                                <div
                                  className="flex-1 h-px"
                                  style={{
                                    background:
                                      "linear-gradient(90deg, transparent, rgba(47, 60, 150, 0.3), transparent)",
                                  }}
                                ></div>
                                <div
                                  className="px-4 py-2 rounded-full"
                                  style={{
                                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                                    border:
                                      "2px solid rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <span
                                    className="text-xs font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    Global Research Experts
                                  </span>
                                </div>
                                <div
                                  className="flex-1 h-px"
                                  style={{
                                    background:
                                      "linear-gradient(90deg, transparent, rgba(47, 60, 150, 0.3), transparent)",
                                  }}
                                ></div>
                              </div>
                            )}
                            <div className="col-span-full">
                              <div
                                className="mb-8 p-6 rounded-2xl border-2 shadow-lg"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(47, 60, 150, 0.1), rgba(37, 48, 117, 0.05))",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                    }}
                                  >
                                    <BookOpen className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h3
                                      className="text-2xl font-bold mb-2 flex items-center gap-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Global Research Experts
                                      <span
                                        className="text-sm font-normal px-3 py-1 rounded-full"
                                        style={{
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.3)",
                                          color: "#253075",
                                        }}
                                      >
                                        {globalExpertsList.length}{" "}
                                        {globalExpertsList.length === 1
                                          ? "Researcher"
                                          : "Researchers"}
                                      </span>
                                    </h3>
                                    <p
                                      className="text-sm leading-relaxed"
                                      style={{ color: "#787878" }}
                                    >
                                      Discover leading researchers and their
                                      published work in your field. Explore
                                      their publications, research interests,
                                      and academic achievements.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {globalExpertsList.map((e, idx) => {
                                  const isCuralinkExpert = !!(
                                    e._id || e.userId
                                  );
                                  const expertId =
                                    e.name || e.id || e._id || `expert-${idx}`;
                                  const itemId = e.orcid || e.id || e._id;
                                  const isFavorited = favorites.some((fav) => {
                                    if (fav.type !== "expert") return false;
                                    if (e.name && fav.item?.name) {
                                      return fav.item.name === e.name;
                                    }
                                    if (
                                      fav.item?.id === itemId ||
                                      fav.item?._id === itemId ||
                                      fav.item?.orcid === itemId
                                    ) {
                                      return true;
                                    }
                                    return false;
                                  });

                                  return (
                                    <div
                                      key={expertId}
                                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full"
                                      style={{
                                        borderColor: "rgba(208, 196, 226, 0.3)",
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
                                        {e.matchPercentage !== undefined && (
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
                                                  {e.matchPercentage}% Match
                                                </span>
                                              </div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div
                                              className="w-full h-2.5 rounded-full overflow-hidden"
                                              style={{
                                                backgroundColor:
                                                  "rgba(208, 196, 226, 0.3)",
                                              }}
                                            >
                                              <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                  width: `${e.matchPercentage}%`,
                                                  background:
                                                    "linear-gradient(90deg, #2F3C96, #253075)",
                                                }}
                                              ></div>
                                            </div>
                                          </div>
                                        )}

                                        <div className="flex items-start gap-4 mb-4">
                                          {/* Avatar */}
                                          <div
                                            className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0 ring-2"
                                            style={{
                                              background:
                                                "linear-gradient(135deg, #2F3C96, #253075)",
                                              ringColor:
                                                "rgba(208, 196, 226, 0.3)",
                                            }}
                                          >
                                            {e.name?.charAt(0)?.toUpperCase() ||
                                              "E"}
                                          </div>

                                          {/* Main Content */}
                                          <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="mb-1.5">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                  <h3
                                                    className="text-lg font-bold mb-1 leading-tight"
                                                    style={{ color: "#2F3C96" }}
                                                  >
                                                    {e.name || "Unknown Expert"}
                                                  </h3>
                                                  {/* Hide ORCID for on-platform experts */}
                                                  {e.orcid && !isCuralinkExpert && (
                                                    <span className="text-sm text-slate-500 font-mono">
                                                      {e.orcid}
                                                    </span>
                                                  )}
                                                </div>
                                                <button
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleFavorite(
                                                      "expert",
                                                      itemId,
                                                      e
                                                    );
                                                  }}
                                                  disabled={favoritingItems.has(
                                                    getFavoriteKey(
                                                      "expert",
                                                      itemId,
                                                      e
                                                    )
                                                  )}
                                                  className={`p-1.5 rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    isFavorited
                                                      ? "bg-red-50 border-red-200 text-red-500 shadow-sm"
                                                      : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                                  }`}
                                                >
                                                  {favoritingItems.has(
                                                    getFavoriteKey(
                                                      "expert",
                                                      itemId,
                                                      e
                                                    )
                                                  ) ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                  ) : (
                                                    <Heart
                                                      className={`w-4 h-4 ${
                                                        isFavorited
                                                          ? "fill-current"
                                                          : ""
                                                      }`}
                                                    />
                                                  )}
                                                </button>
                                              </div>
                                            </div>

                                            {/* Basic Info */}
                                            <div className="space-y-1 mb-3">
                                              {e.currentPosition && (
                                                <div className="flex items-start text-sm text-slate-700">
                                                  <Briefcase className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                                                  <span className="flex-1 leading-relaxed">
                                                    {e.currentPosition}
                                                  </span>
                                                </div>
                                              )}
                                              {!e.currentPosition &&
                                                e.affiliation && (
                                                  <div className="flex items-start text-sm text-slate-700">
                                                    <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                                                    <span className="flex-1 leading-relaxed">
                                                      {e.affiliation}
                                                    </span>
                                                  </div>
                                                )}
                                              {e.location && (
                                                <div className="flex items-center text-sm text-slate-600">
                                                  <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                                  <span>{e.location}</span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Biography */}
                                            {e.biography && (
                                              <div className="mb-3">
                                                <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">
                                                  {e.biography}
                                                </p>
                                              </div>
                                            )}

                                            {/* Research Interests */}
                                            {e.researchInterests &&
                                              Array.isArray(
                                                e.researchInterests
                                              ) &&
                                              e.researchInterests.length >
                                                0 && (
                                                <div className="mb-3">
                                                  <div className="flex flex-wrap gap-1.5">
                                                    {e.researchInterests
                                                      .slice(0, 5)
                                                      .map((interest, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="text-xs px-2 py-0.5 rounded-md border"
                                                          style={{
                                                            backgroundColor:
                                                              "rgba(208, 196, 226, 0.2)",
                                                            color: "#2F3C96",
                                                            borderColor:
                                                              "rgba(208, 196, 226, 0.3)",
                                                          }}
                                                        >
                                                          {interest}
                                                        </span>
                                                      ))}
                                                    {e.researchInterests
                                                      .length > 5 && (
                                                      <span className="text-xs text-slate-500 px-2 py-0.5">
                                                        +
                                                        {e.researchInterests
                                                          .length - 5}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-3 border-t border-slate-100 mt-auto">
                                          {e.email && (
                                            <a
                                              href={`mailto:${e.email}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toast.success(
                                                  "Message sent successfully!"
                                                );
                                              }}
                                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm hover:shadow-md text-white mb-2 w-full"
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
                                              <Mail className="w-3.5 h-3.5" />
                                              Contact
                                            </a>
                                          )}
                                          <button
                                            onClick={() => {
                                              const params =
                                                new URLSearchParams();
                                              params.set("name", e.name || "");
                                              if (e.affiliation)
                                                params.set(
                                                  "affiliation",
                                                  e.affiliation
                                                );
                                              if (e.location)
                                                params.set(
                                                  "location",
                                                  e.location
                                                );
                                              if (e.orcid)
                                                params.set("orcid", e.orcid);
                                              if (e.biography)
                                                params.set(
                                                  "biography",
                                                  e.biography
                                                );
                                              if (
                                                e.researchInterests &&
                                                Array.isArray(
                                                  e.researchInterests
                                                )
                                              ) {
                                                params.set(
                                                  "researchInterests",
                                                  JSON.stringify(
                                                    e.researchInterests
                                                  )
                                                );
                                              }
                                              params.set("from", "dashboard");
                                              navigate(
                                                `/expert/profile?${params.toString()}`
                                              );
                                            }}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all shadow-sm hover:shadow-md text-white"
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
                                            <Info className="w-3.5 h-3.5" />
                                            View Profile
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                          }}
                        >
                          <Users
                            className="w-10 h-10"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <h3
                          className="text-lg font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          No Collaborators Found
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          We're connecting you with relevant researchers. Check
                          back soon!
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedCategory === "forums" && (
                <div className="col-span-full">
                  {/* Section Title */}
                  <div className="mb-6">
                    <h2
                      className="text-2xl font-bold mb-1"
                      style={{ color: "#2F3C96" }}
                    >
                      Forums
                    </h2>
                    <p className="text-sm" style={{ color: "#787878" }}>
                      Connect with the research community and share insights
                    </p>
                  </div>

                  {/* Header Section */}
                  <div className="mb-6">
                    <div
                      className="bg-white rounded-xl shadow-sm border p-6"
                      style={{
                        borderColor: "rgba(208, 196, 226, 0.3)",
                        background:
                          "linear-gradient(135deg, rgba(245, 242, 248, 0.5), rgba(232, 224, 239, 0.3))",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.1)",
                          }}
                        >
                          <MessageCircle
                            className="w-7 h-7"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <div className="flex-1">
                          <h2
                            className="text-xl font-bold mb-2"
                            style={{ color: "#2F3C96" }}
                          >
                            Community Forums
                          </h2>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "#787878" }}
                          >
                            Connect with researchers, share experiences, ask
                            questions, and collaborate with peers in your field.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Forums Grid */}
                  {(() => {
                    const forumsWithThreads = forumsCategories.filter(
                      (category) => (category.threadCount || 0) >= 2
                    );
                    return forumsWithThreads.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {forumsWithThreads.map((category, idx) => (
                          <div
                            key={category._id || idx}
                            className="bg-white rounded-xl shadow-sm border transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden flex flex-col h-full cursor-pointer"
                            style={{
                              borderColor: "rgba(208, 196, 226, 0.3)",
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
                            onClick={() =>
                              navigate(`/forums?category=${category._id}`)
                            }
                          >
                            <div className="p-5 flex flex-col flex-grow">
                              {/* Icon and Title */}
                              <div className="flex items-start gap-3 mb-4">
                                <div
                                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: "rgba(208, 196, 226, 0.3)",
                                  }}
                                >
                                  <MessageCircle
                                    className="w-6 h-6"
                                    style={{ color: "#2F3C96" }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className="text-base font-bold mb-1"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {category.name || "Unnamed Category"}
                                  </h3>
                                  {category.description && (
                                    <p
                                      className="text-sm line-clamp-2"
                                      style={{ color: "#787878" }}
                                    >
                                      {category.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Stats Section */}
                              <div
                                className="flex items-center gap-4 py-3 px-4 rounded-lg mb-4"
                                style={{
                                  backgroundColor: "rgba(245, 242, 248, 0.5)",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <MessageCircle
                                    className="w-4 h-4"
                                    style={{ color: "#2F3C96" }}
                                  />
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: "#2F3C96" }}
                                  >
                                    {category.threadCount || 0}
                                  </span>
                                  <span
                                    className="text-xs"
                                    style={{ color: "#787878" }}
                                  >
                                    {category.threadCount === 1
                                      ? "thread"
                                      : "threads"}
                                  </span>
                                </div>
                              </div>

                              {/* Recent Threads Preview */}
                              {forumThreads[category._id] &&
                                forumThreads[category._id].length > 0 && (
                                  <div className="mt-auto">
                                    <h4
                                      className="text-xs font-semibold mb-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Recent Discussions
                                    </h4>
                                    <div className="space-y-2">
                                      {forumThreads[category._id].map(
                                        (thread, threadIdx) => (
                                          <div
                                            key={thread._id || threadIdx}
                                            className="p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all"
                                            style={{
                                              borderColor:
                                                "rgba(208, 196, 226, 0.3)",
                                              backgroundColor:
                                                "rgba(245, 242, 248, 0.3)",
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(
                                                `/forums?category=${category._id}&thread=${thread._id}`
                                              );
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.borderColor =
                                                "rgba(47, 60, 150, 0.4)";
                                              e.currentTarget.style.backgroundColor =
                                                "rgba(245, 242, 248, 0.5)";
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.borderColor =
                                                "rgba(208, 196, 226, 0.3)";
                                              e.currentTarget.style.backgroundColor =
                                                "rgba(245, 242, 248, 0.3)";
                                            }}
                                          >
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                              <div
                                                className="text-sm font-medium line-clamp-1 flex-1"
                                                style={{ color: "#2F3C96" }}
                                              >
                                                {thread.title}
                                              </div>
                                              {/* Favorite Button */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleFavorite(
                                                    "thread",
                                                    thread._id,
                                                    thread
                                                  );
                                                }}
                                                disabled={favoritingItems.has(
                                                  getFavoriteKey(
                                                    "thread",
                                                    thread._id,
                                                    thread
                                                  )
                                                )}
                                                className="shrink-0 p-1.5 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{
                                                  backgroundColor:
                                                    favorites.some(
                                                      (fav) =>
                                                        (fav.type ===
                                                          "thread" ||
                                                          fav.type ===
                                                            "forum") &&
                                                        (fav.item?.id ===
                                                          thread._id ||
                                                          fav.item?._id ===
                                                            thread._id ||
                                                          fav.item?.threadId ===
                                                            thread._id)
                                                    )
                                                      ? "rgba(245, 158, 11, 0.1)"
                                                      : "rgba(245, 242, 248, 0.5)",
                                                  borderColor: favorites.some(
                                                    (fav) =>
                                                      (fav.type === "thread" ||
                                                        fav.type === "forum") &&
                                                      (fav.item?.id ===
                                                        thread._id ||
                                                        fav.item?._id ===
                                                          thread._id ||
                                                        fav.item?.threadId ===
                                                          thread._id)
                                                  )
                                                    ? "rgba(245, 158, 11, 0.3)"
                                                    : "rgba(208, 196, 226, 0.3)",
                                                  color: favorites.some(
                                                    (fav) =>
                                                      (fav.type === "thread" ||
                                                        fav.type === "forum") &&
                                                      (fav.item?.id ===
                                                        thread._id ||
                                                        fav.item?._id ===
                                                          thread._id ||
                                                        fav.item?.threadId ===
                                                          thread._id)
                                                  )
                                                    ? "#F59E0B"
                                                    : "#787878",
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (
                                                    !favorites.some(
                                                      (fav) =>
                                                        (fav.type ===
                                                          "thread" ||
                                                          fav.type ===
                                                            "forum") &&
                                                        (fav.item?.id ===
                                                          thread._id ||
                                                          fav.item?._id ===
                                                            thread._id ||
                                                          fav.item?.threadId ===
                                                            thread._id)
                                                    )
                                                  ) {
                                                    e.currentTarget.style.backgroundColor =
                                                      "rgba(245, 158, 11, 0.1)";
                                                    e.currentTarget.style.borderColor =
                                                      "rgba(245, 158, 11, 0.3)";
                                                    e.currentTarget.style.color =
                                                      "#F59E0B";
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (
                                                    !favorites.some(
                                                      (fav) =>
                                                        (fav.type ===
                                                          "thread" ||
                                                          fav.type ===
                                                            "forum") &&
                                                        (fav.item?.id ===
                                                          thread._id ||
                                                          fav.item?._id ===
                                                            thread._id ||
                                                          fav.item?.threadId ===
                                                            thread._id)
                                                    )
                                                  ) {
                                                    e.currentTarget.style.backgroundColor =
                                                      "rgba(245, 242, 248, 0.5)";
                                                    e.currentTarget.style.borderColor =
                                                      "rgba(208, 196, 226, 0.3)";
                                                    e.currentTarget.style.color =
                                                      "#787878";
                                                  }
                                                }}
                                              >
                                                {favoritingItems.has(
                                                  getFavoriteKey(
                                                    "thread",
                                                    thread._id,
                                                    thread
                                                  )
                                                ) ? (
                                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                  <Star
                                                    className={`w-3.5 h-3.5 ${
                                                      favorites.some(
                                                        (fav) =>
                                                          (fav.type ===
                                                            "thread" ||
                                                            fav.type ===
                                                              "forum") &&
                                                          (fav.item?.id ===
                                                            thread._id ||
                                                            fav.item?._id ===
                                                              thread._id ||
                                                            fav.item
                                                              ?.threadId ===
                                                              thread._id)
                                                      )
                                                        ? "fill-current"
                                                        : ""
                                                    }`}
                                                  />
                                                )}
                                              </button>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                              <div
                                                className="flex items-center gap-1"
                                                style={{ color: "#787878" }}
                                              >
                                                <User className="w-3 h-3" />
                                                <span className="truncate max-w-[80px]">
                                                  {thread.authorUserId
                                                    ?.username || "Anonymous"}
                                                </span>
                                              </div>
                                              <div
                                                className="flex items-center gap-1"
                                                style={{ color: "#787878" }}
                                              >
                                                <MessageSquare className="w-3 h-3" />
                                                <span>
                                                  {thread.replyCount || 0}
                                                </span>
                                              </div>
                                              <div
                                                className="flex items-center gap-1"
                                                style={{ color: "#787878" }}
                                              >
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                  {new Date(
                                                    thread.createdAt
                                                  ).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                      month: "short",
                                                      day: "numeric",
                                                    }
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* View Forum Button */}
                              <button
                                className="mt-4 w-full py-2 rounded-lg text-sm font-semibold transition-all text-white"
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/forums?category=${category._id}`);
                                }}
                              >
                                View Forum
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                          style={{
                            backgroundColor: "rgba(208, 196, 226, 0.2)",
                          }}
                        >
                          <MessageCircle
                            className="w-10 h-10"
                            style={{ color: "#2F3C96" }}
                          />
                        </div>
                        <h3
                          className="text-lg font-semibold mb-2"
                          style={{ color: "#2F3C96" }}
                        >
                          No Forums Available
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          Forums will appear here once they become available.
                          Check back soon!
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedCategory === "favorites" && (
                <div className="col-span-full">
                  {favorites.length > 0 ? (
                    (() => {
                      // Group favorites by type
                      const groupedFavorites = {
                        publication: favorites.filter(
                          (f) => f.type === "publication"
                        ),
                        trial: favorites.filter((f) => f.type === "trial"),
                        expert: favorites.filter(
                          (f) =>
                            f.type === "expert" || f.type === "collaborator"
                        ),
                        forum: favorites.filter(
                          (f) => f.type === "forum" || f.type === "thread"
                        ),
                      };

                      const hasAnyFavorites =
                        groupedFavorites.publication.length > 0 ||
                        groupedFavorites.trial.length > 0 ||
                        groupedFavorites.expert.length > 0 ||
                        groupedFavorites.forum.length > 0;

                      return hasAnyFavorites ? (
                        <div className="space-y-8">
                          {/* Publications Section */}
                          {groupedFavorites.publication.length > 0 && (
                            <div>
                              <div
                                className="mb-6 p-6 rounded-2xl border-2 shadow-lg"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(47, 60, 150, 0.1), rgba(37, 48, 117, 0.05))",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                    }}
                                  >
                                    <FileText className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h3
                                      className="text-2xl font-bold mb-2 flex items-center gap-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Favorite Publications
                                      <span
                                        className="text-sm font-normal px-3 py-1 rounded-full"
                                        style={{
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.3)",
                                          color: "#253075",
                                        }}
                                      >
                                        {groupedFavorites.publication.length}{" "}
                                        {groupedFavorites.publication.length ===
                                        1
                                          ? "Publication"
                                          : "Publications"}
                                      </span>
                                    </h3>
                                    <p
                                      className="text-sm leading-relaxed"
                                      style={{ color: "#787878" }}
                                    >
                                      Your saved research publications and
                                      papers
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {groupedFavorites.publication.map((fav) => {
                                  const item = fav.item;
                                  return (
                                    <div
                                      key={fav._id}
                                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden"
                                      style={{
                                        borderColor: "rgba(208, 196, 226, 0.3)",
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
                                      <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <FileText
                                              className="w-5 h-5"
                                              style={{ color: "#2F3C96" }}
                                            />
                                            <Star
                                              className="w-4 h-4"
                                              style={{ color: "#F59E0B" }}
                                            />
                                          </div>
                                        </div>
                                        <h4
                                          className="font-bold text-base mb-2"
                                          style={{ color: "#2F3C96" }}
                                        >
                                          {item.title || "Untitled"}
                                        </h4>
                                        <div className="space-y-2 mb-4">
                                          {item.journal && (
                                            <div
                                              className="flex items-center gap-2 text-sm"
                                              style={{ color: "#787878" }}
                                            >
                                              <BookOpen className="w-3.5 h-3.5" />
                                              <span>{item.journal}</span>
                                            </div>
                                          )}
                                          {item.authors &&
                                            Array.isArray(item.authors) &&
                                            item.authors.length > 0 && (
                                              <div
                                                className="flex items-center gap-2 text-sm"
                                                style={{ color: "#787878" }}
                                              >
                                                <User className="w-3.5 h-3.5" />
                                                <span>
                                                  {item.authors
                                                    .slice(0, 3)
                                                    .join(", ")}
                                                  {item.authors.length > 3 &&
                                                    " et al."}
                                                </span>
                                              </div>
                                            )}
                                          {item.year && (
                                            <div
                                              className="flex items-center gap-2 text-sm"
                                              style={{ color: "#787878" }}
                                            >
                                              <Calendar className="w-3.5 h-3.5" />
                                              <span>{item.year}</span>
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          onClick={() =>
                                            openPublicationDetailsModal(item)
                                          }
                                          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all w-full"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
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
                                          View Publication
                                          <ExternalLink className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Trials Section */}
                          {groupedFavorites.trial.length > 0 && (
                            <div>
                              <div
                                className="mb-6 p-6 rounded-2xl border-2 shadow-lg"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(47, 60, 150, 0.1), rgba(37, 48, 117, 0.05))",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                    }}
                                  >
                                    <Beaker className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h3
                                      className="text-2xl font-bold mb-2 flex items-center gap-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Favorite Trials
                                      <span
                                        className="text-sm font-normal px-3 py-1 rounded-full"
                                        style={{
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.3)",
                                          color: "#253075",
                                        }}
                                      >
                                        {groupedFavorites.trial.length}{" "}
                                        {groupedFavorites.trial.length === 1
                                          ? "Trial"
                                          : "Trials"}
                                      </span>
                                    </h3>
                                    <p
                                      className="text-sm leading-relaxed"
                                      style={{ color: "#787878" }}
                                    >
                                      Your saved clinical trials and research
                                      studies
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {groupedFavorites.trial.map((fav) => {
                                  const item = fav.item;
                                  return (
                                    <div
                                      key={fav._id}
                                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden"
                                      style={{
                                        borderColor: "rgba(208, 196, 226, 0.3)",
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
                                      <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <Beaker
                                              className="w-5 h-5"
                                              style={{ color: "#2F3C96" }}
                                            />
                                            <Star
                                              className="w-4 h-4"
                                              style={{ color: "#F59E0B" }}
                                            />
                                          </div>
                                          {item.status && (
                                            <span
                                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                                item.status
                                              )}`}
                                            >
                                              {item.status.replace(/_/g, " ")}
                                            </span>
                                          )}
                                        </div>
                                        <h4
                                          className="font-bold text-base mb-2"
                                          style={{ color: "#2F3C96" }}
                                        >
                                          {item.title || "Untitled Trial"}
                                        </h4>
                                        <button
                                          onClick={() =>
                                            openTrialDetailsModal(item)
                                          }
                                          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all w-full"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
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
                                          View Trial Details
                                          <ExternalLink className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Experts Section */}
                          {groupedFavorites.expert.length > 0 && (
                            <div>
                              <div
                                className="mb-6 p-6 rounded-2xl border-2 shadow-lg"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(47, 60, 150, 0.1), rgba(37, 48, 117, 0.05))",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                    }}
                                  >
                                    <Users className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h3
                                      className="text-2xl font-bold mb-2 flex items-center gap-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Favorite Collaborators
                                      <span
                                        className="text-sm font-normal px-3 py-1 rounded-full"
                                        style={{
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.3)",
                                          color: "#253075",
                                        }}
                                      >
                                        {groupedFavorites.expert.length}{" "}
                                        {groupedFavorites.expert.length === 1
                                          ? "Collaborator"
                                          : "Collaborators"}
                                      </span>
                                    </h3>
                                    <p
                                      className="text-sm leading-relaxed"
                                      style={{ color: "#787878" }}
                                    >
                                      Your saved researchers and experts
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {groupedFavorites.expert.map((fav) => {
                                  const item = fav.item;
                                  return (
                                    <div
                                      key={fav._id}
                                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden"
                                      style={{
                                        borderColor: "rgba(208, 196, 226, 0.3)",
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
                                      <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <User
                                              className="w-5 h-5"
                                              style={{ color: "#2F3C96" }}
                                            />
                                            <Star
                                              className="w-4 h-4"
                                              style={{ color: "#F59E0B" }}
                                            />
                                          </div>
                                        </div>
                                        <h4
                                          className="font-bold text-base mb-2"
                                          style={{ color: "#2F3C96" }}
                                        >
                                          {item.name || "Unknown Expert"}
                                        </h4>
                                        <div className="space-y-2 mb-4">
                                          {(item.specialties ||
                                            item.interests ||
                                            item.researchInterests) && (
                                            <div
                                              className="flex items-center gap-2 text-sm"
                                              style={{ color: "#787878" }}
                                            >
                                              <Briefcase className="w-3.5 h-3.5" />
                                              <span>
                                                {item.specialties?.join(", ") ||
                                                  item.interests?.join(", ") ||
                                                  item.researchInterests
                                                    ?.slice(0, 2)
                                                    .join(", ")}
                                              </span>
                                            </div>
                                          )}
                                          {item.location &&
                                            (typeof item.location === "string"
                                              ? item.location
                                              : item.location.city ||
                                                item.location.country) && (
                                              <div
                                                className="flex items-center gap-2 text-sm"
                                                style={{ color: "#787878" }}
                                              >
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>
                                                  {typeof item.location ===
                                                  "string"
                                                    ? item.location
                                                    : `${
                                                        item.location.city || ""
                                                      }${
                                                        item.location.city &&
                                                        item.location.country
                                                          ? ", "
                                                          : ""
                                                      }${
                                                        item.location.country ||
                                                        ""
                                                      }`.trim()}
                                                </span>
                                              </div>
                                            )}
                                        </div>
                                        <button
                                          onClick={() => {
                                            if (fav.type === "expert") {
                                              setExpertModal({
                                                open: true,
                                                expert: item,
                                              });
                                            } else if (
                                              fav.type === "collaborator"
                                            ) {
                                              setCollaboratorModal({
                                                open: true,
                                                collaborator: item,
                                              });
                                            }
                                          }}
                                          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all w-full"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
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
                                          View Profile
                                          <ExternalLink className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Forums Section */}
                          {groupedFavorites.forum.length > 0 && (
                            <div>
                              <div
                                className="mb-6 p-6 rounded-2xl border-2 shadow-lg"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(47, 60, 150, 0.1), rgba(37, 48, 117, 0.05))",
                                  borderColor: "rgba(208, 196, 226, 0.3)",
                                }}
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #2F3C96, #253075)",
                                    }}
                                  >
                                    <MessageCircle className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h3
                                      className="text-2xl font-bold mb-2 flex items-center gap-2"
                                      style={{ color: "#2F3C96" }}
                                    >
                                      Favorite Forums
                                      <span
                                        className="text-sm font-normal px-3 py-1 rounded-full"
                                        style={{
                                          backgroundColor:
                                            "rgba(208, 196, 226, 0.3)",
                                          color: "#253075",
                                        }}
                                      >
                                        {groupedFavorites.forum.length}{" "}
                                        {groupedFavorites.forum.length === 1
                                          ? "Forum"
                                          : "Forums"}
                                      </span>
                                    </h3>
                                    <p
                                      className="text-sm leading-relaxed"
                                      style={{ color: "#787878" }}
                                    >
                                      Your saved forum discussions and threads
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {groupedFavorites.forum.map((fav) => {
                                  const item = fav.item;
                                  return (
                                    <div
                                      key={fav._id}
                                      className="bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden"
                                      style={{
                                        borderColor: "rgba(208, 196, 226, 0.3)",
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
                                      <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <MessageCircle
                                              className="w-5 h-5"
                                              style={{ color: "#2F3C96" }}
                                            />
                                            <Star
                                              className="w-4 h-4"
                                              style={{ color: "#F59E0B" }}
                                            />
                                          </div>
                                        </div>
                                        <h4
                                          className="font-bold text-base mb-2"
                                          style={{ color: "#2F3C96" }}
                                        >
                                          {item.name ||
                                            item.title ||
                                            "Unnamed Forum"}
                                        </h4>
                                        {item.description && (
                                          <p
                                            className="text-sm mb-4 line-clamp-2"
                                            style={{ color: "#787878" }}
                                          >
                                            {item.description}
                                          </p>
                                        )}
                                        {item.threadCount !== undefined && (
                                          <div
                                            className="flex items-center gap-2 text-sm mb-4"
                                            style={{ color: "#787878" }}
                                          >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span>
                                              {item.threadCount || 0}{" "}
                                              {item.threadCount === 1
                                                ? "thread"
                                                : "threads"}
                                            </span>
                                          </div>
                                        )}
                                        <button
                                          onClick={() =>
                                            navigate(
                                              `/forums?category=${
                                                item._id || item.id
                                              }`
                                            )
                                          }
                                          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all w-full"
                                          style={{
                                            background:
                                              "linear-gradient(135deg, #2F3C96, #253075)",
                                            color: "#FFFFFF",
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
                                          View Forum
                                          <ExternalLink className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="col-span-full text-center py-16">
                          <div
                            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.2)",
                            }}
                          >
                            <Star
                              className="w-10 h-10"
                              style={{ color: "#2F3C96" }}
                            />
                          </div>
                          <h3
                            className="text-lg font-semibold mb-2"
                            style={{ color: "#2F3C96" }}
                          >
                            No Favorites Yet
                          </h3>
                          <p
                            className="text-sm max-w-md mx-auto"
                            style={{ color: "#787878" }}
                          >
                            Start saving your favorite trials, publications,
                            collaborators, and forums for easy access later.
                          </p>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="col-span-full text-center py-16">
                      <div
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
                        }}
                      >
                        <Star
                          className="w-10 h-10"
                          style={{ color: "#2F3C96" }}
                        />
                      </div>
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{ color: "#2F3C96" }}
                      >
                        No Favorites Yet
                      </h3>
                      <p
                        className="text-sm max-w-md mx-auto"
                        style={{ color: "#787878" }}
                      >
                        Start saving your favorite trials, publications,
                        collaborators, and forums for easy access later.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trial Details Modal */}
      <Modal
        isOpen={trialDetailsModal.open}
        onClose={closeTrialDetailsModal}
        title="Clinical Trial Details"
      >
        {trialDetailsModal.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "#2F3C96" }}
            />
            <span className="ml-3 text-sm" style={{ color: "#787878" }}>
              Loading detailed trial information...
            </span>
          </div>
        ) : trialDetailsModal.trial ? (
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
                    {trialDetailsModal.trial.title}
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
                    {trialDetailsModal.trial._id ||
                      trialDetailsModal.trial.id ||
                      "N/A"}
                  </span>
                  {trialDetailsModal.trial.status && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        trialDetailsModal.trial.status
                      )}`}
                    >
                      {trialDetailsModal.trial.status.replace(/_/g, " ")}
                    </span>
                  )}
                  {trialDetailsModal.trial.phase && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "#F5F5F5",
                        color: "#787878",
                        borderColor: "rgba(232, 232, 232, 1)",
                      }}
                    >
                      Phase {trialDetailsModal.trial.phase}
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Study Purpose */}
              {(trialDetailsModal.trial.description ||
                trialDetailsModal.trial.conditionDescription) && (
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
                    {trialDetailsModal.trial.description ||
                      trialDetailsModal.trial.conditionDescription}
                  </p>
                </div>
              )}

              {/* 2. Who Can Join (Eligibility) */}
              {trialDetailsModal.trial.eligibility && (
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
                        {trialDetailsModal.trial.eligibility.gender || "All"}
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
                        {trialDetailsModal.trial.eligibility.minimumAge !==
                          "Not specified" &&
                        trialDetailsModal.trial.eligibility.minimumAge
                          ? trialDetailsModal.trial.eligibility.minimumAge
                          : "N/A"}
                        {" - "}
                        {trialDetailsModal.trial.eligibility.maximumAge !==
                          "Not specified" &&
                        trialDetailsModal.trial.eligibility.maximumAge
                          ? trialDetailsModal.trial.eligibility.maximumAge
                          : "N/A"}
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
                        {trialDetailsModal.trial.eligibility
                          .healthyVolunteers || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Eligibility Criteria */}
                  {trialDetailsModal.trial.eligibility.criteria &&
                    trialDetailsModal.trial.eligibility.criteria !==
                      "Not specified" && (
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
                            {trialDetailsModal.trial.eligibility.criteria}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Study Population Description */}
                  {trialDetailsModal.trial.eligibility.population && (
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
                          {trialDetailsModal.trial.eligibility.population}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Contact Information */}
              {trialDetailsModal.trial.contacts?.length > 0 && (
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
                    {trialDetailsModal.trial.contacts.map((contact, i) => (
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

              {/* Additional Information */}
              <div
                className="space-y-4 pt-4 border-t"
                style={{ borderColor: "rgba(232, 232, 232, 1)" }}
              >
                {/* Conditions */}
                {trialDetailsModal.trial.conditions?.length > 0 && (
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
                      {trialDetailsModal.trial.conditions.map(
                        (condition, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg border shadow-sm"
                            style={{ color: "#2F3C96", borderColor: "#D0C4E2" }}
                          >
                            {condition}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                {trialDetailsModal.trial.locations &&
                trialDetailsModal.trial.locations.length > 0 ? (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4
                      className="font-bold mb-3 flex items-center gap-2 text-sm"
                      style={{ color: "#2F3C96" }}
                    >
                      <MapPin className="w-4 h-4 text-green-600" />
                      Trial Locations (
                      {trialDetailsModal.trial.locations.length})
                    </h4>
                    <div className="space-y-2">
                      {trialDetailsModal.trial.locations
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
                      {trialDetailsModal.trial.locations.length > 3 && (
                        <div
                          className="text-xs italic"
                          style={{ color: "#787878" }}
                        >
                          + {trialDetailsModal.trial.locations.length - 3} more
                          location(s)
                        </div>
                      )}
                    </div>
                  </div>
                ) : trialDetailsModal.trial.location &&
                  trialDetailsModal.trial.location !== "Not specified" ? (
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
                      {trialDetailsModal.trial.location}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

      </Modal>

      {/* Publication Details Modal */}
      <Modal
        isOpen={publicationDetailsModal.open}
        onClose={closePublicationDetailsModal}
        title="Publication Details"
      >
        {publicationDetailsModal.publication && (
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
                  {publicationDetailsModal.publication.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {publicationDetailsModal.publication.pmid && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                      style={{
                        backgroundColor: "rgba(47, 60, 150, 0.15)",
                        color: "#2F3C96",
                        borderColor: "rgba(47, 60, 150, 0.3)",
                      }}
                    >
                      <FileText className="w-3 h-3 mr-1.5" />
                      PMID: {publicationDetailsModal.publication.pmid}
                    </span>
                  )}
                  {publicationDetailsModal.publication.journal && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md border"
                      style={{
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        color: "#787878",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.journal}
                    </span>
                  )}
                </div>
              </div>

              {/* Abstract Section - Moved to Top */}
              {publicationDetailsModal.publication.abstract && (
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
                      {publicationDetailsModal.publication.abstract}
                    </p>
                  </div>
                </div>
              )}

              {/* Authors Section */}
              {publicationDetailsModal.publication.authors &&
                Array.isArray(publicationDetailsModal.publication.authors) &&
                publicationDetailsModal.publication.authors.length > 0 && (
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
                        {publicationDetailsModal.publication.authors.join(", ")}
                      </p>
                      {publicationDetailsModal.publication.authors.length >
                        1 && (
                        <p
                          className="text-xs mt-2"
                          style={{ color: "#787878" }}
                        >
                          {publicationDetailsModal.publication.authors.length}{" "}
                          authors
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
                    {(publicationDetailsModal.publication.year ||
                      publicationDetailsModal.publication.month) && (
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
                          {publicationDetailsModal.publication.month
                            ? `${publicationDetailsModal.publication.month} `
                            : ""}
                          {publicationDetailsModal.publication.day
                            ? `${publicationDetailsModal.publication.day}, `
                            : ""}
                          {publicationDetailsModal.publication.year || "N/A"}
                        </p>
                      </div>
                    )}

                    {/* Volume & Issue */}
                    {(publicationDetailsModal.publication.volume ||
                      publicationDetailsModal.publication.issue) && (
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
                          {publicationDetailsModal.publication.volume || "N/A"}
                          {publicationDetailsModal.publication.issue
                            ? ` (Issue ${publicationDetailsModal.publication.issue})`
                            : ""}
                        </p>
                      </div>
                    )}

                    {/* Pages */}
                    {publicationDetailsModal.publication.Pages && (
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
                          {publicationDetailsModal.publication.Pages}
                        </p>
                      </div>
                    )}

                    {/* Language */}
                    {publicationDetailsModal.publication.language && (
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
                          {publicationDetailsModal.publication.language}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Keywords Section */}
              {publicationDetailsModal.publication.keywords &&
                publicationDetailsModal.publication.keywords.length > 0 && (
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
                        {publicationDetailsModal.publication.keywords.map(
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
              {publicationDetailsModal.publication.meshTerms &&
                publicationDetailsModal.publication.meshTerms.length > 0 && (
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
                        {publicationDetailsModal.publication.meshTerms
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
                        {publicationDetailsModal.publication.meshTerms.length >
                          10 && (
                          <span
                            className="px-3 py-1.5 text-xs"
                            style={{ color: "#787878" }}
                          >
                            +
                            {publicationDetailsModal.publication.meshTerms
                              .length - 10}{" "}
                            more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Affiliations Section */}
              {publicationDetailsModal.publication.affiliations &&
                publicationDetailsModal.publication.affiliations.length > 0 && (
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
                        {publicationDetailsModal.publication.affiliations[0]}
                      </p>
                    </div>
                  </div>
                )}

              {/* Publication Types */}
              {publicationDetailsModal.publication.publicationTypes &&
                publicationDetailsModal.publication.publicationTypes.length >
                  0 && (
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
                        {publicationDetailsModal.publication.publicationTypes.map(
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
              className="bottom-0 pb-5 px-6 py-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
              style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
            >
              <div className="flex flex-wrap gap-3">
                {publicationDetailsModal.publication.url && (
                  <a
                    href={publicationDetailsModal.publication.url}
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
                  onClick={() =>
                    toggleFavorite(
                      "publication",
                      publicationDetailsModal.publication.id ||
                        publicationDetailsModal.publication.pmid,
                      publicationDetailsModal.publication
                    )
                  }
                  disabled={favoritingItems.has(
                    getFavoriteKey(
                      "publication",
                      publicationDetailsModal.publication.id ||
                        publicationDetailsModal.publication.pmid,
                      publicationDetailsModal.publication
                    )
                  )}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    favorites.some(
                      (fav) =>
                        fav.type === "publication" &&
                        (fav.item?.id ===
                          (publicationDetailsModal.publication.id ||
                            publicationDetailsModal.publication.pmid) ||
                          fav.item?._id ===
                            (publicationDetailsModal.publication.id ||
                              publicationDetailsModal.publication.pmid) ||
                          fav.item?.pmid ===
                            (publicationDetailsModal.publication.id ||
                              publicationDetailsModal.publication.pmid))
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
                            (publicationDetailsModal.publication.id ||
                              publicationDetailsModal.publication.pmid) ||
                            fav.item?._id ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid) ||
                            fav.item?.pmid ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid))
                      )
                    ) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.3)";
                      e.currentTarget.style.borderColor =
                        "rgba(47, 60, 150, 0.4)";
                      e.currentTarget.style.color = "#2F3C96";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (
                      !favorites.some(
                        (fav) =>
                          fav.type === "publication" &&
                          (fav.item?.id ===
                            (publicationDetailsModal.publication.id ||
                              publicationDetailsModal.publication.pmid) ||
                            fav.item?._id ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid) ||
                            fav.item?.pmid ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid))
                      )
                    ) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.2)";
                      e.currentTarget.style.borderColor =
                        "rgba(208, 196, 226, 0.3)";
                      e.currentTarget.style.color = "#787878";
                    }
                  }}
                >
                  {favoritingItems.has(
                    getFavoriteKey(
                      "publication",
                      publicationDetailsModal.publication.id ||
                        publicationDetailsModal.publication.pmid,
                      publicationDetailsModal.publication
                    )
                  ) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-4 h-4 ${
                        favorites.some(
                          (fav) =>
                            fav.type === "publication" &&
                            (fav.item?.id ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid) ||
                              fav.item?._id ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid) ||
                              fav.item?.pmid ===
                                (publicationDetailsModal.publication.id ||
                                  publicationDetailsModal.publication.pmid))
                        )
                          ? "fill-current"
                          : ""
                      }`}
                    />
                  )}
                  {favoritingItems.has(
                    getFavoriteKey(
                      "publication",
                      publicationDetailsModal.publication.id ||
                        publicationDetailsModal.publication.pmid,
                      publicationDetailsModal.publication
                    )
                  )
                    ? "Processing..."
                    : favorites.some(
                        (fav) =>
                          fav.type === "publication" &&
                          (fav.item?.id ===
                            (publicationDetailsModal.publication.id ||
                              publicationDetailsModal.publication.pmid) ||
                            fav.item?._id ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid) ||
                            fav.item?.pmid ===
                              (publicationDetailsModal.publication.id ||
                                publicationDetailsModal.publication.pmid))
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
      {/* Summary Modal */}
      <Modal
        isOpen={summaryModal.open}
        onClose={closeModal}
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
              style={
                summaryModal.type === "trial"
                  ? {
                      backgroundColor: "rgba(232, 224, 239, 0.8)",
                      color: "#2F3C96",
                    }
                  : {
                      backgroundColor: "rgba(232, 224, 239, 0.8)",
                      color: "#2F3C96",
                    }
              }
            >
              {summaryModal.type === "trial"
                ? "Clinical Trial"
                : "Research Publication"}
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
              {/* Simplify Summary Option */}
              {!summaryModal.isSimplified &&
                !summaryModal.loading &&
                summaryModal.summary && (
                  <button
                    onClick={simplifySummary}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.1)",
                      color: "#2F3C96",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.2)";
                      e.currentTarget.style.borderColor =
                        "rgba(47, 60, 150, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.1)";
                      e.currentTarget.style.borderColor =
                        "rgba(208, 196, 226, 0.3)";
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Simplify Summary</span>
                  </button>
                )}
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
                      <Heart className="w-4 h-4" style={{ color: "#2F3C96" }} />
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
          ) : summaryModal.type === "trial" &&
            summaryModal.summary &&
            typeof summaryModal.summary === "object" &&
            summaryModal.summary.structured ? (
            // Structured Trial Summary
            <div className="space-y-4">
              {/* Simplify Summary Option */}
              {!summaryModal.isSimplified &&
                !summaryModal.loading &&
                summaryModal.summary && (
                  <button
                    onClick={simplifySummary}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border"
                    style={{
                      backgroundColor: "rgba(208, 196, 226, 0.1)",
                      color: "#2F3C96",
                      borderColor: "rgba(208, 196, 226, 0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.2)";
                      e.currentTarget.style.borderColor =
                        "rgba(47, 60, 150, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(208, 196, 226, 0.1)";
                      e.currentTarget.style.borderColor =
                        "rgba(208, 196, 226, 0.3)";
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Simplify Summary</span>
                  </button>
                )}
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
                      <Info className="w-4 h-4" style={{ color: "#2F3C96" }} />
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
                style={{ color: "#2F3C96" }}
              >
                {typeof summaryModal.summary === "object"
                  ? summaryModal.summary.summary || "Summary unavailable"
                  : summaryModal.summary || "Summary unavailable"}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Expert/Researcher Modal */}
      <Modal
        isOpen={expertModal.open}
        onClose={() => setExpertModal({ open: false, expert: null })}
        title={expertModal.expert?.name || "Health Expert"}
      >
        {expertModal.expert && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-indigo-200">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {expertModal.expert.name?.charAt(0)?.toUpperCase() || "E"}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-indigo-900 text-lg mb-1">
                  {expertModal.expert.name || "Unknown Researcher"}
                </h3>
                {expertModal.expert.location && (
                  <div className="flex items-center gap-1 text-sm text-indigo-600 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {typeof expertModal.expert.location === "string"
                        ? expertModal.expert.location
                        : `${expertModal.expert.location.city || ""}${
                            expertModal.expert.location.city &&
                            expertModal.expert.location.country
                              ? ", "
                              : ""
                          }${expertModal.expert.location.country || ""}`}
                    </span>
                  </div>
                )}
                {expertModal.expert.orcid && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <LinkIcon className="w-4 h-4" />
                    <a
                      href={`https://orcid.org/${expertModal.expert.orcid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      ORCID: {expertModal.expert.orcid}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Interests */}
            {(() => {
              const interests = [
                ...(expertModal.expert.specialties || []),
                ...(expertModal.expert.interests || []),
                ...(expertModal.expert.researchInterests || []),
              ];
              return interests.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-indigo-700 mb-2">
                    Research Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Biography */}
            {(expertModal.expert.bio || expertModal.expert.biography) && (
              <div>
                <h4 className="font-semibold text-indigo-700 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                  {expertModal.expert.bio || expertModal.expert.biography}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-indigo-200">
              <button
                onClick={async () => {
                  const expertId =
                    expertModal.expert._id ||
                    expertModal.expert.userId ||
                    expertModal.expert.id;
                  await toggleFollow(expertId, "researcher");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  followingStatus[
                    expertModal.expert._id ||
                      expertModal.expert.userId ||
                      expertModal.expert.id
                  ]
                    ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-2 border-indigo-300"
                    : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800"
                }`}
              >
                {followingStatus[
                  expertModal.expert._id ||
                    expertModal.expert.userId ||
                    expertModal.expert.id
                ] ? (
                  <>
                    <Check className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("name", expertModal.expert.name || "");
                  if (expertModal.expert.affiliation)
                    params.set("affiliation", expertModal.expert.affiliation);
                  if (expertModal.expert.location)
                    params.set("location", expertModal.expert.location);
                  if (expertModal.expert.orcid)
                    params.set("orcid", expertModal.expert.orcid);
                  if (expertModal.expert.biography)
                    params.set("biography", expertModal.expert.biography);
                  if (
                    expertModal.expert.researchInterests &&
                    Array.isArray(expertModal.expert.researchInterests)
                  ) {
                    params.set(
                      "researchInterests",
                      JSON.stringify(expertModal.expert.researchInterests)
                    );
                  }
                  params.set("from", "dashboard");
                  navigate(`/expert/profile?${params.toString()}`);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Info className="w-4 h-4" />
                View Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Collaborator Modal */}
      <Modal
        isOpen={collaboratorModal.open}
        onClose={() =>
          setCollaboratorModal({ open: false, collaborator: null })
        }
        title={collaboratorModal.collaborator?.name || "Collaborator"}
      >
        {collaboratorModal.collaborator && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4 pb-4 border-b border-indigo-200">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {collaboratorModal.collaborator.name
                  ?.charAt(0)
                  ?.toUpperCase() || "C"}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-indigo-900 text-lg">
                    {collaboratorModal.collaborator.name ||
                      "Unknown Researcher"}
                  </h3>
                  {collaboratorModal.collaborator.available === true ? (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-300 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      Open for Meetings
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-400/20 text-slate-700 text-xs font-semibold rounded-full border border-slate-300 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      Not Available for Collaboration
                    </span>
                  )}
                </div>
                {collaboratorModal.collaborator.location && (
                  <div className="flex items-center gap-1 text-sm text-indigo-600 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {collaboratorModal.collaborator.location.city || ""}
                      {collaboratorModal.collaborator.location.city &&
                        collaboratorModal.collaborator.location.country &&
                        ", "}
                      {collaboratorModal.collaborator.location.country || ""}
                    </span>
                  </div>
                )}
                {collaboratorModal.collaborator.orcid && (
                  <div className="flex items-center gap-1 text-sm text-indigo-600">
                    <LinkIcon className="w-4 h-4" />
                    <a
                      href={`https://orcid.org/${collaboratorModal.collaborator.orcid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      ORCID: {collaboratorModal.collaborator.orcid}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Interests */}
            {(() => {
              const interests = [
                ...(collaboratorModal.collaborator.specialties || []),
                ...(collaboratorModal.collaborator.interests || []),
              ];
              return interests.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-indigo-700 mb-2">
                    Research Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Biography */}
            {collaboratorModal.collaborator.bio && (
              <div>
                <h4 className="font-semibold text-indigo-700 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                  {collaboratorModal.collaborator.bio}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-indigo-200">
              <button
                onClick={async () => {
                  const collaboratorId =
                    collaboratorModal.collaborator._id ||
                    collaboratorModal.collaborator.userId ||
                    collaboratorModal.collaborator.id;
                  await toggleFollow(collaboratorId, "researcher");
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  followingStatus[
                    collaboratorModal.collaborator._id ||
                      collaboratorModal.collaborator.userId ||
                      collaboratorModal.collaborator.id
                  ]
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-2 border-emerald-300"
                    : "bg-gradient-to-r from-emerald-600 to-indigo-600 text-white hover:from-emerald-700 hover:to-indigo-700"
                }`}
              >
                {followingStatus[
                  collaboratorModal.collaborator._id ||
                    collaboratorModal.collaborator.userId ||
                    collaboratorModal.collaborator.id
                ] ? (
                  <>
                    <Check className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const collaboratorId =
                    collaboratorModal.collaborator._id ||
                    collaboratorModal.collaborator.userId ||
                    collaboratorModal.collaborator.id;
                  if (collaboratorId) {
                    const params = new URLSearchParams();
                    if (collaboratorModal.collaborator.name)
                      params.set("name", collaboratorModal.collaborator.name);
                    const locationText = collaboratorModal.collaborator.location
                      ? typeof collaboratorModal.collaborator.location ===
                        "string"
                        ? collaboratorModal.collaborator.location
                        : `${
                            collaboratorModal.collaborator.location.city || ""
                          }${
                            collaboratorModal.collaborator.location.city &&
                            collaboratorModal.collaborator.location.country
                              ? ", "
                              : ""
                          }${
                            collaboratorModal.collaborator.location.country ||
                            ""
                          }`.trim()
                      : null;
                    if (locationText) params.set("location", locationText);
                    if (collaboratorModal.collaborator.bio)
                      params.set("bio", collaboratorModal.collaborator.bio);
                    navigate(
                      `/curalink-expert/profile/${collaboratorId}?${params.toString()}`
                    );
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all"
              >
                <Info className="w-4 h-4" />
                View Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Message Modal */}
      <Modal
        isOpen={messageModal.open}
        onClose={() =>
          setMessageModal({ open: false, collaborator: null, body: "" })
        }
        title={`Message ${messageModal.collaborator?.name || "Collaborator"}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-indigo-700 mb-2">
              Message
            </label>
            <textarea
              value={messageModal.body}
              onChange={(e) =>
                setMessageModal({ ...messageModal, body: e.target.value })
              }
              rows={6}
              className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Type your message here..."
            />
          </div>
          <button
            onClick={sendMessage}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Message
          </button>
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
                Your message has been sent to the moderator. They will get back
                to you soon.
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
                  Trial ID:{" "}
                  {contactModal.trial?.id || contactModal.trial?._id || "N/A"}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Your Message
                  </label>
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
                </div>
                <textarea
                  value={contactModal.message}
                  onChange={(e) =>
                    setContactModal({
                      ...contactModal,
                      message: e.target.value,
                    })
                  }
                  placeholder="Write your message to the moderator here... or click 'Generate Message' to create one automatically"
                  rows="6"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendMessage}
                  disabled={!contactModal.message.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
                <button
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
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Filter/Sort Modal */}
      <Modal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title={
          selectedCategory === "trials" ? "Filter Trials" : "Sort Publications"
        }
      >
        <div className="space-y-6">
          {selectedCategory === "trials" ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Filter by Status
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setTrialFilter("");
                      setFilterModalOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                      !trialFilter
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    All Statuses
                  </button>
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setTrialFilter(status);
                        setFilterModalOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                        trialFilter === status
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {status.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              {trialFilter && (
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setTrialFilter("");
                      setFilterModalOpen(false);
                    }}
                    className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Sort By
                </label>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setPublicationSort(option.value);
                        setFilterModalOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                        publicationSort === option.value
                          ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Global Expert Details Modal */}
      <Modal
        isOpen={globalExpertDetailsModal.open}
        onClose={closeGlobalExpertDetailsModal}
        title="Expert Details"
      >
        {globalExpertDetailsModal.expert && (
          <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md transform hover:scale-110 transition-transform duration-300">
                  {globalExpertDetailsModal.expert.name
                    ?.charAt(0)
                    ?.toUpperCase() || "E"}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-lg">
                    {globalExpertDetailsModal.expert.name || "Unknown Expert"}
                  </h4>
                  {globalExpertDetailsModal.expert.orcid && (
                    <p className="text-sm text-indigo-600">
                      ORCID: {globalExpertDetailsModal.expert.orcid}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Current Position */}
            {globalExpertDetailsModal.expert.currentPosition && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Current Position
                </h4>
                <p className="text-sm text-slate-700">
                  {globalExpertDetailsModal.expert.currentPosition}
                </p>
              </div>
            )}

            {/* Affiliation */}
            {globalExpertDetailsModal.expert.affiliation && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Affiliation
                </h4>
                <p className="text-sm text-slate-700">
                  {globalExpertDetailsModal.expert.affiliation}
                </p>
              </div>
            )}

            {/* Education */}
            {globalExpertDetailsModal.expert.education && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Education
                </h4>
                <p className="text-sm text-slate-700">
                  {globalExpertDetailsModal.expert.education}
                </p>
              </div>
            )}

            {/* Age & Experience */}
            {(globalExpertDetailsModal.expert.age ||
              globalExpertDetailsModal.expert.yearsOfExperience) && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Age & Experience
                </h4>
                <div className="text-sm text-slate-700 space-y-1">
                  {globalExpertDetailsModal.expert.age && (
                    <p>
                      <strong>Age:</strong>{" "}
                      {globalExpertDetailsModal.expert.age}
                    </p>
                  )}
                  {globalExpertDetailsModal.expert.yearsOfExperience && (
                    <p>
                      <strong>Experience:</strong>{" "}
                      {globalExpertDetailsModal.expert.yearsOfExperience}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {globalExpertDetailsModal.expert.location && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Location
                </h4>
                <p className="text-sm text-slate-700">
                  {globalExpertDetailsModal.expert.location}
                </p>
              </div>
            )}

            {/* Biography */}
            {globalExpertDetailsModal.expert.biography && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600" />
                  Biography
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {globalExpertDetailsModal.expert.biography}
                </p>
              </div>
            )}

            {/* Specialties */}
            {globalExpertDetailsModal.expert.specialties &&
              Array.isArray(globalExpertDetailsModal.expert.specialties) &&
              globalExpertDetailsModal.expert.specialties.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Specialties
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {globalExpertDetailsModal.expert.specialties.map(
                      (specialty, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full"
                        >
                          {specialty}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Research Interests */}
            {globalExpertDetailsModal.expert.researchInterests &&
              Array.isArray(
                globalExpertDetailsModal.expert.researchInterests
              ) &&
              globalExpertDetailsModal.expert.researchInterests.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Research Interests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {globalExpertDetailsModal.expert.researchInterests.map(
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
            {globalExpertDetailsModal.expert.achievements && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Achievements
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {globalExpertDetailsModal.expert.achievements}
                </p>
              </div>
            )}

            {/* Publications */}
            {(() => {
              const expertId =
                globalExpertDetailsModal.expert.name ||
                globalExpertDetailsModal.expert.id ||
                globalExpertDetailsModal.expert._id;
              const expertPublications =
                globalExpertPublications[expertId] || [];
              const isLoadingPubs = loadingGlobalExpertPublications[expertId];

              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      Publications
                    </h4>
                    {expertPublications.length === 0 && (
                      <button
                        onClick={() =>
                          fetchGlobalExpertPublications(
                            globalExpertDetailsModal.expert
                          )
                        }
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
                      Click "Load Publications" to fetch top publications.
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
                {globalExpertDetailsModal.expert.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="w-4 h-4" />
                    <a
                      href={`mailto:${globalExpertDetailsModal.expert.email}`}
                      onClick={() =>
                        toast.success("Message sent successfully!")
                      }
                      className="hover:text-indigo-600 transition-colors"
                    >
                      {globalExpertDetailsModal.expert.email}
                    </a>
                  </div>
                )}
                {globalExpertDetailsModal.expert.orcidUrl && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <LinkIcon className="w-4 h-4" />
                    <a
                      href={globalExpertDetailsModal.expert.orcidUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-indigo-600 transition-colors"
                    >
                      View ORCID Profile
                    </a>
                  </div>
                )}
                {!globalExpertDetailsModal.expert.email && (
                  <p className="text-xs text-slate-600 italic">
                    Email not publicly available
                  </p>
                )}
              </div>
            </div>

            {/* External Links */}
            {globalExpertDetailsModal.expert.orcidUrl && (
              <div>
                <a
                  href={globalExpertDetailsModal.expert.orcidUrl}
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
      
      {/* Verify Email Modal */}
      <VerifyEmailModal
        isOpen={verifyEmailModalOpen}
        onClose={() => {
          setVerifyEmailModalOpen(false);
          // Clear token from URL if present
          const url = new URL(window.location);
          if (url.searchParams.has("token")) {
            url.searchParams.delete("token");
            window.history.replaceState({}, "", url);
          }
        }}
        onVerified={() => {
          // Refresh user data
          const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
          setUser(updatedUser);
          setVerifyEmailModalOpen(false);
        }}
      />
      <ScrollToTop />
    </div>
  );
}
