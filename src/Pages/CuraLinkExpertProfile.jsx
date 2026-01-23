import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Link as LinkIcon,
  Award,
  Briefcase,
  Calendar,
  BookOpen,
  Loader2,
  ArrowLeft,
  Star,
  FileText,
  Beaker,
  TrendingUp,
  Users,
  MessageCircle,
  UserPlus,
  Check,
  Send,
  Sparkles,
  Globe,
  Database,
  Activity,
  Clock,
  MessageSquare,
  Eye,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

export default function CollabioraExpertProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Get URL search params for name, location, and bio
  const searchParams = new URLSearchParams(window.location.search);
  const urlName = searchParams.get("name");
  const urlLocation = searchParams.get("location");
  const urlBio = searchParams.get("bio");

  // Helper function to strip HTML tags from text
  const stripHtmlTags = (html) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
  const [followingStatus, setFollowingStatus] = useState(false);
  // Meeting request status for patients
  const [meetingRequestStatus, setMeetingRequestStatus] = useState({
    hasRequest: false,
    status: null,
  });
  // Connection request status for researchers
  const [connectionRequestStatus, setConnectionRequestStatus] = useState({
    hasRequest: false,
    isConnected: false,
    status: null,
    isRequester: false,
  });
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [publicationDetailsModal, setPublicationDetailsModal] = useState({
    open: false,
    publication: null,
  });
  const [trialDetailsModal, setTrialDetailsModal] = useState({
    open: false,
    trial: null,
  });
  const [meetingRequestModal, setMeetingRequestModal] = useState({
    open: false,
    message: "",
    preferredDate: "",
    preferredTime: "",
  });
  const [connectionRequestModal, setConnectionRequestModal] = useState({
    open: false,
    message: "",
  });
  const [messageModal, setMessageModal] = useState({
    open: false,
    body: "",
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (!userId) {
      toast.error("Expert ID not provided");
      navigate("/dashboard/patient");
      return;
    }

    // Fetch profile, favorites, follow status, and message request status
    const fetchData = async () => {
      setLoading(true);
      try {
        const currentUserId = userData?._id || userData?.id;

        // Build query params including name, location, and bio from URL
        const params = new URLSearchParams();
        if (currentUserId) params.set("currentUserId", currentUserId);
        if (urlName) params.set("name", urlName);
        if (urlLocation) params.set("location", urlLocation);
        if (urlBio) params.set("bio", urlBio);

        const response = await fetch(
          `${base}/api/curalink-expert/profile/${userId}?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setProfile(data.profile);

        // Fetch follow status
        if (currentUserId && data.profile.userId !== currentUserId) {
          try {
            const followResponse = await fetch(
              `${base}/api/insights/${currentUserId}/following/${userId}`
            );
            if (followResponse.ok) {
              const followData = await followResponse.json();
              setFollowingStatus(followData.isFollowing || false);
            }
          } catch (error) {
            console.error("Error fetching follow status:", error);
          }

          // Fetch meeting request status (only for patients)
          if (userData.role === "patient") {
            try {
              const requestStatusResponse = await fetch(
                `${base}/api/meeting-requests/${currentUserId}/${userId}/status`
              );
              if (requestStatusResponse.ok) {
                const requestData = await requestStatusResponse.json();
                setMeetingRequestStatus({
                  hasRequest: requestData.hasRequest || false,
                  status: requestData.status || null,
                });
              }
            } catch (error) {
              console.error("Error fetching meeting request status:", error);
            }
          }

          // Fetch connection request status (only for researchers viewing other researchers)
          if (userData.role === "researcher") {
            try {
              const connectionStatusResponse = await fetch(
                `${base}/api/connection-requests/${currentUserId}/${userId}/status`
              );
              if (connectionStatusResponse.ok) {
                const connectionData = await connectionStatusResponse.json();
                setConnectionRequestStatus({
                  hasRequest: connectionData.hasRequest || false,
                  isConnected: connectionData.isConnected || false,
                  status: connectionData.status || null,
                  isRequester: connectionData.isRequester || false,
                });
              }
            } catch (error) {
              console.error("Error fetching connection request status:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load expert profile");
      } finally {
        setLoading(false);
      }

      // Fetch favorites
      if (userData?._id || userData?.id) {
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
      }
    };

    fetchData();
  }, [userId, navigate, base]);

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item, type) => {
    if (type === "expert" || type === "collaborator") {
      return `expert-${item.name || item.id || item._id}`;
    } else if (type === "publication") {
      return `publication-${item.pmid || item.id || item._id}`;
    } else if (type === "trial") {
      return `trial-${item.id || item._id}`;
    }
    return `${type}-${item.id || item._id}`;
  };

  async function toggleFavorite(type, itemId, item) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    let checkId = itemId;
    if (type === "expert" || type === "collaborator") {
      checkId =
        item.name || item.orcid || item.id || item._id || item.userId || itemId;
    } else if (type === "publication") {
      checkId = item.pmid || item.id || item._id || itemId;
    } else if (type === "trial") {
      checkId = item.id || item._id || itemId;
    }

    const favoriteKey = getFavoriteKey(item, type);

    // Prevent duplicate clicks
    if (favoritingItems.has(favoriteKey)) {
      return;
    }

    const isFavorited = favorites.some((fav) => {
      if (fav.type !== type) return false;

      if (type === "expert" || type === "collaborator") {
        if (item.name && fav.item?.name) {
          return fav.item.name === item.name;
        }
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.orcid === checkId
        );
      }

      if (type === "publication") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          fav.item?.pmid === checkId ||
          (item.title && fav.item?.title === item.title)
        );
      }

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

        if (type === "expert" || type === "collaborator") {
          if (item.name && fav.item?.name) {
            return fav.item.name !== item.name;
          }
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.orcid === checkId
          );
        }

        if (type === "publication") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            fav.item?.pmid === checkId ||
            (item.title && fav.item?.title === item.title)
          );
        }

        if (type === "trial") {
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

  async function toggleFollow() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow experts");
      return;
    }

    try {
      if (followingStatus) {
        await fetch(`${base}/api/follow`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: userId,
          }),
        });
        toast.success("Unfollowed successfully");
        setFollowingStatus(false);
      } else {
        await fetch(`${base}/api/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerId: user._id || user.id,
            followingId: userId,
            followerRole: user.role,
            followingRole: "researcher",
          }),
        });
        toast.success("Following successfully!");
        setFollowingStatus(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  }

  async function sendMeetingRequest() {
    if (!meetingRequestModal.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!user?._id && !user?.id) {
      toast.error("Please sign in to send meeting requests");
      return;
    }

    if (user.role !== "patient") {
      toast.error("Only patients can send meeting requests to experts");
      return;
    }

    try {
      const response = await fetch(`${base}/api/meeting-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: user._id || user.id,
          expertId: userId,
          message: meetingRequestModal.message,
          preferredDate: meetingRequestModal.preferredDate || null,
          preferredTime: meetingRequestModal.preferredTime || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send meeting request");
      }

      toast.success("Meeting request sent successfully!");
      setMeetingRequestModal({
        open: false,
        message: "",
        preferredDate: "",
        preferredTime: "",
      });
      setMeetingRequestStatus({
        hasRequest: true,
        status: "pending",
      });
    } catch (error) {
      console.error("Error sending meeting request:", error);
      toast.error(error.message || "Failed to send meeting request");
    }
  }

  async function sendConnectionRequest() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to send connection requests");
      return;
    }

    if (user.role !== "researcher") {
      toast.error("Only researchers can send connection requests");
      return;
    }

    try {
      const response = await fetch(`${base}/api/connection-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: user._id || user.id,
          receiverId: userId,
          message: connectionRequestModal.message || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send connection request");
      }

      toast.success("Connection request sent successfully!");
      setConnectionRequestModal({ open: false, message: "" });
      setConnectionRequestStatus({
        hasRequest: true,
        isConnected: false,
        status: "pending",
        isRequester: true,
      });
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error(error.message || "Failed to send connection request");
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

    // Only researchers can send messages to connected researchers
    if (user.role !== "researcher" || !connectionRequestStatus.isConnected) {
      toast.error(
        "You must be connected with this researcher to send messages"
      );
      return;
    }

    try {
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user._id || user.id,
          receiverId: userId,
          senderRole: user.role,
          receiverRole: "researcher",
          body: messageModal.body,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setMessageModal({ open: false, body: "" });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }

  async function generateSummary(item, type) {
    let text = "";
    let title = "";
    if (type === "trial") {
      title = stripHtmlTags(item.title) || "Clinical Trial";
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
      title = stripHtmlTags(item.title) || "Publication";
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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-indigo-700 font-medium">
              Loading expert profile...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-700 mb-4">Expert profile not found</p>
            <button
              onClick={() => {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                const role = user?.role || "patient";
                navigate(`/dashboard/${role}`);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors z-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isExpertFavorited = favorites.some((fav) => {
    if (fav.type !== "expert" && fav.type !== "collaborator") return false;
    if (profile.name && fav.item?.name) {
      return fav.item.name === profile.name;
    }
    const expertId =
      profile.name || profile.id || profile._id || profile.userId;
    return fav.item?.id === expertId || fav.item?._id === expertId;
  });

  const locationText = profile.location
    ? typeof profile.location === "string"
      ? profile.location
      : `${profile.location?.city || ""}${
          profile.location?.city && profile.location?.country ? ", " : ""
        }${profile.location?.country || ""}`.trim()
    : null;

  const isCurrentUser = (user?._id || user?.id) === profile.userId;
  const canSendMeetingRequest = user?.role === "patient" && !isCurrentUser;
  const canSendConnectionRequest =
    user?.role === "researcher" && !isCurrentUser;
  const canSendMessage =
    user?.role === "researcher" &&
    !isCurrentUser &&
    connectionRequestStatus.isConnected;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-100  overflow-hidden relative  ">
        <AnimatedBackground />
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-17 pb-12 mt-5 relative  ">
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const user = JSON.parse(localStorage.getItem("user") || "{}");
              const role = user?.role || "patient";
              navigate(`/dashboard/${role}`);
            }}
            className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors relative z-50 cursor-pointer"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Header Section */}
          <div className="bg-gradient-to-br from-indigo-600 via-white-700 to-indigo-700 rounded-xl shadow-xl border border-blue-500/50 relative overflow-hidden p-4 sm:p-5 mb-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full -ml-20 -mb-20"></div>

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-2 ring-white/30 shrink-0">
                  {profile.name?.charAt(0)?.toUpperCase() || "E"}
                </div>

                {/* Basic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                        {profile.name}
                      </h1>
                    </div>

                    {/* Status Labels */}
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/30">
                        On Collabiora? → Yes
                      </span>
                      <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/30">
                        Contactable? → {profile.contactable ? "Yes" : "No"}
                      </span>
                      {profile.available === true ? (
                        <span className="px-2 py-0.5 bg-emerald-500/30 text-white text-xs font-semibold rounded-full border border-emerald-400/50 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Open for Meetings
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-400/30 text-white text-xs font-semibold rounded-full border border-slate-500/50 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Not Available for Collaboration
                        </span>
                      )}
                      {profile.orcid && (
                        <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/30">
                          ORCID Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Location & ORCID */}
                  <div className="flex flex-wrap items-center gap-3 text-emerald-100 text-sm mb-2">
                    {locationText && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{locationText}</span>
                      </div>
                    )}
                    {profile.orcid && (
                      <div className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <a
                          href={`https://orcid.org/${profile.orcid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline font-mono"
                        >
                          {profile.orcid}
                        </a>
                      </div>
                    )}
                    {profile.affiliation && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{profile.affiliation}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!isCurrentUser && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Follow Button */}
                      <button
                        onClick={toggleFollow}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-1.5 ${
                          followingStatus
                            ? "bg-white/30 border-white/40 text-white"
                            : "bg-white/20 hover:bg-white/30 text-white border-white/30"
                        }`}
                      >
                        {followingStatus ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Follow
                          </>
                        )}
                      </button>

                      {/* Favorite Button */}
                      <button
                        onClick={() => {
                          const expertId =
                            profile.name ||
                            profile.id ||
                            profile._id ||
                            profile.userId;
                          toggleFavorite("expert", expertId, {
                            ...profile,
                            name: profile.name,
                            id: profile.id || expertId,
                          });
                        }}
                        disabled={favoritingItems.has(
                          getFavoriteKey(profile, "expert")
                        )}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isExpertFavorited
                            ? "bg-red-500/30 border-red-300/50 text-white"
                            : "bg-white/20 hover:bg-white/30 text-white border-white/30"
                        }`}
                        title={
                          isExpertFavorited
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        {favoritingItems.has(
                          getFavoriteKey(profile, "expert")
                        ) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isExpertFavorited ? "fill-current" : ""
                            }`}
                          />
                        )}
                        {isExpertFavorited ? "Favorited" : "Save to Favorites"}
                      </button>

                      {/* Meeting Request Button (for patients only) */}
                      {canSendMeetingRequest && (
                        <>
                          {meetingRequestStatus.status === "pending" ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-xs font-semibold border border-white/20 shadow-md flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Meeting Request Pending
                            </button>
                          ) : meetingRequestStatus.status === "rejected" ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-red-500/20 text-white/70 rounded-lg text-xs font-semibold border border-red-300/30 shadow-md flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Meeting Request Rejected
                            </button>
                          ) : meetingRequestStatus.status === "accepted" ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-emerald-500/20 text-white/70 rounded-lg text-xs font-semibold border border-emerald-300/30 shadow-md flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Meeting Request Accepted
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setMeetingRequestModal({
                                  open: true,
                                  message: "",
                                  preferredDate: "",
                                  preferredTime: "",
                                })
                              }
                              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all border border-white/30 shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-1.5"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Request Meeting
                            </button>
                          )}
                        </>
                      )}

                      {/* Connection Request or Message Button (for researchers only) */}
                      {canSendConnectionRequest && (
                        <>
                          {connectionRequestStatus.isConnected ? (
                            <button
                              onClick={() =>
                                setMessageModal({ open: true, body: "" })
                              }
                              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all border border-white/30 shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Message
                            </button>
                          ) : connectionRequestStatus.status === "pending" ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-xs font-semibold border border-white/20 shadow-md flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {connectionRequestStatus.isRequester
                                ? "Connection Request Sent"
                                : "Connection Request Pending"}
                            </button>
                          ) : connectionRequestStatus.status === "rejected" ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-red-500/20 text-white/70 rounded-lg text-xs font-semibold border border-red-300/30 shadow-md flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Connection Rejected
                            </button>
                          ) : profile.available !== true ? (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-white/5 text-white/40 rounded-lg text-xs font-semibold border border-white/10 shadow-md flex items-center gap-1.5 cursor-not-allowed opacity-50"
                              title="This researcher is not available for collaboration"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Connect
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setConnectionRequestModal({
                                  open: true,
                                  message: "",
                                })
                              }
                              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all border border-white/30 shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-1.5"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Connect
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Research Interests / Specialties */}
                  {((profile.specialties && profile.specialties.length > 0) ||
                    (profile.interests && profile.interests.length > 0) ||
                    (profile.researchInterests &&
                      profile.researchInterests.length > 0)) && (
                    <div>
                      <h3 className="text-xs font-semibold text-emerald-100 mb-1.5 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Research Interests
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          ...(profile.researchInterests || []),
                          ...(profile.specialties || []),
                          ...(profile.interests || []),
                        ]
                          .slice(0, 10)
                          .map((interest, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-white/20 text-white rounded text-xs font-medium border border-white/30"
                            >
                              {interest}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ORCID Error Message (if ORCID fetch failed) */}
          {profile.orcidFetchError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">
                    ORCID Profile Unavailable
                  </h4>
                  <p className="text-sm text-yellow-700">
                    {profile.orcidMessage ||
                      "Could not fetch ORCID profile. Showing basic information from Collabiora profile."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary / About Section */}
          {(profile.bioSummary || profile.bio || profile.biography) && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                About
              </h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {profile.bioSummary || profile.bio || profile.biography}
              </p>
            </div>
          )}

          {/* Professional Information from ORCID */}
          {(profile.currentPosition ||
            profile.education ||
            profile.yearsOfExperience ||
            profile.achievements ||
            profile.age) && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                Professional Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.currentPosition && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Current Position
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {profile.currentPosition}
                    </p>
                  </div>
                )}
                {profile.education && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Education
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {profile.education}
                    </p>
                  </div>
                )}
                {profile.yearsOfExperience && (
                  <div className="bg-gradient-to-br from-emerald-50 to-indigo-50 rounded-lg p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Years of Experience
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {profile.yearsOfExperience} years
                    </p>
                  </div>
                )}
                {profile.age && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Age
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {profile.age}
                    </p>
                  </div>
                )}
              </div>
              {profile.achievements && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Achievements
                    </span>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {profile.achievements}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Impact Metrics (if available from ORCID) */}
          {profile.impactMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {profile.impactMetrics.totalCitations !== undefined && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-center">
                  <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
                  <div className="text-xl font-bold text-slate-900">
                    {profile.impactMetrics.totalCitations || 0}
                  </div>
                  <div className="text-xs text-slate-600">Total Citations</div>
                </div>
              )}
              {profile.impactMetrics.maxCitations !== undefined && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-center">
                  <Star className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                  <div className="text-xl font-bold text-slate-900">
                    {profile.impactMetrics.maxCitations || 0}
                  </div>
                  <div className="text-xs text-slate-600">Max Citations</div>
                </div>
              )}
              {profile.impactMetrics.totalPublications !== undefined && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-center">
                  <FileText className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                  <div className="text-xl font-bold text-slate-900">
                    {profile.impactMetrics.totalPublications || 0}
                  </div>
                  <div className="text-xs text-slate-600">Publications</div>
                </div>
              )}
              {profile.impactMetrics.hIndex !== undefined && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-center">
                  <Award className="w-6 h-6 text-purple-600 mx-auto mb-1.5" />
                  <div className="text-xl font-bold text-slate-900">
                    {profile.impactMetrics.hIndex || 0}
                  </div>
                  <div className="text-xs text-slate-600">H-Index</div>
                </div>
              )}
            </div>
          )}

          {/* Top Publications (if available from ORCID) */}
          {profile.publications && profile.publications.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Top Publications
                </h2>
                <span className="text-xs text-slate-600">
                  {profile.publications.length > 0
                    ? `${profile.publications.length} ${
                        profile.publications.length === 1
                          ? "publication"
                          : "publications"
                      }`
                    : "No publications found"}
                </span>
              </div>
              <div className="space-y-3">
                {profile.publications.slice(0, 10).map((pub, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-lg transition-all bg-white"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm mb-2 leading-snug line-clamp-2">
                          {stripHtmlTags(pub.title) || "Untitled Publication"}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {pub.pmid && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-medium rounded">
                              PMID: {pub.pmid}
                            </span>
                          )}
                          {pub.doi && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded">
                              DOI:{" "}
                              {pub.doi.length > 30
                                ? `${pub.doi.substring(0, 30)}...`
                                : pub.doi}
                            </span>
                          )}
                          {!pub.pmid && !pub.doi && pub.id && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-medium rounded">
                              ID: {pub.id}
                            </span>
                          )}
                          {pub.journal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-50 text-slate-700 border-slate-200">
                              {pub.journal.length > 25
                                ? `${pub.journal.substring(0, 25)}...`
                                : pub.journal}
                            </span>
                          )}
                          {pub.type && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                              {pub.type}
                            </span>
                          )}
                          {(pub.year || pub.month) && (
                            <span className="text-xs text-slate-600">
                              {pub.month && `${pub.month} `}
                              {pub.year || ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 mb-2">
                      {pub.authors &&
                        Array.isArray(pub.authors) &&
                        pub.authors.length > 0 && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="line-clamp-1">
                              {pub.authors
                                .slice(0, 3)
                                .map((a) =>
                                  typeof a === "string" ? a : a.name || a
                                )
                                .join(", ")}
                              {pub.authors.length > 3 && " et al."}
                            </span>
                          </div>
                        )}
                      {pub.link && (
                        <a
                          href={pub.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Paper
                        </a>
                      )}
                    </div>

                    {(pub.abstract || pub.snippet) && (
                      <div className="mb-3">
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                          <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                            {pub.abstract || pub.snippet}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100">
                      <button
                        onClick={() => generateSummary(pub, "publication")}
                        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Summary
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forums Created by Expert */}
          {profile.forums && profile.forums.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Forums Created ({profile.totalForums || profile.forums.length})
              </h2>
              <div className="space-y-4">
                {profile.forums.map((forum) => (
                  <div
                    key={forum._id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/forums?thread=${forum._id}`)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                          {forum.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                          <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                            {forum.categoryName || "Uncategorized"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(forum.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {forum.replyCount || 0}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Eye className="w-3.5 h-3.5" />
                          {forum.viewCount || 0}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <ArrowUp className="w-3.5 h-3.5" />
                          {forum.voteScore || 0}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                      {forum.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contributions - Forums Participated In by Expert */}
          {profile.participatedForums && profile.participatedForums.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                Contributions ({profile.totalParticipatedForums || profile.participatedForums.length})
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Forums where {profile.name} has contributed by replying to discussions
              </p>
              <div className="space-y-4">
                {profile.participatedForums.map((forum) => (
                  <div
                    key={forum._id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-gradient-to-r from-indigo-50/50 to-white"
                    onClick={() => navigate(`/forums?thread=${forum._id}`)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-2">
                            {forum.title}
                          </h3>
                          {forum.expertReplyCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200 shrink-0">
                              {forum.expertReplyCount} {forum.expertReplyCount === 1 ? "reply" : "replies"}
                            </span>
                          )}
                          {forum.isCreator && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 shrink-0">
                              Creator
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                          <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            {forum.categoryName || "Uncategorized"}
                          </span>
                          {!forum.isCreator && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>by {forum.authorUsername}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(forum.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {forum.replyCount || 0}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Eye className="w-3.5 h-3.5" />
                          {forum.viewCount || 0}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <ArrowUp className="w-3.5 h-3.5" />
                          {forum.voteScore || 0}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                      {forum.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated Clinical Trials (if available) */}
          {profile.associatedTrials && profile.associatedTrials.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-indigo-600" />
                Associated Clinical Trials
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {profile.associatedTrials.map((trial, idx) => {
                  const isFavorited = favorites.some(
                    (fav) =>
                      fav.type === "trial" &&
                      (fav.item?.id === trial.id || fav.item?._id === trial._id)
                  );
                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 flex-1 line-clamp-2">
                          {trial.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(
                              "trial",
                              trial.id || trial._id,
                              trial
                            );
                          }}
                          disabled={favoritingItems.has(
                            getFavoriteKey(trial, "trial")
                          )}
                          className={`p-1.5 rounded-md border transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isFavorited
                              ? "bg-red-50 border-red-200 text-red-500"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                          }`}
                        >
                          {favoritingItems.has(
                            getFavoriteKey(trial, "trial")
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
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {trial.status && (
                          <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-200">
                            {trial.status.replace(/_/g, " ")}
                          </span>
                        )}
                        {trial.phase && (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                            Phase {trial.phase}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setTrialDetailsModal({ open: true, trial });
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* External Links (if available from ORCID) */}
          {profile.externalLinks &&
            Object.keys(profile.externalLinks).length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  External Links
                </h2>
                <div className="flex flex-wrap gap-3">
                  {profile.externalLinks.googleScholar && (
                    <a
                      href={profile.externalLinks.googleScholar}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-200 hover:shadow-md"
                    >
                      <Database className="w-4 h-4" />
                      Google Scholar
                    </a>
                  )}
                  {profile.externalLinks.pubmed && (
                    <a
                      href={profile.externalLinks.pubmed}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-200 hover:shadow-md"
                    >
                      <BookOpen className="w-4 h-4" />
                      PubMed
                    </a>
                  )}
                  {profile.externalLinks.researchGate && (
                    <a
                      href={profile.externalLinks.researchGate}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-200 hover:shadow-md"
                    >
                      <Users className="w-4 h-4" />
                      ResearchGate
                    </a>
                  )}
                  {profile.externalLinks.orcid && (
                    <a
                      href={profile.externalLinks.orcid}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-200 hover:shadow-md"
                    >
                      <LinkIcon className="w-4 h-4" />
                      ORCID
                    </a>
                  )}
                  {profile.externalLinks.institutional && (
                    <a
                      href={profile.externalLinks.institutional}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2 border border-slate-200 hover:shadow-md"
                    >
                      <Building2 className="w-4 h-4" />
                      Institutional Page
                    </a>
                  )}
                  {profile.externalLinks.linkedIn && (
                    <a
                      href={profile.externalLinks.linkedIn}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-200 hover:shadow-md"
                    >
                      <Users className="w-4 h-4" />
                      LinkedIn
                    </a>
                  )}
                  {profile.externalLinks.twitter && (
                    <a
                      href={profile.externalLinks.twitter}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-sky-50 text-sky-700 rounded-lg text-sm font-semibold hover:bg-sky-100 transition-colors flex items-center gap-2 border border-sky-200 hover:shadow-md"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Twitter
                    </a>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Meeting Request Modal (for patients) */}
      <Modal
        isOpen={meetingRequestModal.open}
        onClose={() =>
          setMeetingRequestModal({
            open: false,
            message: "",
            preferredDate: "",
            preferredTime: "",
          })
        }
        title="Request a Meeting"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-indigo-700 mb-2">
              Message
            </label>
            <textarea
              value={meetingRequestModal.message}
              onChange={(e) =>
                setMeetingRequestModal({
                  ...meetingRequestModal,
                  message: e.target.value,
                })
              }
              rows={4}
              className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Please introduce yourself and explain why you'd like to meet with this expert..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-indigo-700 mb-2">
              Preferred Date (Optional)
            </label>
            <input
              type="date"
              value={meetingRequestModal.preferredDate}
              onChange={(e) =>
                setMeetingRequestModal({
                  ...meetingRequestModal,
                  preferredDate: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-indigo-700 mb-2">
              Preferred Time (Optional)
            </label>
            <input
              type="time"
              value={meetingRequestModal.preferredTime}
              onChange={(e) =>
                setMeetingRequestModal({
                  ...meetingRequestModal,
                  preferredTime: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={sendMeetingRequest}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Send Meeting Request
            </button>
            <button
              onClick={() =>
                setMeetingRequestModal({
                  open: false,
                  message: "",
                  preferredDate: "",
                  preferredTime: "",
                })
              }
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Connection Request Modal (for researchers) */}
      <Modal
        isOpen={connectionRequestModal.open}
        onClose={() => setConnectionRequestModal({ open: false, message: "" })}
        title="Send Connection Request"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-indigo-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={connectionRequestModal.message}
              onChange={(e) =>
                setConnectionRequestModal({
                  ...connectionRequestModal,
                  message: e.target.value,
                })
              }
              rows={4}
              className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Add a personal message to your connection request (optional)..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={sendConnectionRequest}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Send Connection Request
            </button>
            <button
              onClick={() =>
                setConnectionRequestModal({ open: false, message: "" })
              }
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Direct Message Modal (only if connected) */}
      <Modal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ open: false, body: "" })}
        title={`Message ${profile?.name || "Researcher"}`}
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
        title="AI Summary"
      >
        <div className="space-y-4">
          <div className="pb-4 border-b border-indigo-200">
            <h4 className="font-bold text-indigo-900 text-lg">
              {summaryModal.title}
            </h4>
          </div>
          {summaryModal.loading ? (
            <div className="flex items-center gap-2 text-indigo-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Generating summary...</span>
            </div>
          ) : (
            <p className="text-indigo-800 text-sm leading-relaxed whitespace-pre-wrap">
              {summaryModal.summary}
            </p>
          )}
        </div>
      </Modal>

      {/* Publication Details Modal */}
      <Modal
        isOpen={publicationDetailsModal.open}
        onClose={() =>
          setPublicationDetailsModal({ open: false, publication: null })
        }
        title="Publication Details"
      >
        {publicationDetailsModal.publication && (
          <div className="flex flex-col h-full -mx-6 -my-6">
            <div className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-24">
              <div className="pb-4 border-b border-slate-200/60">
                <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                  {stripHtmlTags(publicationDetailsModal.publication.title)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {publicationDetailsModal.publication.pmid && (
                    <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">
                      <FileText className="w-3 h-3 mr-1.5" />
                      PMID: {publicationDetailsModal.publication.pmid}
                    </span>
                  )}
                  {publicationDetailsModal.publication.doi && (
                    <span className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md border border-purple-100">
                      <LinkIcon className="w-3 h-3 mr-1.5" />
                      DOI: {publicationDetailsModal.publication.doi}
                    </span>
                  )}
                  {publicationDetailsModal.publication.journal && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200">
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.journal}
                    </span>
                  )}
                  {publicationDetailsModal.publication.type && (
                    <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-100">
                      <FileText className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.type}
                    </span>
                  )}
                  {publicationDetailsModal.publication.year && (
                    <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {publicationDetailsModal.publication.year}
                    </span>
                  )}
                </div>
              </div>

              {(publicationDetailsModal.publication.abstract ||
                publicationDetailsModal.publication.snippet) && (
                <div>
                  <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-xl p-5 border border-indigo-100/50">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-indigo-700">
                      <Info className="w-4 h-4" />
                      Abstract
                    </h4>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-none overflow-visible">
                      {publicationDetailsModal.publication.abstract ||
                        publicationDetailsModal.publication.snippet}
                    </div>
                  </div>
                </div>
              )}

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
                        {publicationDetailsModal.publication.authors
                          .map((a) => (typeof a === "string" ? a : a.name || a))
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}

              {publicationDetailsModal.publication.link && (
                <div className="sticky bottom-0 px-6 py-4 border-t border-slate-200/60 bg-white/95 backdrop-blur-sm shadow-lg">
                  <a
                    href={publicationDetailsModal.publication.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Source
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Trial Details Modal */}
      <Modal
        isOpen={trialDetailsModal.open}
        onClose={() => setTrialDetailsModal({ open: false, trial: null })}
        title="Trial Details"
      >
        {trialDetailsModal.trial && (
          <div className="space-y-4">
            <h4 className="font-bold text-indigo-900">
              {trialDetailsModal.trial.title}
            </h4>
            {trialDetailsModal.trial.description && (
              <p className="text-slate-700 text-sm leading-relaxed">
                {trialDetailsModal.trial.description}
              </p>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
