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
} from "lucide-react";
import Modal from "../components/ui/Modal";
import { MultiStepLoader } from "../components/ui/multi-step-loader";
import { useProfile } from "../contexts/ProfileContext.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";

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
  const [selectedCategory, setSelectedCategory] = useState("profile"); // "profile", "trials", "publications", "globalExperts", "collaborators", "favorites"
  const [trialFilter, setTrialFilter] = useState(""); // Status filter for trials
  const [publicationSort, setPublicationSort] = useState("relevance"); // Sort option for publications
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [userProfile, setUserProfile] = useState(null);
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
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
      const response = await fetch(`${base}/api/curalink-expert/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const orcidId = data.profile?.orcid || data.profile?.orcidId;
        if (orcidId) {
          const publications = data.profile?.publications || data.profile?.works || [];
          const totalWorks = data.profile.totalWorks || publications.length;
          const hasBiography = !!data.profile.biography;
          const hasAffiliation = !!data.profile.affiliation;
          const hasCurrentPosition = !!data.profile.currentPosition;
          const hasEmployments = data.profile.employments && data.profile.employments.length > 0;
          const hasEducations = data.profile.educations && data.profile.educations.length > 0;
          
          // Check if ORCID profile is invalid - if we have an ORCID ID but no data at all
          // (no publications, no biography, no employment, no education, etc.)
          const hasNoData = !totalWorks && 
                           !hasBiography && 
                           !hasAffiliation && 
                           !hasCurrentPosition && 
                           !hasEmployments && 
                           !hasEducations &&
                           !data.profile.location &&
                           (!data.profile.researchInterests || data.profile.researchInterests.length === 0);
          
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
              } else if (data.profile.location.city || data.profile.location.country) {
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
            const errorMessage = errorData.error || errorData.message || response.statusText || "";
            if (errorMessage.toLowerCase().includes("404") || 
                errorMessage.toLowerCase().includes("not found") || 
                errorMessage.toLowerCase().includes("resource was not found")) {
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
        console.error("Failed to fetch ORCID profile:", response.status, response.statusText);
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
                  fetchOrcidStats(profile.researcher.orcid, userData._id || userData.id);
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

    // Cleanup event listener
    return () => {
      window.removeEventListener("login", handleLoginEvent);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("logout"));
    navigate("/");
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
        body: JSON.stringify({ text }),
      }).then((r) => r.json());

      setSummaryModal((prev) => ({
        ...prev,
        summary: res.summary || "Summary unavailable",
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
    }

    const isFavorited = favorites.some(
      (fav) =>
        fav.type === type &&
        (fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.orcid === checkId ||
          fav.item?.pmid === checkId ||
          (type === "expert" && fav.item?.name === item.name) ||
          (type === "publication" && fav.item?.title === item.title) ||
          (type === "trial" && fav.item?.title === item.title))
    );

    // Optimistic UI update - update immediately
    const previousFavorites = [...favorites];
    let optimisticFavorites;

    if (isFavorited) {
      // Optimistically remove from favorites
      optimisticFavorites = favorites.filter((fav) => {
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
        console.error("Error fetching filtered trials:", response.status, errorData);
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

  // Reset filters when switching categories
  useEffect(() => {
    if (selectedCategory !== "trials") {
      setTrialFilter("");
    }
    if (selectedCategory !== "publications") {
      setPublicationSort("relevance");
    }
  }, [selectedCategory]);

  // Effect to fetch filtered trials when filter changes
  useEffect(() => {
    // Only fetch filtered trials if a filter is explicitly set
    // On initial load, use the recommendations that were already fetched
    if (selectedCategory === "trials" && trialFilter && user?._id) {
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 rounded-2xl shadow-xl border border-indigo-500/50 relative overflow-hidden w-full p-5 sm:p-4 mt-18">
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
      case "trials":
        return data.trials.length;
      case "publications":
        return data.publications.length;
      case "globalExperts":
        return globalExperts.length;
      case "collaborators":
        return data.experts.length;
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
      case "trials":
        return "Trials";
      case "publications":
        return "Publications";
      case "globalExperts":
        return "Global Experts";
      case "collaborators":
        return "Collaborators";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-6 pb-12">
        {/* Top Bar with Profile and Insights */}
        <div className="mb-8">
          {/* Profile Section with Insights */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 rounded-2xl shadow-xl border border-indigo-500/50 relative overflow-hidden w-full p-5 sm:p-4 mt-18">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>

            <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
              {/* Avatar */}
              <div className="w-12 h-12 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-2 ring-white/30 shrink-0">
                {user?.username?.charAt(0)?.toUpperCase() || "R"}
              </div>

              {/* Profile Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                    Hello, {user?.username || "Researcher"} 👋
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-indigo-100">
                    {userProfile?.researcher?.specialties &&
                      userProfile.researcher.specialties.length > 0 && (
                        <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
                          <Briefcase className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            Specialties:{" "}
                            {userProfile.researcher.specialties.join(", ")}
                          </span>
                        </span>
                      )}
                    {userProfile?.researcher?.interests &&
                      userProfile.researcher.interests.length > 0 && (
                        <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
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
                        <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
                          <Beaker className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            {userInterests}
                          </span>
                        </span>
                      )}
                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
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
              {/* Edit Profile Button */}
              <button
                onClick={() => navigate("/profile")}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all border border-white/30 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>

              {/* View All Saved Items Button */}
              <button
                onClick={() => navigate("/favorites")}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all border border-white/30 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">View All Saved Items</span>
              </button>

              {/* Insights Button */}
              <button
                onClick={() => navigate("/insights")}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all border border-white/30 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Insights</span>
                {insights.unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md animate-pulse">
                    {insights.unreadCount > 9 ? "9+" : insights.unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Main Content Section - Full Width */}
        <div className="mb-8">
          {/* Category Buttons Bar */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-2 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                {
                  key: "profile",
                  label: "Your Profile",
                  icon: User,
                  colorClasses: {
                    selected: "bg-indigo-600 text-white border-indigo-600",
                    unselected:
                      "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                    count: "text-indigo-600",
                  },
                },
                {
                  key: "trials",
                  label: "Clinical Trials",
                  icon: Beaker,
                  colorClasses: {
                    selected: "bg-indigo-600 text-white border-indigo-600",
                    unselected:
                      "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                    count: "text-indigo-600",
                  },
                },
                {
                  key: "publications",
                  label: "Publications",
                  icon: FileText,
                  colorClasses: {
                    selected: "bg-blue-600 text-white border-blue-600",
                    unselected:
                      "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                    count: "text-blue-600",
                  },
                },
                {
                  key: "globalExperts",
                  label: "Global Experts",
                  icon: Users,
                  colorClasses: {
                    selected: "bg-purple-600 text-white border-purple-600",
                    unselected:
                      "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                    count: "text-purple-600",
                  },
                },
                {
                  key: "collaborators",
                  label: "Collaborators",
                  icon: Users,
                  colorClasses: {
                    selected: "bg-emerald-600 text-white border-emerald-600",
                    unselected:
                      "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                    count: "text-emerald-600",
                  },
                },
                {
                  key: "favorites",
                  label: "Favourites",
                  icon: Star,
                  colorClasses: {
                    selected: "bg-amber-600 text-white border-amber-600",
                    unselected:
                      "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                    count: "text-amber-600",
                  },
                },
              ].map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.key;
                return (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap ${
                      isSelected
                        ? category.colorClasses.selected
                        : category.colorClasses.unselected
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-semibold">
                      {category.label}
                    </span>
                    {category.key !== "profile" && (
                      <span
                        className={`text-sm font-bold ${
                          isSelected
                            ? "text-white/90"
                            : category.colorClasses.count
                        }`}
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
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all duration-200 whitespace-nowrap"
                >
                  <Filter className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold">
                    {selectedCategory === "trials" ? "Filter" : "Sort"}
                  </span>
                  {(trialFilter || publicationSort !== "relevance") && (
                    <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Main Recommendations Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-6 sm:p-8">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-2">
                    Your Personalized Recommendations
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base">
                    Discover tailored content based on your research profile
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                  <div className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-indigo-700">
                    Viewing:{" "}
                    <span className="text-indigo-900">
                      {getCategoryLabel(selectedCategory)}
                    </span>
                    {selectedCategory === "favorites" && (
                      <span className="text-indigo-600 ml-2">
                        • To see all, go to{" "}
                        <button
                          onClick={() => navigate("/favorites")}
                          className="underline hover:text-indigo-800 font-bold"
                        >
                          Saved Items/Favourites
                        </button>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Grid of Items - Larger Cards - Full Width with 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {selectedCategory === "profile" && (
                <div className="col-span-full">
                  {!userProfile?.researcher?.orcid ? (
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <LinkIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            ORCID ID Not Added
                          </h3>
                          <p className="text-sm text-slate-600 mb-4">
                            Add your ORCID ID to link your research activities and display your publication stats, research interests, and professional information.
                          </p>
                          <button
                            onClick={() => navigate("/profile")}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Add ORCID ID
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">
                                ORCID Profile Connected
                              </h3>
                              <a
                                href={orcidStats?.orcidUrl || `https://orcid.org/${userProfile.researcher.orcid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1"
                              >
                                {userProfile.researcher.orcid}
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            {orcidStats && (
                              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="text-2xl font-bold text-blue-900">
                                    {orcidStats.totalPublications || 0}
                                  </p>
                                  <p className="text-xs text-blue-700">Total works</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {loadingOrcidStats ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                      ) : orcidStats ? (
                        <div className="space-y-6">
                          {/* Biography at the top */}
                          {orcidStats.biography && (
                            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <User className="w-5 h-5 text-slate-600" />
                                <span className="text-sm font-semibold text-slate-900">Biography</span>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {orcidStats.biography}
                              </p>
                            </div>
                          )}

                          {/* Profile Information Section as a list */}
                          <div className="space-y-4">
                            {/* Current Position */}
                            {orcidStats.currentPosition && (
                              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Briefcase className="w-5 h-5 text-slate-600" />
                                  <span className="text-sm font-semibold text-slate-900">Current Position</span>
                                </div>
                                <p className="text-sm text-slate-700">{orcidStats.currentPosition}</p>
                              </div>
                            )}

                            {/* Location */}
                            {orcidStats.location && (
                              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-5 h-5 text-slate-600" />
                                  <span className="text-sm font-semibold text-slate-900">Location</span>
                                </div>
                                <p className="text-sm text-slate-700">{orcidStats.location}</p>
                              </div>
                            )}

                            {/* Research Interests */}
                            {orcidStats.researchInterests && orcidStats.researchInterests.length > 0 && (
                              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <Sparkles className="w-5 h-5 text-slate-600" />
                                  <span className="text-sm font-semibold text-slate-900">Research Interests</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {orcidStats.researchInterests.slice(0, 10).map((interest, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
                                    >
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* External Links */}
                            {orcidStats.externalLinks && Object.keys(orcidStats.externalLinks).length > 1 && (
                              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <LinkIcon className="w-5 h-5 text-slate-600" />
                                  <span className="text-sm font-semibold text-slate-900">External Links</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {orcidStats.externalLinks.googleScholar && (
                                    <a
                                      href={orcidStats.externalLinks.googleScholar}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                      Google Scholar
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                  {orcidStats.externalLinks.researchGate && (
                                    <a
                                      href={orcidStats.externalLinks.researchGate}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
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
                                      className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                      PubMed
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Employment History */}
                            {orcidStats.employments && orcidStats.employments.length > 0 && (
                              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center gap-2 mb-4">
                                  <Briefcase className="w-5 h-5 text-slate-600" />
                                  <span className="text-sm font-semibold text-slate-900">
                                    Employment History
                                  </span>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {orcidStats.employments.map((emp, idx) => (
                                    <div key={idx} className="border-b border-slate-200 last:border-b-0 pb-3 last:pb-0">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <p className="text-sm font-semibold text-slate-900 mb-1">
                                            {emp.roleTitle || "Position"}
                                          </p>
                                          <p className="text-sm text-slate-700 mb-1">
                                            {emp.organization || "Organization"}
                                          </p>
                                          {emp.department && (
                                            <p className="text-xs text-slate-600 mb-1">
                                              {emp.department}
                                            </p>
                                          )}
                                          {(emp.startDate || emp.endDate) && (
                                            <p className="text-xs text-slate-500">
                                              {emp.startDate || "?"} - {emp.endDate || "Present"}
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
                            {orcidStats.recentPublications && orcidStats.recentPublications.length > 0 && (
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
                                            Showing 5 of {orcidStats.totalPublications} publications
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                                  {orcidStats.recentPublications.map((pub, idx) => (
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
                                        {pub.authors && pub.authors.length > 0 && (
                                          <div className="flex items-start gap-2">
                                            <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-slate-600 line-clamp-2">
                                              {pub.authors.slice(0, 4).join(", ")}
                                              {pub.authors.length > 4 && ` +${pub.authors.length - 4} more`}
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
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                              View Publication
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {orcidStats.totalPublications > 5 && (
                                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                                    <a
                                      href={orcidStats.orcidUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors group"
                                    >
                                      <span>View all {orcidStats.totalPublications} publications on ORCID</span>
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
                                We couldn't find your ORCID profile. Please check your ORCID ID or start your research to build your profile.
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
                    <div className="inline-flex items-center justify-center gap-2 text-indigo-600">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">
                        Loading filtered trials...
                      </span>
                    </div>
                  </div>
                ) : data.trials.length > 0 ? (
                  sortByMatchPercentage(data.trials).map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
                    >
                      <div className="p-5">
                        {/* Match Badge Banner */}
                        {t.matchPercentage !== undefined && (
                          <div className="mb-3 -mt-2 -mx-5 px-5 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                                <span className="text-sm font-bold text-indigo-700">
                                  {t.matchPercentage}% Match
                                </span>
                              </div>
                              {t.matchExplanation && (
                                <span className="text-xs text-indigo-600 truncate flex-1 ml-2 max-w-[200px] sm:max-w-none">
                                  {t.matchExplanation}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                            <Beaker className="w-3 h-3 mr-1" />
                            {t._id || t.id || `TRIAL-${idx + 1}`}
                          </span>
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

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-2">
                          {t.title}
                        </h3>

                        {/* Basic Info */}
                        <div className="space-y-1.5 mb-3 text-sm text-slate-700">
                          {t.conditions && (
                            <div className="flex items-center gap-2">
                              <Info className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="line-clamp-1">
                                {Array.isArray(t.conditions)
                                  ? t.conditions.join(", ")
                                  : t.conditions}
                              </span>
                            </div>
                          )}
                          {t.phase && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-3.5 h-3.5" /> Phase{" "}
                              {t.phase}
                            </div>
                          )}
                        </div>

                        {/* Description with Info Button */}
                        {(t.description || t.conditionDescription) && (
                          <div className="mb-3">
                            <button
                              onClick={() => openTrialDetailsModal(t)}
                              className="w-full flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-700 font-medium py-2 px-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <Info className="w-4 h-4" />
                              <span className="flex-1 text-left line-clamp-2">
                                {t.description ||
                                  t.conditionDescription ||
                                  "View details for more information"}
                              </span>
                            </button>
                          </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => generateSummary(t, "trial")}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm"
                          >
                            <Sparkles className="w-4 h-4" /> Summarize
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
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                            }`}
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
                          className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> Contact Moderator
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                      <Beaker className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      No Clinical Trials Found
                    </h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
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
                          className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
                        >
                          <div className="p-5">
                            {/* Match Badge Banner */}
                            {p.matchPercentage !== undefined && (
                              <div className="mb-3 -mt-2 -mx-5 px-5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-bold text-blue-700">
                                      {p.matchPercentage}% Match
                                    </span>
                                  </div>
                                  {p.matchExplanation && (
                                    <span className="text-xs text-blue-600 truncate flex-1 ml-2 max-w-[200px] sm:max-w-none">
                                      {p.matchExplanation}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Publication Header */}
                            <div className="flex items-start justify-between mb-3">
                              <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                <FileText className="w-3 h-3 mr-1" />
                                {p.pmid ? `PMID: ${p.pmid}` : p.id || "PUB-001"}
                              </span>
                              {p.journal && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200">
                                  {p.journal.length > 20
                                    ? `${p.journal.substring(0, 20)}...`
                                    : p.journal}
                                </span>
                              )}
                            </div>

                            {/* Publication Title */}
                            <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-2 leading-tight">
                              {p.title || "Untitled Publication"}
                            </h3>

                            {/* Basic Info - Authors and Published Date */}
                            <div className="space-y-1.5 mb-3">
                              {p.authors &&
                                Array.isArray(p.authors) &&
                                p.authors.length > 0 && (
                                  <div className="flex items-center text-sm text-slate-700">
                                    <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                                    <span className="line-clamp-1">
                                      {p.authors.join(", ")}
                                    </span>
                                  </div>
                                )}
                              {(p.year || p.month) && (
                                <div className="flex items-center text-sm text-slate-600">
                                  <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                                  <span>
                                    {p.month && p.month + " "}
                                    {p.year || ""}
                                  </span>
                                </div>
                              )}
                              {p.journal && (
                                <div className="flex items-center text-sm text-slate-600">
                                  <BookOpen className="w-3.5 h-3.5 mr-2 shrink-0" />
                                  <span className="line-clamp-1">
                                    {p.journal}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Abstract Preview */}
                            {p.abstract && (
                              <div className="mb-3">
                                <button
                                  onClick={() => openPublicationDetailsModal(p)}
                                  className="w-full text-left text-sm text-slate-700 hover:text-indigo-700 font-medium py-2 px-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                  <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span className="line-clamp-2 flex-1">
                                      {p.abstract}
                                    </span>
                                  </div>
                                </button>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  generateSummary(p, "publication")
                                }
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm"
                              >
                                <Sparkles className="w-4 h-4" />
                                Summarize
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
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                }`}
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
                                className="flex items-center justify-center gap-2 py-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors mt-3 w-full"
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

              {selectedCategory === "globalExperts" &&
                (globalExperts.length > 0 ? (
                  sortByMatchPercentage(globalExperts).map((e, idx) => {
                    const expertId = e.name || e.id || e._id || `expert-${idx}`;
                    const itemId = e.orcid || e.id || e._id;
                    const isFavorited = favorites.some(
                      (fav) =>
                        fav.type === "expert" &&
                        (fav.item?.id === itemId ||
                          fav.item?._id === itemId ||
                          fav.item?.orcid === itemId)
                    );

                    return (
                      <div
                        key={expertId}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
                      >
                        <div className="p-5">
                          {/* Match Badge Banner */}
                          {e.matchPercentage !== undefined && (
                            <div className="mb-3 -mt-2 -mx-5 px-5 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-purple-600" />
                                  <span className="text-sm font-bold text-purple-700">
                                    {e.matchPercentage}% Match
                                  </span>
                                </div>
                                {e.matchExplanation && (
                                  <span className="text-xs text-purple-600 truncate flex-1 ml-2 max-w-[200px] sm:max-w-none">
                                    {e.matchExplanation}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-4 mb-4">
                            {/* Avatar */}
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0 ring-2 ring-purple-100">
                              {e.name?.charAt(0)?.toUpperCase() || "E"}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-1.5">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-bold text-slate-900 mb-1 leading-tight">
                                    {e.name || "Unknown Expert"}
                                  </h3>
                                  {e.orcid && (
                                    <span className="text-sm text-slate-500 font-mono">
                                      {e.orcid}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFavorite("expert", itemId, e);
                                  }}
                                  disabled={favoritingItems.has(
                                    getFavoriteKey("expert", itemId, e)
                                  )}
                                  className={`p-1.5 rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isFavorited
                                      ? "bg-red-50 border-red-200 text-red-500 shadow-sm"
                                      : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                                  }`}
                                >
                                  {favoritingItems.has(
                                    getFavoriteKey("expert", itemId, e)
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
                                {!e.currentPosition && e.affiliation && (
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
                                Array.isArray(e.researchInterests) &&
                                e.researchInterests.length > 0 && (
                                  <div className="mb-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      {e.researchInterests
                                        .slice(0, 5)
                                        .map((interest, idx) => (
                                          <span
                                            key={idx}
                                            className="text-xs bg-gradient-to-r from-purple-50 to-slate-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200"
                                          >
                                            {interest}
                                          </span>
                                        ))}
                                      {e.researchInterests.length > 5 && (
                                        <span className="text-xs text-slate-500 px-2 py-0.5">
                                          +{e.researchInterests.length - 5}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            {e.email && (
                              <a
                                href={`mailto:${e.email}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.success("Message sent successfully!");
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-md text-xs font-semibold hover:from-purple-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Contact
                              </a>
                            )}
                            <button
                              onClick={() => {
                                const params = new URLSearchParams();
                                params.set("name", e.name || "");
                                if (e.affiliation)
                                  params.set("affiliation", e.affiliation);
                                if (e.location)
                                  params.set("location", e.location);
                                if (e.orcid) params.set("orcid", e.orcid);
                                if (e.biography)
                                  params.set("biography", e.biography);
                                if (
                                  e.researchInterests &&
                                  Array.isArray(e.researchInterests)
                                ) {
                                  params.set(
                                    "researchInterests",
                                    JSON.stringify(e.researchInterests)
                                  );
                                }
                                params.set("from", "dashboard");
                                navigate(
                                  `/expert/profile?${params.toString()}`
                                );
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-all"
                            >
                              <Info className="w-3.5 h-3.5" />
                              View Profile
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openGlobalExpertDetailsModal(e);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-200 hover:text-blue-700 transition-all"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
                      <Users className="w-10 h-10 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      No Global Experts Found
                    </h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      We're searching for relevant global health experts. Check
                      back soon!
                    </p>
                  </div>
                ))}

              {selectedCategory === "collaborators" &&
                (data.experts.length > 0 ? (
                  sortByMatchPercentage(data.experts).map((e, idx) => {
                    const collaboratorId =
                      e._id || e.userId || e.id || `collaborator-${idx}`;
                    const itemId = e.orcid || e.id || e._id;
                    const isFavorited = favorites.some(
                      (fav) =>
                        fav.type === "collaborator" &&
                        (fav.item?.id === collaboratorId ||
                          fav.item?._id === collaboratorId)
                    );
                    const medicalInterests = [
                      ...(e.specialties || []),
                      ...(e.interests || []),
                    ];
                    const locationText = e.location
                      ? typeof e.location === "string"
                        ? e.location
                        : `${e.location.city || ""}${
                            e.location.city && e.location.country ? ", " : ""
                          }${e.location.country || ""}`.trim()
                      : null;

                    return (
                      <div
                        key={collaboratorId}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
                      >
                        <div className="p-5">
                          {/* Match Badge Banner */}
                          {e.matchPercentage !== undefined && (
                            <div className="mb-3 -mt-2 -mx-5 px-5 py-2 bg-gradient-to-r from-emerald-50 to-indigo-50 border-b border-emerald-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                                  <span className="text-sm font-bold text-emerald-700">
                                    {e.matchPercentage}% Match
                                  </span>
                                </div>
                                {e.matchExplanation && (
                                  <span className="text-xs text-emerald-600 truncate flex-1 ml-2 max-w-[200px] sm:max-w-none">
                                    {e.matchExplanation}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-4 mb-4">
                            {/* Avatar */}
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 via-emerald-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0 ring-2 ring-emerald-100">
                              {e.name?.charAt(0)?.toUpperCase() || "C"}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-1.5">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-bold text-slate-900 mb-1 leading-tight">
                                    {e.name || "Unknown Researcher"}
                                  </h3>
                                  {e.orcid && (
                                    <span className="text-sm text-slate-500 font-mono">
                                      {e.orcid}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFavorite(
                                      "collaborator",
                                      collaboratorId,
                                      e
                                    );
                                  }}
                                  disabled={favoritingItems.has(
                                    getFavoriteKey(
                                      "collaborator",
                                      collaboratorId,
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
                                      "collaborator",
                                      collaboratorId,
                                      e
                                    )
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

                              {/* Basic Info */}
                              <div className="space-y-1 mb-3">
                                {locationText && (
                                  <div className="flex items-center text-sm text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                    <span>{locationText}</span>
                                  </div>
                                )}
                              </div>

                              {/* Medical Interests */}
                              {medicalInterests.length > 0 && (
                                <div className="mb-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {medicalInterests
                                      .slice(0, 5)
                                      .map((interest, idx) => (
                                        <span
                                          key={idx}
                                          className="text-xs bg-gradient-to-r from-emerald-50 to-slate-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200"
                                        >
                                          {interest}
                                        </span>
                                      ))}
                                    {medicalInterests.length > 5 && (
                                      <span className="text-xs text-slate-500 px-2 py-0.5">
                                        +{medicalInterests.length - 5}
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
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            {/* Available/Not Available CTA */}
                            {e.available === true ? (
                              <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-500/10 to-emerald-600/10 border border-emerald-300 rounded-lg">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-xs font-semibold text-emerald-700">
                                  Available for Collaboration
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-xs font-semibold text-slate-600">
                                  Not Available for Collaboration
                                </span>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const collaboratorId =
                                  e._id || e.userId || e.id;
                                if (collaboratorId) {
                                  // Pass name, location, and bio as URL params
                                  const params = new URLSearchParams();
                                  if (e.name) params.set("name", e.name);
                                  // Extract location text
                                  const locationText = e.location
                                    ? typeof e.location === "string"
                                      ? e.location
                                      : `${e.location.city || ""}${
                                          e.location.city && e.location.country
                                            ? ", "
                                            : ""
                                        }${e.location.country || ""}`.trim()
                                    : null;
                                  if (locationText)
                                    params.set("location", locationText);
                                  if (e.bio) params.set("bio", e.bio);
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
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-indigo-700 text-white rounded-md text-xs font-semibold hover:from-emerald-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              View Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4">
                      <Users className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      No Collaborators Found
                    </h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      We're connecting you with relevant researchers. Check back
                      soon!
                    </p>
                  </div>
                ))}

              {selectedCategory === "favorites" &&
                (favorites.length > 0 ? (
                  favorites.map((fav) => {
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
                            {item.title || item.name || "Untitled"}
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
                                } else if (fav.type === "collaborator") {
                                  setCollaboratorModal({
                                    open: true,
                                    collaborator: item,
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
                      collaborators for easy access later.
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
        title="Trial Details"
      >
        {trialDetailsModal.trial && (
          <div className="space-y-6">
            {/* Header */}
            <div className="pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <Beaker className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-lg">
                  {trialDetailsModal.trial.title}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
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
                  <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                    Phase {trialDetailsModal.trial.phase}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {(trialDetailsModal.trial.description ||
              trialDetailsModal.trial.conditionDescription) && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Description
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {trialDetailsModal.trial.description ||
                    trialDetailsModal.trial.conditionDescription}
                </p>
              </div>
            )}

            {/* Location */}
            {trialDetailsModal.trial.location &&
              trialDetailsModal.trial.location !== "Not specified" && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                    <MapPin className="w-5 h-5 text-green-600" />
                    Trial Locations
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {trialDetailsModal.trial.location}
                  </p>
                </div>
              )}

            {/* Conditions */}
            {trialDetailsModal.trial.conditions?.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Conditions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {trialDetailsModal.trial.conditions.map((condition, idx) => (
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
            {trialDetailsModal.trial.eligibility && (
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
                      {trialDetailsModal.trial.eligibility.gender || "All"}
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
                  <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Volunteers
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {trialDetailsModal.trial.eligibility.healthyVolunteers ||
                        "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Detailed Eligibility Criteria */}
                {trialDetailsModal.trial.eligibility.criteria &&
                  trialDetailsModal.trial.eligibility.criteria !==
                    "Not specified" && (
                    <div className="mt-4 pt-4 border-t border-indigo-200">
                      <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                        <Info className="w-4 h-4 text-indigo-600" />
                        Detailed Eligibility Criteria
                      </h5>
                      <div className="bg-white rounded-lg p-4 border border-indigo-100">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {trialDetailsModal.trial.eligibility.criteria}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Contacts */}
            {trialDetailsModal.trial.contacts?.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                  <User className="w-5 h-5 text-indigo-600" />
                  Contact Information
                </h4>
                <div className="space-y-3">
                  {trialDetailsModal.trial.contacts.map((contact, i) => (
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
            {trialDetailsModal.trial.clinicalTrialsGovUrl && (
              <div className="pt-4 border-t border-slate-200">
                <a
                  href={trialDetailsModal.trial.clinicalTrialsGovUrl}
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
              <div className="pb-4 border-b border-slate-200/60">
                <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                  {publicationDetailsModal.publication.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {publicationDetailsModal.publication.pmid && (
                    <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">
                      <FileText className="w-3 h-3 mr-1.5" />
                      PMID: {publicationDetailsModal.publication.pmid}
                    </span>
                  )}
                  {publicationDetailsModal.publication.journal && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200">
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.journal}
                    </span>
                  )}
                </div>
              </div>

              {/* Abstract Section - Moved to Top */}
              {publicationDetailsModal.publication.abstract && (
                <div>
                  <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-xl p-5 border border-indigo-100/50">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-indigo-700">
                      <Info className="w-4 h-4" />
                      Abstract
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
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
                    <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                        <User className="w-4 h-4" />
                        Authors
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {publicationDetailsModal.publication.authors.join(", ")}
                      </p>
                      {publicationDetailsModal.publication.authors.length >
                        1 && (
                        <p className="text-xs text-slate-500 mt-2">
                          {publicationDetailsModal.publication.authors.length}{" "}
                          authors
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
                    {(publicationDetailsModal.publication.year ||
                      publicationDetailsModal.publication.month) && (
                      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Published
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
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
                      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Volume / Issue
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {publicationDetailsModal.publication.volume || "N/A"}
                          {publicationDetailsModal.publication.issue
                            ? ` (Issue ${publicationDetailsModal.publication.issue})`
                            : ""}
                        </p>
                      </div>
                    )}

                    {/* Pages */}
                    {publicationDetailsModal.publication.Pages && (
                      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Pages
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {publicationDetailsModal.publication.Pages}
                        </p>
                      </div>
                    )}

                    {/* Language */}
                    {publicationDetailsModal.publication.language && (
                      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Language
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
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
                    <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                        <TrendingUp className="w-4 h-4" />
                        Keywords
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {publicationDetailsModal.publication.keywords.map(
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
              {publicationDetailsModal.publication.meshTerms &&
                publicationDetailsModal.publication.meshTerms.length > 0 && (
                  <div>
                    <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                        <Info className="w-4 h-4" />
                        MeSH Terms
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {publicationDetailsModal.publication.meshTerms
                          .slice(0, 10)
                          .map((term, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200"
                            >
                              {term}
                            </span>
                          ))}
                        {publicationDetailsModal.publication.meshTerms.length >
                          10 && (
                          <span className="px-3 py-1.5 text-slate-500 text-xs">
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
                    <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                        <MapPin className="w-4 h-4" />
                        Affiliation
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed">
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
                    <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                        <FileText className="w-4 h-4" />
                        Publication Type
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {publicationDetailsModal.publication.publicationTypes.map(
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
            <div className="sticky bottom-0 px-6 py-4 border-t border-slate-200/60 bg-white/95 backdrop-blur-sm shadow-lg">
              <div className="flex flex-wrap gap-3">
                {publicationDetailsModal.publication.url && (
                  <a
                    href={publicationDetailsModal.publication.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
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
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
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
      <Modal isOpen={summaryModal.open} onClose={closeModal} title="AI Summary">
        <div className="space-y-4">
          <div className="pb-4 border-b border-indigo-200">
            <div className="flex items-center gap-3 mb-2">
              {summaryModal.type === "trial" ? (
                <Beaker className="w-5 h-5 text-indigo-600" />
              ) : (
                <FileText className="w-5 h-5 text-blue-600" />
              )}
              <h4 className="font-bold text-indigo-900 text-lg">
                {summaryModal.title}
              </h4>
            </div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                summaryModal.type === "trial"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {summaryModal.type === "trial"
                ? "Clinical Trial"
                : "Research Publication"}
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
                <div className="h-4 bg-indigo-100 rounded w-full mt-2"></div>
                <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
                <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-indigo-800 text-sm leading-relaxed whitespace-pre-wrap">
                {summaryModal.summary}
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
    </div>
  );
}
