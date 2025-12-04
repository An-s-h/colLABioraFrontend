import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";

export default function ExpertProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set()); // Track items being favorited/unfavorited
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
  const [contactModal, setContactModal] = useState(false);
  const [user, setUser] = useState(null);

  // Get expert data from URL params
  const expertName = searchParams.get("name");
  const expertAffiliation = searchParams.get("affiliation");
  const expertLocation = searchParams.get("location");
  const expertOrcid = searchParams.get("orcid");
  const expertBiography = searchParams.get("biography");
  const expertResearchInterests = searchParams.get("researchInterests");
  const fromPage = searchParams.get("from") || "experts"; // Default to "experts" if not specified

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (!expertName) {
      toast.error("Expert information not provided");
      navigate("/experts");
      return;
    }

    // Fetch profile and favorites
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("name", expertName);
        if (expertAffiliation) params.set("affiliation", expertAffiliation);
        if (expertLocation) params.set("location", expertLocation);
        if (expertOrcid) params.set("orcid", expertOrcid);
        if (expertBiography) params.set("biography", expertBiography);
        if (expertResearchInterests) {
          // If it's already a JSON string, use it; otherwise stringify it
          try {
            JSON.parse(expertResearchInterests);
            params.set("researchInterests", expertResearchInterests);
          } catch {
            params.set("researchInterests", expertResearchInterests);
          }
        }

        const response = await fetch(
          `${base}/api/expert/profile?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        setProfile(data.profile);
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
  }, [
    expertName,
    expertAffiliation,
    expertLocation,
    expertOrcid,
    expertBiography,
    expertResearchInterests,
    navigate,
    base,
  ]);

  // Helper function to get unique key for favorite tracking
  const getFavoriteKey = (item, type) => {
    if (type === "expert") {
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

    // Determine the correct ID to use for checking and deletion
    let checkId = itemId;
    if (type === "expert") {
      // For experts, use name as the primary identifier
      checkId = item.name || item.id || item._id || itemId;
    } else if (type === "publication") {
      // For publications, prioritize pmid, then id, then use the itemId passed
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

      // For experts, check by exact name match (primary identifier)
      if (type === "expert") {
        // Check by exact name match first
        if (item.name && fav.item?.name) {
          return fav.item.name === item.name;
        }
        // Fallback: check by id
        return fav.item?.id === checkId || fav.item?._id === checkId;
      }

      // For publications, check by pmid first, then id, then title+link+year combination
      if (type === "publication") {
        // If both have pmid, match by pmid
        if (item.pmid && fav.item?.pmid) {
          return fav.item.pmid === item.pmid;
        }
        // If both have id, match by id
        if (item.id && fav.item?.id && !item.pmid) {
          return fav.item.id === item.id;
        }
        // Match by checkId (which could be pmid, id, or composite)
        if (fav.item?.pmid === checkId || fav.item?.id === checkId) {
          return true;
        }
        // Fallback: match by title + link + year combination (for uniqueness)
        if (item.title && item.link && fav.item?.title && fav.item?.link) {
          return (
            fav.item.title === item.title &&
            fav.item.link === item.link &&
            (fav.item.year || "") === (item.year || "")
          );
        }
        return false;
      }

      // For trials, check by id or title
      if (type === "trial") {
        return (
          fav.item?.id === checkId ||
          fav.item?._id === checkId ||
          (fav.item?.title === item.title && item.title)
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
          return !(fav.item?.id === checkId || fav.item?._id === checkId);
        }

        if (type === "publication") {
          if (item.pmid && fav.item?.pmid) {
            return fav.item.pmid !== item.pmid;
          }
          if (item.id && fav.item?.id && !item.pmid) {
            return fav.item.id !== item.id;
          }
          return !(fav.item?.pmid === checkId || fav.item?.id === checkId);
        }

        if (type === "trial") {
          return !(
            fav.item?.id === checkId ||
            fav.item?._id === checkId ||
            (fav.item?.title === item.title && item.title)
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

      // Add type-specific IDs
      if (type === "expert") {
        if (item.name) {
          itemToStore.name = item.name;
        }
        if (item.orcid) {
          itemToStore.orcid = item.orcid;
        }
      }
      if (type === "publication") {
        if (item.pmid) itemToStore.pmid = item.pmid;
        if (item.id) itemToStore.id = item.id;
        if (item.link) itemToStore.link = item.link;
        if (item.title) itemToStore.title = item.title;
        if (item.year) itemToStore.year = item.year;
        if (!item.pmid && !item.id) {
          itemToStore.id = checkId;
        }
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
        if (type === "expert") {
          // Ensure name is stored as the primary identifier
          if (item.name) {
            itemToStore.name = item.name;
          }
          // Also store orcid if available (for reference, but not used for matching)
          if (item.orcid) {
            itemToStore.orcid = item.orcid;
          }
        }
        if (type === "publication") {
          // Ensure all publication identifiers are stored
          if (item.pmid) itemToStore.pmid = item.pmid;
          if (item.id) itemToStore.id = item.id;
          if (item.link) itemToStore.link = item.link;
          if (item.title) itemToStore.title = item.title;
          if (item.year) itemToStore.year = item.year;
          // If no pmid or id, use the checkId as the id
          if (!item.pmid && !item.id) {
            itemToStore.id = checkId;
          }
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
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      title = item.title || "Publication";
      text = [
        item.title || "",
        item.publication || item.journal || "",
        item.snippet || item.abstract || "",
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center  ">
          <div className="text-center">
            <p className="text-slate-700 mb-4">Expert profile not found</p>
            <button
              onClick={() => navigate("/experts")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors z-50"
            >
              Back to Experts
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isExpertFavorited = favorites.some((fav) => {
    if (fav.type !== "expert") return false;

    // Check by exact name match (primary identifier)
    if (profile.name && fav.item?.name) {
      return fav.item.name === profile.name;
    }

    // Fallback: check by id
    const expertId = profile.name || profile.id || profile._id;
    if (fav.item?.id === expertId || fav.item?._id === expertId) {
      return true;
    }

    return false;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-100  overflow-hidden relative  ">
        <AnimatedBackground />
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 mx-auto max-w-7xl pt-15 pb-12 lg:mt-5 mt-17 relative ">
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (fromPage === "dashboard") {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                const role = user?.role || "patient";
                navigate(`/dashboard/${role}`);
              } else {
                navigate("/experts");
              }
            }}
            className="mb-6 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors relative z-50 cursor-pointer"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {fromPage === "dashboard" ? "Dashboard" : "Experts"}
          </button>

          {/* Header Section */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 rounded-xl shadow-xl border border-indigo-500/50 relative overflow-hidden p-4 sm:p-5 mb-6">
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
                        On Collabiora? → No
                      </span>
                      <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/30">
                        Contactable? → Not yet
                      </span>
                    </div>
                  </div>

                  {/* Location & Affiliation */}
                  <div className="flex flex-wrap items-center gap-3 text-indigo-100 text-sm mb-2">
                    {profile.affiliation && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>
                          {typeof profile.affiliation === "string"
                            ? profile.affiliation
                            : profile.affiliation?.name ||
                              profile.affiliation?.institution ||
                              String(profile.affiliation)}
                        </span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {typeof profile.location === "string"
                            ? profile.location
                            : profile.location?.city &&
                              profile.location?.country
                            ? `${profile.location.city}, ${profile.location.country}`
                            : profile.location?.city ||
                              profile.location?.country ||
                              String(profile.location)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      onClick={() => setContactModal(true)}
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all border border-white/30 shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Contact via Admin
                    </button>
                    <button
                      onClick={() => {
                        // Use name as the primary identifier
                        const expertId =
                          profile.name || profile.id || profile._id;
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
                          ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
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
                  </div>

                  {/* Areas of Expertise */}
                  {(() => {
                    const expertise = Array.isArray(profile.areasOfExpertise)
                      ? profile.areasOfExpertise
                      : profile.areasOfExpertise
                      ? [profile.areasOfExpertise]
                      : [];
                    return expertise.length > 0 ? (
                      <div>
                        <h3 className="text-xs font-semibold text-indigo-100 mb-1.5 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          Areas of Expertise
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {expertise.map((area, idx) => {
                            const areaText =
                              typeof area === "string"
                                ? area
                                : area?.name || area?.title || String(area);
                            return (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-white/20 text-white rounded text-xs font-medium border border-white/30"
                              >
                                {areaText}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Summary / About Section */}
          {profile.bioSummary && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                About
              </h2>
              <p className="text-slate-700 leading-relaxed">
                {typeof profile.bioSummary === "string"
                  ? profile.bioSummary
                      .replace(/^Ai[:\s]*/i, "")
                      .replace(/^Summary[:\s]*/i, "")
                      .trim()
                  : String(profile.bioSummary)}
              </p>
            </div>
          )}

          {/* Impact Metrics */}
          {profile.impactMetrics && (
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-center">
                <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
                <div className="text-xl font-bold text-slate-900">
                  {profile.impactMetrics.totalCitations || 0}
                </div>
                <div className="text-xs text-slate-600">Total Citations</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-center">
                <Star className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                <div className="text-xl font-bold text-slate-900">
                  {profile.impactMetrics.maxCitations || 0}
                </div>
                <div className="text-xs text-slate-600">Max Citations</div>
              </div>
            </div>
          )}

          {/* Top Publications */}
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
                {profile.publications.slice(0, 10).map((pub, idx) => {
                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-lg transition-all bg-white"
                    >
                      {/* Header with Title, Citations, and Favorite */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm mb-2 leading-snug line-clamp-2">
                            {pub.title || "Untitled Publication"}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(pub.pmid || pub.id) && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-medium rounded">
                                {pub.pmid
                                  ? `PMID: ${pub.pmid}`
                                  : `ID: ${pub.id}`}
                              </span>
                            )}
                            {pub.journal && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-slate-50 text-slate-700 border-slate-200">
                                {pub.journal.length > 25
                                  ? `${pub.journal.substring(0, 25)}...`
                                  : pub.journal}
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
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Citations - More Prominent */}
                          {(pub.citations || pub.citations === 0) && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="text-xs font-bold text-indigo-700">
                                {pub.citations || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Compact Metadata */}
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
                        {pub.publication && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="line-clamp-1">
                              {typeof pub.publication === "string"
                                ? pub.publication
                                : pub.publication.name ||
                                  String(pub.publication)}
                            </span>
                          </div>
                        )}
                        {(pub.volume || pub.issue || pub.pages) && (
                          <span className="text-slate-500">
                            {pub.volume && `Vol. ${pub.volume}`}
                            {pub.issue && ` (${pub.issue})`}
                            {pub.pages && `, pp. ${pub.pages}`}
                          </span>
                        )}
                        {pub.doi && (
                          <a
                            href={`https://doi.org/${pub.doi}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 hover:underline line-clamp-1"
                          >
                            DOI:{" "}
                            {pub.doi.length > 20
                              ? `${pub.doi.substring(0, 20)}...`
                              : pub.doi}
                          </a>
                        )}
                      </div>

                      {/* Compact Abstract Preview */}
                      {(pub.abstract || pub.snippet) && (
                        <div className="mb-3">
                          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 ">
                            <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                              {pub.abstract || pub.snippet}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Compact Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => generateSummary(pub, "publication")}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Summary
                        </button>
                        {pub.link && (
                          <a
                            href={pub.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-200 shadow-sm hover:shadow-md"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Paper
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Associated Clinical Trials */}
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

          {/* Activity Timeline */}
          {profile.activityTimeline && profile.activityTimeline.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {profile.activityTimeline.map((activity, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                      {idx < profile.activityTimeline.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900">
                          {activity.title}
                        </span>
                        {activity.year && (
                          <span className="text-xs text-slate-500">
                            ({activity.year})
                          </span>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-slate-600">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              External Links
            </h2>
            <div className="flex flex-wrap gap-3">
              {profile.externalLinks?.googleScholar && (
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
              {profile.externalLinks?.pubmed && (
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
              {profile.externalLinks?.researchGate && (
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
              {profile.externalLinks?.orcid && (
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
              {profile.externalLinks?.institutional && (
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
            </div>
          </div>

          {/* Collaboration CTAs */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-md border border-indigo-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
              Collaboration
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Info className="w-4 h-4 text-indigo-600" />
                <span className="text-sm">
                  Messaging unavailable — this expert is not yet on Collabiora.
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setContactModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Contact via Admin
                </button>
                <button
                  onClick={() =>
                    toggleFavorite(
                      "expert",
                      profile.orcid || profile.name,
                      profile
                    )
                  }
                  disabled={favoritingItems.has(
                    getFavoriteKey(profile, "expert")
                  )}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isExpertFavorited
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {favoritingItems.has(getFavoriteKey(profile, "expert")) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-4 h-4 ${
                        isExpertFavorited ? "fill-current" : ""
                      }`}
                    />
                  )}
                  {isExpertFavorited ? "Following" : "Follow Expert"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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

              {/* Abstract Section */}
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
                        {publicationDetailsModal.publication.authors
                          .map((a) => (typeof a === "string" ? a : a.name || a))
                          .join(", ")}
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
                    {publicationDetailsModal.publication.pages && (
                      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Pages
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {publicationDetailsModal.publication.pages}
                        </p>
                      </div>
                    )}

                    {/* Citations */}
                    {(publicationDetailsModal.publication.citations ||
                      publicationDetailsModal.publication.citations === 0) && (
                      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Citations
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-indigo-700">
                          {publicationDetailsModal.publication.citations || 0}
                        </p>
                      </div>
                    )}

                    {/* DOI */}
                    {publicationDetailsModal.publication.doi && (
                      <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            DOI
                          </span>
                        </div>
                        <a
                          href={`https://doi.org/${publicationDetailsModal.publication.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline break-all"
                        >
                          {publicationDetailsModal.publication.doi}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-slate-200/60 bg-white/95 backdrop-blur-sm shadow-lg">
              <div className="flex flex-wrap gap-3">
                {publicationDetailsModal.publication.link && (
                  <a
                    href={publicationDetailsModal.publication.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on{" "}
                    {publicationDetailsModal.publication.pmid
                      ? "PubMed"
                      : "Source"}
                  </a>
                )}
                <button
                  onClick={() =>
                    toggleFavorite(
                      "publication",
                      publicationDetailsModal.publication.pmid ||
                        publicationDetailsModal.publication.id ||
                        publicationDetailsModal.publication.link,
                      publicationDetailsModal.publication
                    )
                  }
                  disabled={favoritingItems.has(
                    getFavoriteKey(
                      publicationDetailsModal.publication,
                      "publication"
                    )
                  )}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    favorites.some(
                      (fav) =>
                        fav.type === "publication" &&
                        (fav.item?.title ===
                          publicationDetailsModal.publication.title ||
                          fav.item?.link ===
                            publicationDetailsModal.publication.link ||
                          fav.item?.pmid ===
                            publicationDetailsModal.publication.pmid)
                    )
                      ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {favoritingItems.has(
                    getFavoriteKey(
                      publicationDetailsModal.publication,
                      "publication"
                    )
                  ) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart
                      className={`w-4 h-4 ${
                        favorites.some(
                          (fav) =>
                            fav.type === "publication" &&
                            (fav.item?.title ===
                              publicationDetailsModal.publication.title ||
                              fav.item?.link ===
                                publicationDetailsModal.publication.link ||
                              fav.item?.pmid ===
                                publicationDetailsModal.publication.pmid)
                        )
                          ? "fill-current"
                          : ""
                      }`}
                    />
                  )}
                  {favoritingItems.has(
                    getFavoriteKey(
                      publicationDetailsModal.publication,
                      "publication"
                    )
                  )
                    ? "Processing..."
                    : favorites.some(
                        (fav) =>
                          fav.type === "publication" &&
                          (fav.item?.title ===
                            publicationDetailsModal.publication.title ||
                            fav.item?.link ===
                              publicationDetailsModal.publication.link ||
                            fav.item?.pmid ===
                              publicationDetailsModal.publication.pmid)
                      )
                    ? "Remove from Favorites"
                    : "Add to Favorites"}
                </button>
              </div>
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

      {/* Contact via Admin Modal */}
      <Modal
        isOpen={contactModal}
        onClose={() => setContactModal(false)}
        title="Contact via Admin"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            Would you like to contact {profile.name} through Collabiora admin? Our
            admin team will facilitate the connection and help coordinate
            communication between you and this expert.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                toast.success(
                  "Contact request submitted! Our admin team will reach out soon."
                );
                setContactModal(false);
              }}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Submit Request
            </button>
            <button
              onClick={() => setContactModal(false)}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
