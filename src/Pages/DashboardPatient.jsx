import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  FileText,
  Beaker,
  Star,
  MessageCircle,
  User,
  Sparkles,
  Info,
  Calendar,
  ExternalLink,
  BookOpen,
  Heart,
  MapPin,
  Link as LinkIcon,
  Calendar as CalendarIcon,
  MoreVertical,
  UserPlus,
  Check,
  Send,
  Briefcase,
  Building2,
  Mail,
  Filter,
  Plus,
  Edit3,
  MessageSquare,
  TrendingUp,
  Flame,
  Clock,
  AlertCircle,
  Activity,
  ListChecks,
  CheckCircle,
  GraduationCap,
  Award,
  Loader2,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import { MultiStepLoader } from "../components/ui/multi-step-loader";
import { useProfile } from "../contexts/ProfileContext.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { getSimplifiedTitle } from "../utils/titleSimplifier.js";
import ScrollToTop from "../components/ui/ScrollToTop.jsx";

export default function DashboardPatient() {
  const [data, setData] = useState({
    trials: [],
    publications: [],
    experts: [], // Collabiora Experts (from recommendations)
  });
  const [globalExperts, setGlobalExperts] = useState([]); // Global Experts (from external search, loaded on initial page load)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Track if this is the first load (cache miss)
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [trialDetailsModal, setTrialDetailsModal] = useState({
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
  const [messageModal, setMessageModal] = useState({
    open: false,
    expert: null,
    body: "",
  });
  const [followingStatus, setFollowingStatus] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("publications"); // "publications", "trials", "experts", "forums", "favorites"
  const [userProfile, setUserProfile] = useState(null);
  const [forumsCategories, setForumsCategories] = useState([]);
  const [trialFilter, setTrialFilter] = useState("RECRUITING"); // Status filter for trials - default to RECRUITING
  const [publicationSort, setPublicationSort] = useState("relevance"); // Sort option for publications
  const [showCollabioraExperts, setShowCollabioraExperts] = useState(true); // Toggle for Collabiora Experts
  const [showGlobalExperts, setShowGlobalExperts] = useState(false); // Toggle for Global Experts
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [simplifiedTitles, setSimplifiedTitles] = useState(new Map()); // Cache of simplified titles
  const navigate = useNavigate();
  const location = useLocation();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const { updateProfileSignature, markDataFetched, generateProfileSignature } =
    useProfile();

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

    if (userData?._id || userData?.id) {
      // Check if this is the first load in this session
      const firstLoadKey = `dashboard_patient_first_load_${
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
            // Sort all categories by match percentage
            const sortedData = {
              trials: (fetchedData.trials || []).sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }),
              publications: (fetchedData.publications || []).sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }),
              experts: (fetchedData.experts || []).sort((a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }),
            };
            setData(sortedData);
            // Set globalExperts from the recommendations response (cached on backend) and sort
            const sortedGlobalExperts = (fetchedData.globalExperts || []).sort(
              (a, b) => {
                const matchA = a.matchPercentage ?? 0;
                const matchB = b.matchPercentage ?? 0;
                return matchB - matchA;
              }
            );
            setGlobalExperts(sortedGlobalExperts);

            // Simplify publication titles
            if (sortedData.publications && sortedData.publications.length > 0) {
              sortedData.publications.forEach((pub) => {
                if (pub.title && pub.title.length > 60) {
                  // Only simplify if title is long enough
                  getSimplifiedTitle(pub.title, base).then((simplified) => {
                    setSimplifiedTitles((prev) => {
                      const newMap = new Map(prev);
                      newMap.set(pub.title, simplified);
                      return newMap;
                    });
                  });
                }
              });
            }
          }

          // Fetch favorites
          try {
            const favResponse = await fetch(
              `${base}/api/favorites/${userData._id || userData.id}`
            );
            if (favResponse.ok) {
              const favData = await favResponse.json();
              const favItems = favData.items || [];
              setFavorites(favItems);

              // Simplify publication titles in favorites
              favItems.forEach((fav) => {
                if (
                  fav.type === "publication" &&
                  fav.item?.title &&
                  fav.item.title.length > 60
                ) {
                  getSimplifiedTitle(fav.item.title, base).then(
                    (simplified) => {
                      setSimplifiedTitles((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(fav.item.title, simplified);
                        return newMap;
                      });
                    }
                  );
                }
              });
            }
          } catch (error) {
            console.error("Error fetching favorites:", error);
          }

          // Fetch forums categories
          try {
            const forumsResponse = await fetch(`${base}/api/forums/categories`);
            if (forumsResponse.ok) {
              const forumsData = await forumsResponse.json();
              setForumsCategories(forumsData.categories || []);
            }
          } catch (error) {
            console.error("Error fetching forums categories:", error);
          }

          // Fetch user profile for location and conditions
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
      // Still show loading for smooth transition
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }

    // Cleanup event listener
    return () => {
      window.removeEventListener("login", handleLoginEvent);
    };
  }, []);

  async function generateSummary(item, type) {
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
    });

    try {
      const res = await fetch(`${base}/api/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type,
          // Pass full trial object for structured summary
          ...(type === "trial" && { trial: item }),
        }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary:
          res.summary ||
          (type === "publication"
            ? { structured: false, summary: "Summary unavailable" }
            : type === "trial"
            ? { structured: false, summary: "Summary unavailable" }
            : "Summary unavailable"),
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

  function closeModal() {
    setSummaryModal({
      open: false,
      title: "",
      type: "",
      summary: "",
      loading: false,
    });
  }

  function openTrialDetailsModal(trial) {
    setTrialDetailsModal({
      open: true,
      trial: trial,
    });
  }

  function closeTrialDetailsModal() {
    setTrialDetailsModal({
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

    setContactModal((prev) => ({ ...prev, generating: true }));

    try {
      const userName = user?.username || "Patient";
      const userLocation =
        userProfile?.patient?.location ||
        userProfile?.researcher?.location ||
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

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (type, itemId, item) => {
    if (type === "expert") {
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

    // For experts, use name as the primary identifier (consistent with Experts.jsx)
    let checkId = itemId;
    if (type === "expert") {
      checkId =
        item.name || item.orcid || item.id || item._id || item.userId || itemId;
    } else if (type === "publication") {
      checkId = item.pmid || item.id || item._id || itemId;
    } else if (type === "trial") {
      checkId = item.id || item._id || itemId;
    }

    // Check if favorited - for experts, prioritize name matching
    const isFavorited = favorites.some((fav) => {
      if (fav.type !== type) return false;

      // For experts, check by exact name match first (primary identifier)
      if (type === "expert") {
        if (item.name && fav.item?.name) {
          return fav.item.name === item.name;
        }
        // Fallback: check by id
        if (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.orcid === checkId
        ) {
          return true;
        }
        return false;
      }

      // For publications, check by title or id
      if (type === "publication") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.pmid === checkId ||
          (item.title && fav.item?.title === item.title)
        );
      }

      // For trials, check by title or id
      if (type === "trial") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          (item.title && fav.item?.title === item.title)
        );
      }

      return false;
    });

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
        if (fav.type !== type) return true;

        if (type === "expert") {
          if (item.name && fav.item?.name) {
            return fav.item.name !== item.name;
          }
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.orcid === checkId
          );
        } else if (type === "publication") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.pmid === checkId ||
            (item.title && fav.item?.title === item.title)
          );
        } else if (type === "trial") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            (item.title && fav.item?.title === item.title)
          );
        }
        return true;
      });
    } else {
      // Optimistically add to favorites
      const itemToStore = {
        ...item,
        id: checkId,
        _id: item._id || checkId,
      };

      if (type === "expert" && item.name) {
        itemToStore.name = item.name;
      }
      if (type === "expert" && item.orcid) {
        itemToStore.orcid = item.orcid;
      }
      if (type === "publication" && item.pmid) {
        itemToStore.pmid = item.pmid;
      }

      optimisticFavorites = [
        ...favorites,
        {
          type,
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
        let deleteId = checkId;
        if (type === "expert") {
          const foundFavorite = previousFavorites.find((fav) => {
            if (fav.type !== "expert") return false;

            // Check by exact name match (primary identifier)
            if (item.name && fav.item?.name) {
              return fav.item.name === item.name;
            }

            // Fallback: check by id
            if (
              fav.item?.id === checkId ||
              fav.item?._id === checkId ||
              fav.item?.orcid === checkId
            ) {
              return true;
            }

            return false;
          });

          // Use the stored name or id from the favorite, or fallback to checkId
          deleteId =
            foundFavorite?.item?.name ||
            foundFavorite?.item?.id ||
            foundFavorite?.item?._id ||
            item.name ||
            item.id ||
            item._id;
        }

        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }?type=${type}&id=${encodeURIComponent(deleteId)}`,
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

        // For experts, ensure name is stored as the primary identifier
        if (type === "expert") {
          if (item.name) {
            itemToStore.name = item.name;
          }
          // Also store orcid if available (for reference, but not used for matching)
          if (item.orcid) {
            itemToStore.orcid = item.orcid;
          }
        }

        // For publications, store pmid
        if (type === "publication" && item.pmid) {
          itemToStore.pmid = item.pmid;
        }

        await fetch(`${base}/api/favorites/${user._id || user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            item: itemToStore,
          }),
        });
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

  async function checkFollowStatus(expertId) {
    if (!user?._id && !user?.id) return false;
    try {
      const response = await fetch(
        `${base}/api/insights/${user._id || user.id}/following/${expertId}`
      );
      const data = await response.json();
      return data.isFollowing;
    } catch (error) {
      console.error("Error checking follow status:", error);
      return false;
    }
  }

  async function toggleFollow(expertId, expertRole = "researcher") {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow experts");
      return;
    }

    const isFollowing = await checkFollowStatus(expertId);

    try {
      if (isFollowing) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: expertId,
          }),
        });
        toast.success("Unfollowed successfully");
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: expertId,
            followerRole: user.role,
            followingRole: expertRole,
          }),
        });
        toast.success("Connected successfully!");
      }

      setFollowingStatus((prev) => ({
        ...prev,
        [expertId]: !isFollowing,
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
      const expertId =
        messageModal.expert?._id ||
        messageModal.expert?.userId ||
        messageModal.expert?.id;
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user._id || user.id,
          receiverId: expertId,
          senderRole: user.role,
          receiverRole: "researcher",
          body: messageModal.body,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setMessageModal({ open: false, expert: null, body: "" });
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
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
        userProfile?.patient?.conditions?.[0] ||
        "oncology";
      params.set("q", userDisease);
      // Only set status parameter if trialFilter is set (empty string means "all")
      if (trialFilter) {
        params.set("status", trialFilter);
      }

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

  // Note: fetchGlobalExperts removed - globalExperts are now loaded on initial page load
  // from the recommendations endpoint and cached on the backend

  // Reset filters when switching categories
  useEffect(() => {
    if (selectedCategory !== "trials") {
      setTrialFilter("");
    }
    if (selectedCategory !== "publications") {
      setPublicationSort("relevance");
    }
  }, [selectedCategory]);

  // Update filter modal title based on selected category
  const getFilterModalTitle = () => {
    return selectedCategory === "trials"
      ? "Filter Trials"
      : "Sort Publications";
  };

  // Note: Removed lazy loading for globalExperts - they are now loaded on initial page load
  // from the recommendations endpoint, improving load times when switching categories

  // Effect to fetch filtered trials when filter changes
  useEffect(() => {
    // Fetch filtered trials when trials category is selected (defaults to RECRUITING)
    if (selectedCategory === "trials" && trialFilter && user?._id) {
      fetchFilteredTrials();
    }
  }, [trialFilter, selectedCategory, user?._id]);

  // Loading states for multi-step loader (only shown on first load)
  const loadingStates = [
    { text: "Getting personalized trials..." },
    { text: "Getting publications..." },
    { text: "Getting experts..." },
    { text: "Creating personalized dashboard..." },
  ];

  // Skeleton loader for subsequent loads
  function SimpleLoader() {
    return (
      <div
        className="min-h-screen"
        style={{
          background:
            "linear-gradient(135deg, #F5F5F5, rgba(232, 233, 242, 0.3), #F5F5F5)",
        }}
      >
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-6 pb-12">
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
              {/* Decorative background elements skeleton */}
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32"
                style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
              ></div>
              <div
                className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-24 -mb-24"
                style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
              ></div>

              <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
                {/* Avatar Skeleton */}
                <div
                  className="w-12 h-12 rounded-full animate-pulse"
                  style={{ backgroundColor: "#2F3C96" }}
                ></div>
                {/* Profile Info Skeleton */}
                <div className="flex flex-col gap-2 flex-1">
                  <div
                    className="h-5 w-48 rounded animate-pulse"
                    style={{ backgroundColor: "rgba(47, 60, 150, 0.3)" }}
                  ></div>
                  <div className="flex gap-2">
                    <div
                      className="h-6 w-24 rounded-full animate-pulse"
                      style={{ backgroundColor: "rgba(47, 60, 150, 0.2)" }}
                    ></div>
                    <div
                      className="h-6 w-28 rounded-full animate-pulse"
                      style={{ backgroundColor: "rgba(47, 60, 150, 0.2)" }}
                    ></div>
                  </div>
                </div>
              </div>
              {/* Action Buttons Skeleton */}
              <div className="relative z-10 flex items-center gap-3 shrink-0">
                <div
                  className="h-10 w-24 rounded-xl animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.2)" }}
                ></div>
                <div
                  className="h-10 w-32 rounded-xl animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.2)" }}
                ></div>
                <div
                  className="h-10 w-24 rounded-xl animate-pulse"
                  style={{ backgroundColor: "rgba(47, 60, 150, 0.2)" }}
                ></div>
              </div>
            </div>
          </div>

          {/* Category Buttons Skeleton */}
          <div className="mb-6">
            <div
              className="bg-white rounded-xl shadow-md border p-2"
              style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-32 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                ></div>
                <div
                  className="h-10 w-28 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                ></div>
                <div
                  className="h-10 w-36 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                ></div>
                <div
                  className="h-10 w-40 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                ></div>
                <div
                  className="h-10 w-28 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div
            className="bg-white rounded-2xl shadow-xl border p-6 sm:p-8"
            style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
          >
            {/* Title Skeleton */}
            <div className="mb-8">
              <div
                className="h-8 w-64 rounded-lg animate-pulse mb-2"
                style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
              ></div>
              <div
                className="h-4 w-96 rounded-lg animate-pulse"
                style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
              ></div>
            </div>

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <div className="p-5">
                    {/* Match Progress Bar Skeleton */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="h-4 w-20 rounded-full animate-pulse"
                          style={{
                            backgroundColor: "rgba(232, 224, 239, 0.6)",
                          }}
                        ></div>
                        <div
                          className="h-5 w-16 rounded-full animate-pulse"
                          style={{
                            backgroundColor: "rgba(232, 224, 239, 0.6)",
                          }}
                        ></div>
                      </div>
                      {/* Progress Bar Skeleton */}
                      <div
                        className="w-full h-2.5 rounded-full animate-pulse"
                        style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
                      ></div>
                    </div>
                    {/* Title Skeleton */}
                    <div className="mb-4">
                      <div
                        className="h-6 w-full rounded-lg animate-pulse mb-2"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      ></div>
                      <div
                        className="h-6 w-3/4 rounded-lg animate-pulse"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      ></div>
                    </div>
                    {/* Info Skeleton */}
                    <div className="space-y-1.5 mb-4">
                      <div
                        className="h-4 w-full rounded animate-pulse"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      ></div>
                      <div
                        className="h-4 w-2/3 rounded animate-pulse"
                        style={{ backgroundColor: "rgba(232, 224, 239, 0.6)" }}
                      ></div>
                    </div>
                    {/* Description Preview Skeleton */}
                    <div className="mb-4">
                      <div
                        className="h-16 w-full rounded-lg animate-pulse border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
                          borderColor: "rgba(47, 60, 150, 0.2)",
                        }}
                      ></div>
                    </div>
                    {/* Buttons Skeleton */}
                    <div className="flex gap-2">
                      <div
                        className="h-9 flex-1 rounded-lg animate-pulse"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
                        }}
                      ></div>
                      <div
                        className="h-9 w-9 rounded-lg animate-pulse border"
                        style={{
                          backgroundColor: "rgba(232, 224, 239, 0.6)",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      ></div>
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
          duration={1700}
          loop={false}
        />
      );
    } else {
      return <SimpleLoader />;
    }
  }

  const getCategoryCount = (category) => {
    switch (category) {
      case "publications":
        return data.publications.length;
      case "trials":
        return data.trials.length;
      case "experts":
        // Count unique experts by name to avoid duplicates
        const expertNames = new Set();
        [...data.experts, ...globalExperts].forEach((expert) => {
          if (expert.name) {
            expertNames.add(expert.name);
          } else if (expert.id || expert._id || expert.orcid) {
            // Fallback to ID if no name
            expertNames.add(expert.id || expert._id || expert.orcid);
          }
        });
        return expertNames.size - 1;
      case "forums":
        return forumsCategories.filter(
          (category) => (category.threadCount || 0) >= 2
        ).length;
      case "favorites":
        return favorites.length;
      default:
        return 0;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case "publications":
        return "Publications";
      case "trials":
        return "Trials";
      case "experts":
        return "Experts";
      case "forums":
        return "Forums";
      case "favorites":
        return "Favorites";
      default:
        return "";
    }
  };

  // Prioritize userProfile over user object from localStorage for display
  const userDisease =
    userProfile?.patient?.conditions?.[0] ||
    user?.medicalInterests?.[0] ||
    "Not specified";
  const userConditions =
    userProfile?.patient?.conditions || user?.medicalInterests || [];
  const userLocation =
    userProfile?.patient?.location || userProfile?.researcher?.location || null;
  const locationText = userLocation
    ? `${userLocation.city || ""}${
        userLocation.city && userLocation.country ? ", " : ""
      }${userLocation.country || ""}`.trim() || "Not specified"
    : "Not specified";

  return (
    <div className="min-h-scren relative ">
      <AnimatedBackground />
      <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-6 pb-12 relative ">
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
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>

              {/* Profile Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-base sm:text-lg font-bold mb-1"
                    style={{ color: "#2F3C96" }}
                  >
                    Hello, {user?.username || "User"} 👋 — here's your health
                    dashboard
                  </h3>
                  <div
                    className="flex flex-wrap items-center gap-3 text-xs sm:text-sm"
                    style={{ color: "#787878" }}
                  >
                    {userConditions.length > 0 ? (
                      userConditions.map((condition, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: "rgba(47, 60, 150, 0.15)",
                            border: "1px solid rgba(47, 60, 150, 0.3)",
                            color: "#2F3C96",
                          }}
                        >
                          <Heart className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            {condition}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: "rgba(47, 60, 150, 0.15)",
                          border: "1px solid rgba(47, 60, 150, 0.3)",
                          color: "#2F3C96",
                        }}
                      >
                        <Heart className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-none">
                          {userDisease}
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
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex items-center gap-3 shrink-0">
              {/* View All Saved Items Button */}
              <button
                onClick={() => navigate("/favorites")}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105"
                style={{
                  backgroundColor: "#2F3C96",
                  border: "1px solid rgba(47, 60, 150, 0.5)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#253075";
                  e.target.style.borderColor = "rgba(47, 60, 150, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#2F3C96";
                  e.target.style.borderColor = "rgba(47, 60, 150, 0.5)";
                }}
              >
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">View All Saved Items</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Section - Full Width */}
        <div className="mb-8">
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
                  key: "publications",
                  label: "Publications",
                  icon: FileText,
                },
                {
                  key: "trials",
                  label: "Trials",
                  icon: Beaker,
                },
                {
                  key: "experts",
                  label: "Experts",
                  icon: Users,
                },
                {
                  key: "forums",
                  label: "Forums",
                  icon: MessageCircle,
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap"
                    style={
                      isSelected
                        ? {
                            backgroundColor: "#2F3C96",
                            color: "#FFFFFF",
                            borderColor: "#2F3C96",
                          }
                        : {
                            backgroundColor: "rgba(255, 255, 255, 0.6)",
                            color: "#787878",
                            borderColor: "rgba(47, 60, 150, 0.2)",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor =
                          "rgba(255, 255, 255, 0.8)";
                        e.target.style.borderColor = "rgba(47, 60, 150, 0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor =
                          "rgba(255, 255, 255, 0.6)";
                        e.target.style.borderColor = "rgba(47, 60, 150, 0.2)";
                      }
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-semibold">
                      {category.label}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: isSelected
                          ? "rgba(255, 255, 255, 0.9)"
                          : "#2F3C96",
                      }}
                    >
                      ({getCategoryCount(category.key)})
                    </span>
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
                    backgroundColor: "rgba(47, 60, 150, 0.15)",
                    color: "#2F3C96",
                    borderColor: "rgba(47, 60, 150, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "rgba(47, 60, 150, 0.25)";
                    e.target.style.borderColor = "rgba(47, 60, 150, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "rgba(47, 60, 150, 0.15)";
                    e.target.style.borderColor = "rgba(47, 60, 150, 0.3)";
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
            className="rounded-2xl shadow-xl border p-6 sm:p-8"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "rgba(208, 196, 226, 0.3)",
            }}
          >
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3"
                    style={{
                      background: "linear-gradient(135deg, #2F3C96, #253075)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Your Personalized Recommendations
                  </h2>
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-2 rounded-xl border"
                  style={{
                    backgroundColor: "rgba(208, 196, 226, 0.2)",
                    borderColor: "rgba(47, 60, 150, 0.2)",
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
              </div>
            </div>

            {/* Grid of Items - Larger Cards - Full Width with 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {selectedCategory === "trials" &&
                (loadingFiltered ? (
                  <div className="col-span-full text-center py-16">
                    <div
                      className="inline-flex items-center justify-center gap-2"
                      style={{ color: "#2F3C96" }}
                    >
                      <div
                        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{
                          borderColor: "#2F3C96",
                          borderTopColor: "transparent",
                        }}
                      ></div>
                      <span className="text-sm font-medium">
                        Loading filtered trials...
                      </span>
                    </div>
                  </div>
                ) : data.trials.length > 0 ? (
                  sortByMatchPercentage(data.trials).map((t, idx) => (
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

                        {/* Basic Info */}
                        <div className="space-y-1.5 mb-4">
                          {t.conditions && (
                            <div
                              className="flex items-center text-sm"
                              style={{ color: "#787878" }}
                            >
                              <Info className="w-3.5 h-3.5 mr-2 shrink-0" />
                              <span className="line-clamp-1">
                                {Array.isArray(t.conditions)
                                  ? t.conditions.join(", ")
                                  : t.conditions}
                              </span>
                            </div>
                          )}
                          {t.phase && (
                            <div
                              className="flex items-center text-sm"
                              style={{ color: "#787878" }}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />{" "}
                              Phase {t.phase}
                            </div>
                          )}
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

                        {/* Contact Button */}
                        <button
                          onClick={() => openContactModal(t)}
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
                          <Send className="w-3.5 h-3.5" />
                          Contact Moderator
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                      style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
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
                      No Clinical Trials Found
                    </h3>
                    <p
                      className="text-sm max-w-md mx-auto"
                      style={{ color: "#787878" }}
                    >
                      We're working on finding relevant clinical trials for you.
                      Check back soon!
                    </p>
                  </div>
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
                                {simplifiedTitles.get(p.title) ||
                                  p.title ||
                                  "Untitled Publication"}
                              </h3>
                            </div>

                            {/* Journal Name - Below Title */}
                            {}

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

                            {/* Open Paper Action */}
                            {p.url && (
                              <a
                                href={p.url}
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
                    }
                  )
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                      style={{ backgroundColor: "rgba(208, 196, 226, 0.3)" }}
                    >
                      <FileText
                        className="w-10 h-10"
                        style={{ color: "#2F3C96" }}
                      />
                    </div>
                    <h3
                      className="text-lg font-semibold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      No Publications Found
                    </h3>
                    <p
                      className="text-sm max-w-md mx-auto"
                      style={{ color: "#787878" }}
                    >
                      We're curating relevant research publications for you.
                      Check back soon!
                    </p>
                  </div>
                ))}

              {selectedCategory === "experts" && (
                <div className="col-span-full">
                  {/* Experts List - Recommended Experts First, Then Global Experts */}
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
                        {/* Recommended Experts Section */}
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
                                      Recommended Experts
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

                                  // Check if expert is favorited by exact name match (consistent with Experts.jsx)
                                  const isFavorited = favorites.some((fav) => {
                                    if (fav.type !== "expert") return false;

                                    // Check by exact name match (primary identifier)
                                    if (e.name && fav.item?.name) {
                                      return fav.item.name === e.name;
                                    }

                                    // Fallback: check by id
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

                                        {/* Available for Meetings - Moved inside card */}
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
                                                Available for Meetings
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
                                              <h3
                                                className="text-lg font-bold mb-1 leading-tight"
                                                style={{ color: "#2F3C96" }}
                                              >
                                                {e.name || "Unknown Expert"}
                                              </h3>
                                              {e.orcid && (
                                                <span className="text-sm text-slate-500 font-mono">
                                                  {e.orcid}
                                                </span>
                                              )}
                                            </div>

                                            {/* Basic Info */}
                                            <div className="space-y-1.5 mb-3">
                                              {isCuralinkExpert ? (
                                                <>
                                                  {locationText && (
                                                    <div
                                                      className="flex items-center text-sm"
                                                      style={{
                                                        color: "#787878",
                                                      }}
                                                    >
                                                      <MapPin className="w-3.5 h-3.5 mr-2 shrink-0" />
                                                      <span>
                                                        {locationText}
                                                      </span>
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <>
                                                  {e.currentPosition && (
                                                    <div
                                                      className="flex items-start text-sm"
                                                      style={{
                                                        color: "#787878",
                                                      }}
                                                    >
                                                      <Briefcase className="w-3.5 h-3.5 mr-2 shrink-0 mt-0.5" />
                                                      <span className="flex-1 leading-relaxed">
                                                        {e.currentPosition}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {!e.currentPosition &&
                                                    e.affiliation && (
                                                      <div
                                                        className="flex items-start text-sm"
                                                        style={{
                                                          color: "#787878",
                                                        }}
                                                      >
                                                        <Building2 className="w-3.5 h-3.5 mr-2 shrink-0 mt-0.5" />
                                                        <span className="flex-1 leading-relaxed">
                                                          {e.affiliation}
                                                        </span>
                                                      </div>
                                                    )}
                                                  {e.location && (
                                                    <div
                                                      className="flex items-center text-sm"
                                                      style={{
                                                        color: "#787878",
                                                      }}
                                                    >
                                                      <MapPin className="w-3.5 h-3.5 mr-2 shrink-0" />
                                                      <span>{e.location}</span>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </div>

                                            {/* Biography */}
                                            {(e.biography || e.bio) && (
                                              <div className="mb-3">
                                                <p
                                                  className="text-sm leading-relaxed line-clamp-2"
                                                  style={{ color: "#787878" }}
                                                >
                                                  {e.biography || e.bio}
                                                </p>
                                              </div>
                                            )}

                                            {/* Research Interests / Medical Interests */}
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
                                          </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 mt-auto">
                                          {isCuralinkExpert ? (
                                            <>
                                              <button
                                                onClick={() => {
                                                  const expertUserId =
                                                    e._id || e.userId || e.id;
                                                  if (expertUserId) {
                                                    const params =
                                                      new URLSearchParams();
                                                    if (e.name)
                                                      params.set(
                                                        "name",
                                                        e.name
                                                      );
                                                    if (locationText)
                                                      params.set(
                                                        "location",
                                                        locationText
                                                      );
                                                    if (e.bio)
                                                      params.set("bio", e.bio);
                                                    navigate(
                                                      `/curalink-expert/profile/${expertUserId}?${params.toString()}`
                                                    );
                                                  }
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                            </>
                                          ) : (
                                            <>
                                              {e.email && (
                                                <a
                                                  href={`mailto:${e.email}`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.success(
                                                      "Message sent successfully!"
                                                    );
                                                  }}
                                                  className="flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                                    params.set(
                                                      "orcid",
                                                      e.orcid
                                                    );
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
                                                  params.set(
                                                    "from",
                                                    "dashboard"
                                                  );
                                                  navigate(
                                                    `/expert/profile?${params.toString()}`
                                                  );
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                              <button
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openGlobalExpertDetailsModal(
                                                    e
                                                  );
                                                }}
                                                className="p-2 rounded-lg border transition-all"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(208, 196, 226, 0.2)",
                                                  borderColor:
                                                    "rgba(208, 196, 226, 0.3)",
                                                  color: "#787878",
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor =
                                                    "rgba(208, 196, 226, 0.3)";
                                                  e.currentTarget.style.color =
                                                    "#2F3C96";
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor =
                                                    "rgba(208, 196, 226, 0.2)";
                                                  e.currentTarget.style.color =
                                                    "#787878";
                                                }}
                                              >
                                                <Info className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}

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
                                            title={
                                              isFavorited
                                                ? "Remove from favorites"
                                                : "Add to favorites"
                                            }
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
                                                    borderColor:
                                                      "rgba(208, 196, 226, 0.3)",
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
                                                e.currentTarget.style.color =
                                                  "#dc2626";
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isFavorited) {
                                                e.currentTarget.style.backgroundColor =
                                                  "rgba(208, 196, 226, 0.2)";
                                                e.currentTarget.style.color =
                                                  "#787878";
                                              }
                                            }}
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

                                        {/* Available for Meetings - Moved inside card */}
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
                                                Available for Meetings
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
                                              <h3
                                                className="text-lg font-bold mb-1 leading-tight"
                                                style={{ color: "#2F3C96" }}
                                              >
                                                {e.name || "Unknown Expert"}
                                              </h3>
                                              {e.orcid && (
                                                <span className="text-sm text-slate-500 font-mono">
                                                  {e.orcid}
                                                </span>
                                              )}
                                            </div>

                                            {/* Basic Info */}
                                            <div className="space-y-1.5 mb-3">
                                              {isCuralinkExpert ? (
                                                <>
                                                  {locationText && (
                                                    <div
                                                      className="flex items-center text-sm"
                                                      style={{
                                                        color: "#787878",
                                                      }}
                                                    >
                                                      <MapPin className="w-3.5 h-3.5 mr-2 shrink-0" />
                                                      <span>
                                                        {locationText}
                                                      </span>
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <>
                                                  {e.currentPosition && (
                                                    <div
                                                      className="flex items-start text-sm"
                                                      style={{
                                                        color: "#787878",
                                                      }}
                                                    >
                                                      <Briefcase className="w-3.5 h-3.5 mr-2 shrink-0 mt-0.5" />
                                                      <span className="flex-1 leading-relaxed">
                                                        {e.currentPosition}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {!e.currentPosition &&
                                                    e.affiliation && (
                                                      <div
                                                        className="flex items-start text-sm"
                                                        style={{
                                                          color: "#787878",
                                                        }}
                                                      >
                                                        <Building2 className="w-3.5 h-3.5 mr-2 shrink-0 mt-0.5" />
                                                        <span className="flex-1 leading-relaxed">
                                                          {e.affiliation}
                                                        </span>
                                                      </div>
                                                    )}
                                                  {e.location && (
                                                    <div
                                                      className="flex items-center text-sm"
                                                      style={{
                                                        color: "#787878",
                                                      }}
                                                    >
                                                      <MapPin className="w-3.5 h-3.5 mr-2 shrink-0" />
                                                      <span>{e.location}</span>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </div>

                                            {/* Biography */}
                                            {(e.biography || e.bio) && (
                                              <div className="mb-3">
                                                <p
                                                  className="text-sm leading-relaxed line-clamp-2"
                                                  style={{ color: "#787878" }}
                                                >
                                                  {e.biography || e.bio}
                                                </p>
                                              </div>
                                            )}

                                            {/* Research Interests / Medical Interests */}
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
                                          </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 mt-auto">
                                          {isCuralinkExpert ? (
                                            <>
                                              <button
                                                onClick={() => {
                                                  const expertUserId =
                                                    e._id || e.userId || e.id;
                                                  if (expertUserId) {
                                                    const params =
                                                      new URLSearchParams();
                                                    if (e.name)
                                                      params.set(
                                                        "name",
                                                        e.name
                                                      );
                                                    if (locationText)
                                                      params.set(
                                                        "location",
                                                        locationText
                                                      );
                                                    if (e.bio)
                                                      params.set("bio", e.bio);
                                                    navigate(
                                                      `/curalink-expert/profile/${expertUserId}?${params.toString()}`
                                                    );
                                                  }
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                            </>
                                          ) : (
                                            <>
                                              {e.email && (
                                                <a
                                                  href={`mailto:${e.email}`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.success(
                                                      "Message sent successfully!"
                                                    );
                                                  }}
                                                  className="flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                                    params.set(
                                                      "orcid",
                                                      e.orcid
                                                    );
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
                                                  params.set(
                                                    "from",
                                                    "dashboard"
                                                  );
                                                  navigate(
                                                    `/expert/profile?${params.toString()}`
                                                  );
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                                              <button
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openGlobalExpertDetailsModal(
                                                    e
                                                  );
                                                }}
                                                className="p-2 rounded-lg border transition-all"
                                                style={{
                                                  backgroundColor:
                                                    "rgba(208, 196, 226, 0.2)",
                                                  borderColor:
                                                    "rgba(208, 196, 226, 0.3)",
                                                  color: "#787878",
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.backgroundColor =
                                                    "rgba(208, 196, 226, 0.3)";
                                                  e.currentTarget.style.color =
                                                    "#2F3C96";
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.backgroundColor =
                                                    "rgba(208, 196, 226, 0.2)";
                                                  e.currentTarget.style.color =
                                                    "#787878";
                                                }}
                                              >
                                                <Info className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}

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
                                            title={
                                              isFavorited
                                                ? "Remove from favorites"
                                                : "Add to favorites"
                                            }
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
                                                    borderColor:
                                                      "rgba(208, 196, 226, 0.3)",
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
                                                e.currentTarget.style.color =
                                                  "#dc2626";
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isFavorited) {
                                                e.currentTarget.style.backgroundColor =
                                                  "rgba(208, 196, 226, 0.2)";
                                                e.currentTarget.style.color =
                                                  "#787878";
                                              }
                                            }}
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
                            backgroundColor: "rgba(208, 196, 226, 0.3)",
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
                          No Experts Found
                        </h3>
                        <p
                          className="text-sm max-w-md mx-auto"
                          style={{ color: "#787878" }}
                        >
                          We're searching for relevant experts for you. Check
                          back soon!
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedCategory === "forums" && (
                <div className="col-span-full min-h-screen">
                  {(() => {
                    const forumsWithThreads = forumsCategories.filter(
                      (category) => (category.threadCount || 0) >= 2
                    );
                    return forumsWithThreads.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {forumsWithThreads.map((category, idx) => (
                          <div
                            key={category._id || idx}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <MessageCircle className="w-6 h-6 text-emerald-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-900 mb-1">
                                      {category.name || "Unnamed Category"}
                                    </h3>
                                    {category.description && (
                                      <p className="text-sm text-slate-600 line-clamp-2">
                                        {category.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" />
                                    {category.threadCount || 0} threads
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    navigate(`/forums?category=${category._id}`)
                                  }
                                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all"
                                >
                                  View Forum
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="col-span-full text-center py-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4">
                          <MessageCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                          No Forums Available
                        </h3>
                        <p className="text-slate-600 text-sm max-w-md mx-auto">
                          Forums are being set up. Check back soon!
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedCategory === "favorites" &&
                (favorites.length > 0 ? (
                  [...favorites]
                    .sort((a, b) => {
                      const matchA = a.item?.matchPercentage ?? 0;
                      const matchB = b.item?.matchPercentage ?? 0;
                      return matchB - matchA;
                    })
                    .map((fav) => {
                      const item = fav.item;
                      return (
                        <div
                          key={fav._id}
                          className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {fav.type === "trial" && (
                                  <Beaker className="w-5 h-5 text-indigo-600" />
                                )}
                                {fav.type === "publication" && (
                                  <FileText className="w-5 h-5 text-indigo-600" />
                                )}
                                {(fav.type === "expert" ||
                                  fav.type === "collaborator") && (
                                  <User className="w-5 h-5 text-indigo-600" />
                                )}
                                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full capitalize">
                                  {fav.type}
                                </span>
                              </div>
                              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-base line-clamp-2 mb-3">
                              {fav.type === "publication" && item.title
                                ? simplifiedTitles.get(item.title) || item.title
                                : item.title || item.name || "Untitled"}
                            </h4>
                            {item.journal && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span className="line-clamp-1">
                                  {item.journal}
                                </span>
                              </div>
                            )}
                            {item.conditions && (
                              <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                                <Info className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="line-clamp-1">
                                  {Array.isArray(item.conditions)
                                    ? item.conditions.join(", ")
                                    : item.conditions}
                                </span>
                              </div>
                            )}
                            {item.authors &&
                              Array.isArray(item.authors) &&
                              item.authors.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                                  <User className="w-3.5 h-3.5" />
                                  <span className="line-clamp-1">
                                    {item.authors.slice(0, 2).join(", ")}
                                    {item.authors.length > 2 && " et al."}
                                  </span>
                                </div>
                              )}
                            <div className="pt-3 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  if (fav.type === "trial") {
                                    openTrialDetailsModal(item);
                                  } else if (fav.type === "publication") {
                                    openPublicationDetailsModal(item);
                                  } else if (fav.type === "expert") {
                                    setExpertModal({
                                      open: true,
                                      expert: item,
                                    });
                                  }
                                }}
                                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                      <Star className="w-10 h-10 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      No Favorites Yet
                    </h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      Start saving your favorite trials, publications, and
                      experts for easy access later.
                    </p>
                  </div>
                ))}
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
        {trialDetailsModal.trial && (
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
                {trialDetailsModal.trial.location &&
                  trialDetailsModal.trial.location !== "Not specified" && (
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
                  )}
              </div>
            </div>

            {/* Sticky Footer with ClinicalTrials.gov Link */}
            {trialDetailsModal.trial.clinicalTrialsGovUrl && (
              <div
                className=" -bottom-10 px-6 pb-6 pt-4 border-t bg-white/95 backdrop-blur-sm shadow-lg  "
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <a
                  href={trialDetailsModal.trial.clinicalTrialsGovUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 text-white rounded-lg transition-colors text-sm font-semibold shadow-md hover:shadow-lg w-full"
                  style={{ backgroundColor: "#2F3C96" }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#253075")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#2F3C96")
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Details on ClinicalTrials.gov
                </a>
              </div>
            )}
          </div>
        )}
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
              className=" bottom-0 px-6 py-4 border-t bg-white/95 backdrop-blur-sm shadow-lg"
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
            <div className="flex items-center gap-3 mb-2">
              {summaryModal.type === "trial" ? (
                <Beaker className="w-5 h-5" style={{ color: "#2F3C96" }} />
              ) : (
                <FileText className="w-5 h-5" style={{ color: "#2F3C96" }} />
              )}
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
                      {expertModal.expert.location.city || ""}
                      {expertModal.expert.location.city &&
                        expertModal.expert.location.country &&
                        ", "}
                      {expertModal.expert.location.country || ""}
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
              ];
              return interests.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-indigo-700 mb-2">
                    Medical Interests
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
            {expertModal.expert.bio && (
              <div>
                <h4 className="font-semibold text-indigo-700 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                  {expertModal.expert.bio}
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
                  setMessageModal({
                    open: true,
                    expert: expertModal.expert,
                    body: "",
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Message Modal */}
      <Modal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ open: false, expert: null, body: "" })}
        title={`Message ${messageModal.expert?.name || "Expert"}`}
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
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
                      !trialFilter || trialFilter === ""
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <ScrollToTop />
    </div>
  );
}
