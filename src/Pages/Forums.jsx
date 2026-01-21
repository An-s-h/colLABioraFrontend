"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import {
  MessageCircle,
  ArrowUp,
  ArrowDown,
  User,
  Eye,
  Clock,
  Plus,
  Send,
  ChevronUp,
  ChevronDown,
  Star,
  Loader2,
  Search,
  Users,
  Sparkles,
  UserCheck,
  Globe,
  CheckCircle2,
  X,
  ChevronRight,
  Heart,
  Compass,
  Filter,
  Tag,
} from "lucide-react";
import {
  IconHospital,
  IconRibbonHealth,
  IconBrain,
  IconDroplet,
  IconHeartbeat,
  IconSalad,
  IconBarbell,
  IconMicroscope,
  IconBandage,
  IconShield,
  IconStethoscope,
} from "@tabler/icons-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import CustomSelect from "../components/ui/CustomSelect.jsx";
import { AuroraText } from "../components/ui/aurora-text";
import { BorderBeam } from "../components/ui/border-beam";

// Icon mapping for communities
const getCommunityIcon = (slug, name) => {
  const iconMap = {
    "general-health": IconHospital,
    "cancer-support": IconRibbonHealth,
    "mental-health": IconBrain,
    "diabetes-management": IconDroplet,
    "heart-health": IconHeartbeat,
    "nutrition-diet": IconSalad,
    "fitness-exercise": IconBarbell,
    "clinical-trials": IconMicroscope,
    "chronic-pain": IconBandage,
    "autoimmune-conditions": IconShield,
  };

  // Try slug first, then check name
  const IconComponent =
    iconMap[slug] ||
    iconMap[name?.toLowerCase().replace(/\s+/g, "-")] ||
    IconStethoscope;
  return IconComponent;
};

// Community Icon Component with monochromatic styling
const CommunityIcon = ({ community, size = "1.125rem" }) => {
  const IconComponent = getCommunityIcon(community?.slug, community?.name);
  const iconColor = community?.color || "#2F3C96";

  return (
    <IconComponent
      className="shrink-0"
      style={{
        color: iconColor,
        width: size,
        height: size,
      }}
      stroke={1.5}
    />
  );
};

// Deduplicate communities coming from API responses
const dedupeCommunities = (list = []) => {
  const seen = new Set();
  const unique = [];

  list.forEach((community) => {
    const key =
      community?._id || community?.slug || community?.name?.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(community);
  });

  return unique;
};

// Default condition tags using patient-friendly taxonomy
const DEFAULT_CONDITION_TAGS = {
  default: ["General Health", "Preventive Care", "Sleep Health", "Stress Management"],
  "autoimmune-conditions": [
    "Lupus (SLE)",
    "Rheumatoid Arthritis (RA)",
    "Multiple Sclerosis (MS)",
    "Psoriasis / Psoriatic Arthritis",
    "Sjögren’s Syndrome",
    "Crohn’s Disease / Ulcerative Colitis",
    "Hashimoto’s Thyroiditis",
    "Type 1 Diabetes",
    "General Autoimmune",
  ],
  "cancer-support": [
    "Breast Cancer",
    "Lung Cancer",
    "Prostate Cancer",
    "Colorectal Cancer",
    "Blood Cancers",
    "Brain Tumors",
    "Metastatic Cancer",
    "Cancer Survivorship",
  ],
  "heart-health": [
    "Hypertension (High BP)",
    "Heart Disease",
    "Arrhythmia",
    "Heart Failure",
    "Coronary Artery Disease",
    "Stroke Risk",
  ],
  "mental-health": [
    "Anxiety Disorders",
    "Depression",
    "Bipolar Disorder",
    "PTSD",
    "ADHD",
    "OCD",
  ],
  "chronic-pain": [
    "Fibromyalgia",
    "Chronic Back Pain",
    "Neuropathic Pain",
    "Arthritis Pain",
    "Post-Surgical Pain",
  ],
  "clinical-trials": [
    "Cancer Trials",
    "Autoimmune Trials",
    "Neurology Trials",
    "Cardiology Trials",
  ],
  "fitness-exercise": [
    "General Fitness",
    "Rehab & Recovery",
    "Adaptive Exercise",
  ],
  "nutrition-diet": [
    "Weight Management",
    "Diabetes Nutrition",
    "Heart-Healthy Diet",
    "Autoimmune Diets",
    "Cancer Nutrition",
  ],
  "general-health": [
    "General Health",
    "Preventive Care",
    "Aging",
    "Men’s Health",
    "Women’s Health",
    "Sleep Health",
    "Stress Management",
    "Vaccinations",
  ],
  "diabetes-management": [
    "Type 1 Diabetes",
    "Type 2 Diabetes",
    "Gestational Diabetes",
    "Prediabetes",
  ],
};

const buildConditionTags = (community, threads = []) => {
  const slug =
    community?.slug ||
    community?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const defaults = DEFAULT_CONDITION_TAGS[slug] || DEFAULT_CONDITION_TAGS.default;
  const dynamic =
    threads?.flatMap((t) => t.conditions || [])?.filter(Boolean) || [];

  const seen = new Set();
  const combined = [...defaults, ...dynamic];

  const unique = [];
  combined.forEach((tag) => {
    const key = tag.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(tag.trim());
    }
  });

  return ["All", ...unique];
};

export default function Forums() {
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [threads, setThreads] = useState([]);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [expandedThreadIds, setExpandedThreadIds] = useState(new Set());
  const [loadingThreadDetails, setLoadingThreadDetails] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [newThreadModal, setNewThreadModal] = useState(false);
  const [newSubcategoryModal, setNewSubcategoryModal] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryDescription, setNewSubcategoryDescription] =
    useState("");
  const [newSubcategoryTags, setNewSubcategoryTags] = useState([]);
  const [meshSuggestions, setMeshSuggestions] = useState([]);
  const [meshInput, setMeshInput] = useState("");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [newThreadSubcategory, setNewThreadSubcategory] = useState(null);
  const [newThreadTags, setNewThreadTags] = useState([]);
  const [newThreadMeshInput, setNewThreadMeshInput] = useState("");
  const [newThreadMeshSuggestions, setNewThreadMeshSuggestions] = useState([]);
  const [newThreadConditions, setNewThreadConditions] = useState([]);
  const [newThreadConditionInput, setNewThreadConditionInput] = useState("");
  const [conditionSuggestions, setConditionSuggestions] = useState([]);
  const [modalSelectedCommunity, setModalSelectedCommunity] = useState(null);
  const [modalSubcategories, setModalSubcategories] = useState([]);
  const [loadingModalSubcategories, setLoadingModalSubcategories] =
    useState(false);
  const tagSuggestionsRef = useRef(null);
  const conditionSuggestionsRef = useRef(null);
  const [replyBody, setReplyBody] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritingItems, setFavoritingItems] = useState(new Set());
  const [followingIds, setFollowingIds] = useState(new Set());
  const [followingLoading, setFollowingLoading] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, following, forYou, involving
  const [sortBy, setSortBy] = useState("recent"); // recent, popular
  const [hoveredCommunity, setHoveredCommunity] = useState(null);
  const [isExploreCollapsed, setIsExploreCollapsed] = useState(true);
  const [mobileCommunityId, setMobileCommunityId] = useState("");
  const [selectedConditionTag, setSelectedConditionTag] = useState("All");

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const conditionTagOptions = useMemo(
    () => buildConditionTags(selectedCommunity, threads),
    [selectedCommunity, threads]
  );

  const modalConditionOptions = useMemo(
    () =>
      buildConditionTags(
        modalSelectedCommunity || selectedCommunity,
        threads
      ).filter((tag) => tag !== "All"),
    [modalSelectedCommunity, selectedCommunity, threads]
  );

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
    loadCommunities();
    if (userData?._id || userData?.id) {
      loadFavorites();
    }
  }, []);

  useEffect(() => {
    if (selectedCommunity) {
      loadSubcategories(selectedCommunity._id);
      setSelectedSubcategory(null);
    } else {
      setSubcategories([]);
      setSelectedSubcategory(null);
    }
  }, [selectedCommunity]);

  useEffect(() => {
    if (modalSelectedCommunity) {
      loadModalSubcategories(modalSelectedCommunity._id);
    } else {
      setModalSubcategories([]);
      setNewThreadSubcategory(null);
    }
  }, [modalSelectedCommunity]);

  useEffect(() => {
    setSelectedConditionTag("All");
  }, [selectedCommunity?._id]);

  useEffect(() => {
    setMobileCommunityId(selectedCommunity?._id || "");
  }, [selectedCommunity]);

  const threadMatchesSelectedCondition = (thread, conditionTag) => {
    if (!conditionTag || conditionTag === "All") return true;
    return (thread?.conditions || []).some(
      (condition) =>
        condition?.toLowerCase() === conditionTag.toLowerCase()
    );
  };

  // Close tag suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        tagSuggestionsRef.current &&
        !tagSuggestionsRef.current.contains(event.target)
      ) {
        setNewThreadMeshSuggestions([]);
      }
      if (
        conditionSuggestionsRef.current &&
        !conditionSuggestionsRef.current.contains(event.target)
      ) {
        setConditionSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Don't reload threads if user is searching
    if (searchQuery.trim()) {
      return;
    }

    if (selectedSubcategory) {
      loadThreadsBySubcategory();
    } else if (selectedCommunity) {
      loadThreads();
    } else if (activeTab === "forYou" && user) {
      loadRecommendedThreads();
    } else if (activeTab === "involving" && user) {
      loadInvolvingThreads();
    } else if (activeTab === "following" && user) {
      loadFollowingFeed();
    } else if (activeTab === "all" && !selectedCommunity) {
      loadAllThreads();
    }
  }, [
    selectedCommunity,
    selectedSubcategory,
    activeTab,
    sortBy,
    searchQuery,
    selectedConditionTag,
  ]);

  async function loadFavorites() {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) return;

    try {
      const response = await fetch(
        `${base}/api/favorites/${userData._id || userData.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.items || []);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  }

  async function loadCommunities() {
    setLoadingCommunities(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);

      const response = await fetch(
        `${base}/api/communities?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch communities");

      const data = await response.json();
      const uniqueCommunities = dedupeCommunities(data.communities || []);
      setCommunities(uniqueCommunities);

      // Update following IDs
      const followingSet = new Set();
      uniqueCommunities.forEach((c) => {
        if (c.isFollowing) followingSet.add(c._id);
      });
      setFollowingIds(followingSet);
    } catch (error) {
      console.error("Error loading communities:", error);
      toast.error("Failed to load communities");
    } finally {
      setLoadingCommunities(false);
    }
  }

  async function loadAllThreads() {
    setLoading(true);
    try {
      const response = await fetch(`${base}/api/forums/threads`);
      if (!response.ok) throw new Error("Failed to fetch threads");
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubcategories(communityId) {
    if (!communityId) return;
    setLoadingSubcategories(true);
    try {
      const response = await fetch(
        `${base}/api/communities/${communityId}/subcategories`
      );
      if (!response.ok) throw new Error("Failed to fetch subcategories");

      const data = await response.json();
      setSubcategories(data.subcategories || []);
    } catch (error) {
      console.error("Error loading subcategories:", error);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function loadModalSubcategories(communityId) {
    if (!communityId) return;
    setLoadingModalSubcategories(true);
    try {
      const response = await fetch(
        `${base}/api/communities/${communityId}/subcategories`
      );
      if (!response.ok) throw new Error("Failed to fetch subcategories");

      const data = await response.json();
      setModalSubcategories(data.subcategories || []);
    } catch (error) {
      console.error("Error loading subcategories:", error);
    } finally {
      setLoadingModalSubcategories(false);
    }
  }

  async function loadThreads() {
    if (!selectedCommunity) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      if (selectedConditionTag && selectedConditionTag !== "All") {
        params.set("condition", selectedConditionTag);
      }

      const response = await fetch(
        `${base}/api/communities/${
          selectedCommunity._id
        }/threads?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      const fetchedThreads = data.threads || [];
      setThreads(
        fetchedThreads.filter((thread) =>
          threadMatchesSelectedCondition(thread, selectedConditionTag)
        )
      );
    } catch (error) {
      console.error("Error loading threads:", error);
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  async function loadThreadsBySubcategory() {
    if (!selectedSubcategory) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      params.set("subcategoryId", selectedSubcategory._id);
      if (selectedConditionTag && selectedConditionTag !== "All") {
        params.set("condition", selectedConditionTag);
      }

      // Filter threads client-side by subcategory for now
      // In production, add server-side filtering
      const response = await fetch(
        `${base}/api/communities/${
          selectedSubcategory.parentCommunityId || selectedCommunity._id
        }/threads?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      // Filter by subcategory on client side (would be better on server)
      const filteredThreads = (data.threads || []).filter(
        (thread) =>
          thread.subcategoryId?._id === selectedSubcategory._id ||
          thread.subcategoryId === selectedSubcategory._id
      );
      const conditioned = filteredThreads.filter((thread) =>
        threadMatchesSelectedCondition(thread, selectedConditionTag)
      );
      setThreads(conditioned);
    } catch (error) {
      console.error("Error loading threads:", error);
      toast.error("Failed to load threads");
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendedThreads() {
    if (!user?._id && !user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${base}/api/communities/recommended/${user._id || user.id}?limit=20`
      );
      if (!response.ok) throw new Error("Failed to fetch recommendations");

      const data = await response.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvolvingThreads() {
    if (!user?._id && !user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${base}/api/communities/involving/${user._id || user.id}?limit=20`
      );
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Error loading threads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFollowingFeed() {
    if (!user?._id && !user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${base}/api/communities/feed/${user._id || user.id}?limit=20`
      );
      if (!response.ok) throw new Error("Failed to fetch feed");

      const data = await response.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function searchThreads() {
    if (!searchQuery.trim()) {
      // Clear search - reload based on current view
      if (selectedCommunity) {
        loadThreads();
      } else {
        loadAllThreads();
      }
      return;
    }
    setLoading(true);
    try {
      // Always search from overall forums, not communities
      // Clear selectedCommunity when searching to show all results
      const response = await fetch(`${base}/api/forums/threads`);
      if (!response.ok) throw new Error("Failed to fetch threads");

      const data = await response.json();
      const allThreads = data.threads || [];

      // Filter threads client-side based on search query
      const query = searchQuery.toLowerCase();
      const filteredThreads = allThreads.filter((thread) => {
        const titleMatch = thread.title?.toLowerCase().includes(query);
        const bodyMatch = thread.body?.toLowerCase().includes(query);
        const authorMatch = thread.authorUserId?.username
          ?.toLowerCase()
          .includes(query);
        const matchesCondition = threadMatchesSelectedCondition(
          thread,
          selectedConditionTag
        );
        return (titleMatch || bodyMatch || authorMatch) && matchesCondition;
      });

      setThreads(filteredThreads);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search effect - triggers search as user types (only for discussions)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchThreads();
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  async function toggleFollow(communityId) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to follow communities");
      return;
    }

    if (followingLoading.has(communityId)) return;

    setFollowingLoading((prev) => new Set(prev).add(communityId));
    const isFollowing = followingIds.has(communityId);

    try {
      if (isFollowing) {
        await fetch(
          `${base}/api/communities/${communityId}/follow?userId=${
            user._id || user.id
          }`,
          { method: "DELETE" }
        );
        setFollowingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(communityId);
          return newSet;
        });
        toast.success("Left community");
      } else {
        await fetch(`${base}/api/communities/${communityId}/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id || user.id }),
        });
        setFollowingIds((prev) => new Set(prev).add(communityId));
        toast.success("Joined community!");
      }

      // Update community member counts
      setCommunities((prev) =>
        prev.map((c) =>
          c._id === communityId
            ? {
                ...c,
                memberCount: isFollowing
                  ? c.memberCount - 1
                  : c.memberCount + 1,
                isFollowing: !isFollowing,
              }
            : c
        )
      );
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update membership");
    } finally {
      setFollowingLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(communityId);
        return newSet;
      });
    }
  }

  async function loadThreadDetails(threadId, forceReload = false) {
    if (expandedThreads[threadId] && !forceReload) return;

    setLoadingThreadDetails((prev) => new Set(prev).add(threadId));
    try {
      const response = await fetch(`${base}/api/forums/threads/${threadId}`);
      if (!response.ok) throw new Error("Failed to load thread");

      const data = await response.json();
      setExpandedThreads((prev) => ({ ...prev, [threadId]: data }));
    } catch (error) {
      console.error("Error loading thread:", error);
    } finally {
      setLoadingThreadDetails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    }
  }

  function toggleThread(threadId) {
    const isExpanded = expandedThreadIds.has(threadId);
    if (isExpanded) {
      setExpandedThreadIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    } else {
      setExpandedThreadIds((prev) => new Set(prev).add(threadId));
      loadThreadDetails(threadId);
    }
  }

  async function toggleFavorite(itemId, itemType = "thread") {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to favorite items");
      return;
    }

    if (favoritingItems.has(itemId)) return;

    setFavoritingItems((prev) => new Set(prev).add(itemId));
    const isFavorited = favorites.some(
      (fav) => fav.itemId === itemId && fav.itemType === itemType
    );

    try {
      if (isFavorited) {
        await fetch(
          `${base}/api/favorites/${
            user._id || user.id
          }/${itemId}?type=${itemType}`,
          { method: "DELETE" }
        );
        setFavorites((prev) =>
          prev.filter(
            (fav) => !(fav.itemId === itemId && fav.itemType === itemType)
          )
        );
        toast.success("Removed from favorites");
      } else {
        await fetch(`${base}/api/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id || user.id,
            itemId,
            itemType,
          }),
        });
        setFavorites((prev) => [
          ...prev,
          { itemId, itemType, userId: user._id || user.id },
        ]);
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite");
    } finally {
      setFavoritingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }

  async function createSubcategory() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to create subcategories");
      return;
    }
    if (!selectedCommunity) {
      toast.error("Please select a community first");
      return;
    }
    if (!newSubcategoryName || !newSubcategoryName.trim()) {
      toast.error("Please enter a subcategory name");
      return;
    }

    try {
      const response = await fetch(
        `${base}/api/communities/${selectedCommunity._id}/subcategories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newSubcategoryName.trim(),
            description: newSubcategoryDescription.trim() || "",
            tags: newSubcategoryTags,
            createdBy: user._id || user.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.redirect) {
          // Similar subcategory exists - redirect user
          toast.error(
            `Similar subcategory "${data.existingSubcategory.name}" already exists`
          );
          setSelectedSubcategory(data.existingSubcategory);
          setNewSubcategoryModal(false);
          setNewSubcategoryName("");
          setNewSubcategoryDescription("");
          setNewSubcategoryTags([]);
          return;
        }
        throw new Error(data.error || "Failed to create subcategory");
      }

      toast.success("Subcategory created successfully!");
      setNewSubcategoryModal(false);
      setNewSubcategoryName("");
      setNewSubcategoryDescription("");
      setNewSubcategoryTags([]);
      loadSubcategories(selectedCommunity._id);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      toast.error(error.message || "Failed to create subcategory");
    }
  }

  async function fetchMeshSuggestions(term) {
    if (!term || term.trim().length < 2) {
      setMeshSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${base}/api/mesh/suggestions?term=${encodeURIComponent(term)}`
      );
      if (response.ok) {
        const data = await response.json();
        setMeshSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error fetching MeSH suggestions:", error);
    }
  }

  async function fetchThreadTagSuggestions(term) {
    if (!term || term.trim().length < 1) {
      setNewThreadMeshSuggestions([]);
      return;
    }

    // Common tag suggestions based on input
    const commonTags = [
      "Treatment",
      "Therapy",
      "Diagnosis",
      "Symptoms",
      "Side Effects",
      "Outcomes",
      "Recovery",
      "Prevention",
      "Medication",
      "Surgery",
      "Research",
      "Clinical Trials",
      "Support",
      "Coping",
      "Lifestyle",
      "Nutrition",
      "Exercise",
      "Mental Health",
      "Pain Management",
      "Rehabilitation",
    ];

    const normalizedTerm = term.toLowerCase().trim();
    const suggestions = commonTags
      .filter((tag) => tag.toLowerCase().includes(normalizedTerm))
      .filter((tag) => !newThreadTags.includes(tag))
      .slice(0, 8);

    setNewThreadMeshSuggestions(suggestions);
  }

  const addConditionTag = (tag) => {
    if (!tag || !tag.trim()) return;
    const normalized = tag.trim();
    const exists = newThreadConditions.some(
      (c) => c.toLowerCase() === normalized.toLowerCase()
    );
    if (!exists) {
      setNewThreadConditions([...newThreadConditions, normalized]);
    }
    setNewThreadConditionInput("");
    setConditionSuggestions([]);
  };

  const updateConditionSuggestions = (value) => {
    setNewThreadConditionInput(value);
    if (!value?.trim()) {
      setConditionSuggestions(modalConditionOptions.slice(0, 6));
      return;
    }
    const normalized = value.toLowerCase();
    const filtered = modalConditionOptions.filter(
      (tag) =>
        tag.toLowerCase().includes(normalized) &&
        !newThreadConditions.some(
          (c) => c.toLowerCase() === tag.toLowerCase()
        )
    );
    setConditionSuggestions(filtered.slice(0, 8));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (meshInput.trim()) {
        fetchMeshSuggestions(meshInput);
      } else {
        setMeshSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [meshInput]);

  async function postThread() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to post");
      return;
    }
    const communityToUse = modalSelectedCommunity || selectedCommunity;
    if (!communityToUse) {
      toast.error("Please select a community first");
      return;
    }
    if (!newThreadTitle || !newThreadBody) {
      toast.error("Please fill in both title and body");
      return;
    }

    try {
      const response = await fetch(
        `${base}/api/communities/${communityToUse._id}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorUserId: user._id || user.id,
            authorRole: user.role,
            title: newThreadTitle,
            body: newThreadBody,
            subcategoryId: newThreadSubcategory?._id || null,
            tags: newThreadTags || [],
            conditions: newThreadConditions || [],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to post");

      toast.success("Posted successfully!");
      setNewThreadModal(false);
      setNewThreadTitle("");
      setNewThreadBody("");
      setNewThreadSubcategory(null);
      setNewThreadTags([]);
      setNewThreadConditions([]);
      setNewThreadConditionInput("");
      setConditionSuggestions([]);
      setNewThreadMeshInput("");
      setNewThreadMeshSuggestions([]);
      setModalSelectedCommunity(null);
      // Reload threads based on current view
      if (selectedSubcategory) {
        loadThreadsBySubcategory();
      } else if (selectedCommunity) {
        loadThreads();
      } else {
        loadAllThreads();
      }
    } catch (error) {
      console.error("Error posting:", error);
      toast.error("Failed to post");
    }
  }

  async function postReply(threadId, parentReplyId = null) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to reply");
      return;
    }

    const body = replyBody[`${threadId}-${parentReplyId || "root"}`] || "";
    if (!body.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      const response = await fetch(`${base}/api/forums/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          parentReplyId: parentReplyId || null,
          authorUserId: user._id || user.id,
          authorRole: user.role,
          body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to post reply");
        return;
      }

      setReplyBody((prev) => {
        const newState = { ...prev };
        delete newState[`${threadId}-${parentReplyId || "root"}`];
        return newState;
      });
      setReplyingTo(null);
      toast.success("Reply posted!");

      if (expandedThreadIds.has(threadId)) {
        await loadThreadDetails(threadId, true);
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
    }
  }

  async function voteOnThread(threadId, voteType) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to vote");
      return;
    }

    try {
      const res = await fetch(`${base}/api/forums/threads/${threadId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id || user.id, voteType }),
      }).then((r) => r.json());

      setThreads((prev) =>
        prev.map((t) =>
          t._id === threadId ? { ...t, voteScore: res.voteScore } : t
        )
      );
    } catch (error) {
      console.error("Error voting:", error);
    }
  }

  async function voteOnReply(replyId, voteType) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to vote");
      return;
    }

    try {
      const res = await fetch(`${base}/api/forums/replies/${replyId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id || user.id, voteType }),
      }).then((r) => r.json());

      setExpandedThreads((prev) => {
        const updated = { ...prev };
        const updateReplyVote = (replies) =>
          replies.map((reply) => {
            if (reply._id === replyId) {
              return { ...reply, voteScore: res.voteScore };
            }
            if (reply.children) {
              return { ...reply, children: updateReplyVote(reply.children) };
            }
            return reply;
          });

        Object.keys(updated).forEach((threadId) => {
          const threadData = updated[threadId];
          if (threadData.replies?.length > 0) {
            updated[threadId] = {
              ...threadData,
              replies: updateReplyVote(threadData.replies),
            };
          }
        });
        return updated;
      });
    } catch (error) {
      console.error("Error voting:", error);
    }
  }

  // Don't filter communities based on discussion search query
  // Communities should be shown separately and not affected by discussion search
  const filteredCommunities = useMemo(() => {
    return communities;
  }, [communities]);

  const displayedCommunities = useMemo(() => {
    if (activeTab === "following") {
      return filteredCommunities.filter((c) => followingIds.has(c._id));
    }
    return filteredCommunities;
  }, [filteredCommunities, activeTab, followingIds]);

  const sortedDisplayedCommunities = useMemo(() => {
    const list = [...displayedCommunities];
    // Official first, then by member count (desc), then name (asc)
    list.sort((a, b) => {
      const aOfficial = a?.isOfficial ? 1 : 0;
      const bOfficial = b?.isOfficial ? 1 : 0;
      if (aOfficial !== bOfficial) return bOfficial - aOfficial;

      const aMembers = Number(a?.memberCount || 0);
      const bMembers = Number(b?.memberCount || 0);
      if (aMembers !== bMembers) return bMembers - aMembers;

      return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
        sensitivity: "base",
      });
    });
    return list;
  }, [displayedCommunities]);

  const groupedMobileCommunities = useMemo(() => {
    const mine = [];
    const explore = [];

    sortedDisplayedCommunities.forEach((c) => {
      if (followingIds.has(c._id)) mine.push(c);
      else explore.push(c);
    });

    return { mine, explore };
  }, [sortedDisplayedCommunities, followingIds]);

  const mobileCommunityOptions = useMemo(() => {
    const opts = [{ value: "", label: "All communities" }];

    if (groupedMobileCommunities.mine.length > 0) {
      groupedMobileCommunities.mine.forEach((c) => {
        opts.push({
          value: c._id,
          label: `My · ${c.name}`,
        });
      });
    }

    if (groupedMobileCommunities.explore.length > 0) {
      groupedMobileCommunities.explore.forEach((c) => {
        opts.push({
          value: c._id,
          label: `Explore · ${c.name}`,
        });
      });
    }

    return opts;
  }, [groupedMobileCommunities]);

  const handleMobileCommunityChange = (communityId) => {
    setMobileCommunityId(communityId);

    if (!communityId) {
      setSelectedCommunity(null);
      setSelectedSubcategory(null);
      return;
    }

    const chosen = displayedCommunities.find((c) => c._id === communityId);
    if (chosen) {
      setSelectedCommunity(chosen);
      setSelectedSubcategory(null);
    }
  };

  function renderReply(reply, threadId, depth = 0) {
    const isUpvoted = reply.upvotes?.some(
      (id) => id.toString() === (user?._id || user?.id)?.toString()
    );
    const isDownvoted = reply.downvotes?.some(
      (id) => id.toString() === (user?._id || user?.id)?.toString()
    );
    const replyKey = `${threadId}-${reply._id}`;

    return (
      <div
        key={reply._id}
        className="mt-3"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="bg-[#F5F5F5] rounded-lg border border-[#E8E8E8] p-4 hover:border-[#E8E8E8] transition-all">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 bg-[#2F3C96] rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0">
                {reply.authorUserId?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[#2F3C96]">
                    {reply.authorUserId?.username || "Anonymous"}
                  </span>
                  {reply.authorRole === "researcher" && (
                    <span className="px-1.5 py-0.5 bg-[#2F3C96]/10 text-[#2F3C96] rounded text-xs font-medium">
                      Researcher
                    </span>
                  )}
                  {reply.authorRole === "patient" && (
                    <span className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#787878] rounded text-xs font-medium border border-[#E8E8E8]">
                      Patient
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-[#787878] shrink-0">
              {new Date(reply.createdAt).toLocaleDateString()}
            </div>
          </div>

          <p className="text-sm text-[#787878] mb-3 leading-relaxed">
            {reply.body}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => voteOnReply(reply._id, "upvote")}
                className={`p-1 rounded transition-all ${
                  isUpvoted
                    ? "text-[#2F3C96]"
                    : "text-[#787878] hover:text-[#2F3C96]"
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <span
                className={`text-xs font-semibold min-w-[1.5rem] text-center ${
                  reply.voteScore > 0
                    ? "text-emerald-600"
                    : reply.voteScore < 0
                    ? "text-red-500"
                    : "text-[#787878]"
                }`}
              >
                {reply.voteScore || 0}
              </span>
              <button
                onClick={() => voteOnReply(reply._id, "downvote")}
                className={`p-1 rounded transition-all ${
                  isDownvoted
                    ? "text-red-500"
                    : "text-[#787878] hover:text-red-500"
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => {
                if (!user?._id && !user?.id) {
                  toast.error("Please sign in to reply");
                  return;
                }
                setReplyingTo(
                  replyingTo?.replyId === reply._id
                    ? null
                    : { threadId, replyId: reply._id }
                );
              }}
              className="flex items-center gap-1 text-xs text-[#2F3C96] hover:text-[#253075] font-medium transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Reply
            </button>
          </div>

          {replyingTo?.replyId === reply._id && user && (
            <div className="mt-3 pt-3 border-t border-[#E8E8E8]">
              <textarea
                value={replyBody[replyKey] || ""}
                onChange={(e) =>
                  setReplyBody((prev) => ({
                    ...prev,
                    [replyKey]: e.target.value,
                  }))
                }
                placeholder="Write a reply..."
                className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                rows="3"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => postReply(threadId, reply._id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  Reply
                </button>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="px-3 py-1.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {reply.children?.length > 0 && (
            <div className="mt-3 space-y-2">
              {reply.children.map((child) =>
                renderReply(child, threadId, depth + 1)
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const getTabTitle = () => {
    if (selectedCommunity) return selectedCommunity.name;
    switch (activeTab) {
      case "following":
        return "From Communities You Follow";
      case "forYou":
        return "Recommended For You";
      case "involving":
        return "Discussions Involving You";
      default:
        return "All Discussions";
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-fadeInUp { animation: fadeInUp 0.4s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .thread-expandable {
          overflow: hidden; max-height: 0; opacity: 0; padding-top: 0;
          transition: max-height 0.3s ease, opacity 0.2s ease, padding-top 0.3s ease;
        }
        .thread-expandable.expanded {
          max-height: 5000px; opacity: 1; padding-top: 1rem;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <Layout>
        <div className="min-h-screen bg-[#F5F5F5] relative">
          <AnimatedBackground />

          <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-7xl pb-12">
            {/* Compact Header */}
            <div className="text-center mb-6 animate-fade-in">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
                <AuroraText
                  speed={2.5}
                  colors={[
                    "#2F3C96",
                    "#474F97",
                    "#757BB1",
                    "#B8A5D5",
                    "#D0C4E2",
                  ]}
                >
                  Health Forums
                </AuroraText>
              </h1>
              <p className="text-sm text-slate-600">
                Join communities, ask questions and share experiences
              </p>
            </div>

            {/* Unified Control Bar - Layer 1: Global Controls */}
            <div className="max-w-7xl mx-auto mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3 flex-wrap shadow-lg animate-fade-in relative overflow-hidden">
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
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // Search will trigger automatically via useEffect with debounce
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchThreads();
                      }
                    }}
                    placeholder="Search discussions..."
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] text-base text-[#484848] placeholder-[#787878] focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        if (selectedCommunity) loadThreads();
                        else loadAllThreads();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#787878] hover:text-[#2F3C96] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-[#E8E8E8]" />

                {/* Filter Dropdown */}
                <div className="w-40 shrink-0">
                  <CustomSelect
                    value={activeTab}
                    onChange={(value) => {
                      setActiveTab(value);
                      setSelectedCommunity(null);
                    }}
                    options={[
                      { value: "all", label: "All" },
                      { value: "following", label: "Following" },
                      { value: "forYou", label: "For You" },
                      { value: "involving", label: "Your Posts" },
                    ]}
                    placeholder="Filter..."
                    className="w-full"
                  />
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-[#E8E8E8]" />

                {/* Sort Options - Segmented */}
                <div className="flex items-center gap-0 bg-[#F5F5F5] rounded-lg p-1 shrink-0 border border-[#E8E8E8]">
                  {["recent", "popular"].map((sort, idx) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        sortBy === sort
                          ? "bg-white text-[#2F3C96] shadow-sm"
                          : "text-[#787878] hover:text-[#484848]"
                      } ${idx === 0 ? "rounded-l-md" : ""} ${
                        idx === 2 ? "rounded-r-md" : ""
                      }`}
                    >
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Mobile Community Dropdown */}
                <div className="lg:hidden w-full sm:w-72">
                  <CustomSelect
                    value={mobileCommunityId}
                    onChange={handleMobileCommunityChange}
                    options={mobileCommunityOptions}
                    placeholder="All communities"
                    disabled={
                      loadingCommunities ||
                      sortedDisplayedCommunities.length === 0
                    }
                    className="w-full text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Main Content - Layer 2: Navigation, Layer 3: Content */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Communities Sidebar - Desktop - Layer 2: Navigation */}
              <div className="hidden lg:block lg:col-span-3">
                <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden sticky top-24 shadow-sm">
                  <div className="p-4 border-b border-[#E8E8E8]">
                    <h2 className="font-semibold text-[#2F3C96] text-sm">
                      Communities
                    </h2>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto hide-scrollbar">
                    {loadingCommunities ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 text-[#2F3C96] spinner" />
                      </div>
                    ) : displayedCommunities.length > 0 ? (
                      <div>
                        {/* My Communities Section */}
                        {displayedCommunities.filter((c) =>
                          followingIds.has(c._id)
                        ).length > 0 && (
                          <div className="p-3 border-b border-[#F5F5F5]">
                            <div className="flex items-center gap-2 mb-2 px-2">
                              <Star className="w-3.5 h-3.5 text-[#787878]" />
                              <span className="text-xs font-semibold text-[#787878] uppercase tracking-wide">
                                My Communities
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {displayedCommunities
                                .filter((c) => followingIds.has(c._id))
                                .map((community) => (
                                  <button
                                    key={community._id}
                                    onMouseEnter={() =>
                                      setHoveredCommunity(community._id)
                                    }
                                    onMouseLeave={() =>
                                      setHoveredCommunity(null)
                                    }
                                    onClick={() => {
                                      setSelectedCommunity(
                                        selectedCommunity?._id === community._id
                                          ? null
                                          : community
                                      );
                                    }}
                                    className={`w-full p-2.5 text-left rounded-lg transition-all group ${
                                      selectedCommunity?._id === community._id
                                        ? "bg-[#2F3C96]/5 border-l-2 border-[#2F3C96]"
                                        : "hover:bg-[#F5F5F5]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                                        style={{
                                          backgroundColor: `${community.color}15`,
                                        }}
                                      >
                                        <CommunityIcon
                                          community={community}
                                          size="1rem"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <h3 className="font-medium text-[#2F3C96] text-sm truncate">
                                            {community.name}
                                          </h3>
                                          {community.isOfficial && (
                                            <CheckCircle2 className="w-3 h-3 text-[#2F3C96] shrink-0" />
                                          )}
                                        </div>
                                        <div className="text-xs text-[#787878] mt-0.5">
                                          {community.memberCount?.toLocaleString() ||
                                            0}{" "}
                                          members
                                        </div>
                                      </div>
                                      {(hoveredCommunity === community._id ||
                                        selectedCommunity?._id ===
                                          community._id) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFollow(community._id);
                                          }}
                                          disabled={followingLoading.has(
                                            community._id
                                          )}
                                          className={`shrink-0 p-1 rounded text-xs transition-all ${
                                            followingIds.has(community._id)
                                              ? "text-[#2F3C96] hover:bg-[#2F3C96]/10"
                                              : "text-[#787878] hover:text-[#2F3C96]"
                                          }`}
                                        >
                                          {followingLoading.has(
                                            community._id
                                          ) ? (
                                            <Loader2 className="w-3 h-3 spinner" />
                                          ) : followingIds.has(
                                              community._id
                                            ) ? (
                                            <UserCheck className="w-3.5 h-3.5" />
                                          ) : (
                                            <Plus className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Explore Section */}
                        {displayedCommunities.filter(
                          (c) => !followingIds.has(c._id)
                        ).length > 0 && (
                          <div className="p-3">
                            <button
                              onClick={() =>
                                setIsExploreCollapsed(!isExploreCollapsed)
                              }
                              className="flex items-center justify-between w-full gap-2 mb-2 px-2 hover:bg-[#F5F5F5] rounded-lg py-1 transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <Compass className="w-3.5 h-3.5 text-[#787878]" />
                                <span className="text-xs font-semibold text-[#787878] uppercase tracking-wide">
                                  Explore
                                </span>
                              </div>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-[#787878] transition-transform ${
                                  isExploreCollapsed ? "" : "rotate-180"
                                }`}
                              />
                            </button>
                            {!isExploreCollapsed && (
                              <div className="space-y-0.5">
                                {displayedCommunities
                                  .filter((c) => !followingIds.has(c._id))
                                  .map((community) => (
                                    <button
                                      key={community._id}
                                      onMouseEnter={() =>
                                        setHoveredCommunity(community._id)
                                      }
                                      onMouseLeave={() =>
                                        setHoveredCommunity(null)
                                      }
                                      onClick={() => {
                                        setSelectedCommunity(
                                          selectedCommunity?._id ===
                                            community._id
                                            ? null
                                            : community
                                        );
                                      }}
                                      className={`w-full p-2.5 text-left rounded-lg transition-all group ${
                                        selectedCommunity?._id === community._id
                                          ? "bg-[#2F3C96]/5 border-l-2 border-[#2F3C96]"
                                          : "hover:bg-[#F5F5F5]"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div
                                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                                          style={{
                                            backgroundColor: `${community.color}15`,
                                          }}
                                        >
                                          <CommunityIcon
                                            community={community}
                                            size="1rem"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <h3 className="font-medium text-[#2F3C96] text-sm truncate">
                                              {community.name}
                                            </h3>
                                            {community.isOfficial && (
                                              <CheckCircle2 className="w-3 h-3 text-[#2F3C96] shrink-0" />
                                            )}
                                          </div>
                                          {(hoveredCommunity ===
                                            community._id ||
                                            selectedCommunity?._id ===
                                              community._id) && (
                                            <div className="text-xs text-[#787878] mt-0.5">
                                              {community.memberCount?.toLocaleString() ||
                                                0}{" "}
                                              members
                                            </div>
                                          )}
                                        </div>
                                        {(hoveredCommunity === community._id ||
                                          selectedCommunity?._id ===
                                            community._id) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleFollow(community._id);
                                            }}
                                            disabled={followingLoading.has(
                                              community._id
                                            )}
                                            className={`shrink-0 p-1 rounded text-xs transition-all ${
                                              followingIds.has(community._id)
                                                ? "text-[#2F3C96] hover:bg-[#2F3C96]/10"
                                                : "text-[#787878] hover:text-[#2F3C96]"
                                            }`}
                                          >
                                            {followingLoading.has(
                                              community._id
                                            ) ? (
                                              <Loader2 className="w-3 h-3 spinner" />
                                            ) : followingIds.has(
                                                community._id
                                              ) ? (
                                              <UserCheck className="w-3.5 h-3.5" />
                                            ) : (
                                              <Plus className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4">
                        <Users className="w-8 h-8 text-[#D0C4E2] mx-auto mb-2" />
                        <p className="text-[#787878] text-xs">
                          No communities found
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Threads Panel - Layer 3: Content */}
              <div className="lg:col-span-9">
                {/* Selected Community Header - Simplified */}
                {selectedCommunity && (
                  <div className="bg-white rounded-xl border border-[#E8E8E8] p-4 mb-6 shadow-sm">
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-bold text-[#2F3C96]">
                            {selectedCommunity.name}
                          </h2>
                          {selectedCommunity.isOfficial && (
                            <CheckCircle2 className="w-4 h-4 text-[#2F3C96]" />
                          )}
                        </div>
                        <p className="text-sm text-[#787878] line-clamp-1">
                          {selectedCommunity.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCommunity(null);
                            setSelectedSubcategory(null);
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#F5F5F5] text-[#787878] hover:bg-[#E8E8E8] transition-all"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => toggleFollow(selectedCommunity._id)}
                          disabled={followingLoading.has(selectedCommunity._id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            followingIds.has(selectedCommunity._id)
                              ? "bg-[#2F3C96]/10 text-[#2F3C96] hover:bg-[#2F3C96]/20"
                              : "bg-[#2F3C96] text-white hover:bg-[#253075]"
                          }`}
                        >
                          {followingLoading.has(selectedCommunity._id) ? (
                            <Loader2 className="w-4 h-4 spinner" />
                          ) : followingIds.has(selectedCommunity._id) ? (
                            <>
                              <UserCheck className="w-4 h-4" />
                              Joined
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Join
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Condition Tags Section */}
                    <div className="border-t border-[#E8E8E8] pt-4">
                      <h3 className="text-sm font-semibold text-[#2F3C96] mb-3 flex items-center gap-2">
                        <IconRibbonHealth className="w-4 h-4" />
                        Condition Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {conditionTagOptions.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedConditionTag(tag)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              selectedConditionTag === tag
                                ? "bg-[#2F3C96] text-white"
                                : "bg-[#F5F5F5] text-[#787878] hover:bg-[#E8E8E8]"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[#787878] mt-2">
                        Narrow discussions to the condition that best matches
                        your situation.
                      </p>
                    </div>

                    {/* Subcategories Section */}
                    {loadingSubcategories ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-[#2F3C96] spinner" />
                      </div>
                    ) : subcategories.length > 0 ? (
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold text-[#2F3C96] mb-3 flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Subcategories
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedSubcategory(null)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              !selectedSubcategory
                                ? "bg-[#2F3C96] text-white"
                                : "bg-[#F5F5F5] text-[#787878] hover:bg-[#E8E8E8]"
                            }`}
                          >
                            All
                          </button>
                          {subcategories.map((subcategory) => (
                            <button
                              key={subcategory._id}
                              onClick={() =>
                                setSelectedSubcategory(subcategory)
                              }
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                selectedSubcategory?._id === subcategory._id
                                  ? "bg-[#2F3C96] text-white"
                                  : "bg-[#F5F5F5] text-[#787878] hover:bg-[#E8E8E8]"
                              }`}
                            >
                              {subcategory.name}
                              {subcategory.threadCount > 0 && (
                                <span className="ml-2 text-xs opacity-75">
                                  ({subcategory.threadCount})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-[#E8E8E8] pt-4">
                        <p className="text-sm text-[#787878] text-center py-2">
                          No subcategories yet.{" "}
                          {user && "Click 'Add Subcategory' to create one."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Section Header - Bar Style */}
                <div className="bg-white rounded-lg border border-[#E8E8E8] px-4 py-3 mb-6 shadow-sm flex items-center gap-3">
                  <h3 className="text-base font-semibold text-[#2F3C96]">
                    {getTabTitle()}
                  </h3>
                  {user && (
                    <>
                      <span className="text-[#E8E8E8]">|</span>
                      <button
                        onClick={() => {
                          setModalSelectedCommunity(selectedCommunity);
                          setNewThreadConditions(
                            selectedConditionTag !== "All"
                              ? [selectedConditionTag]
                              : []
                          );
                          setNewThreadConditionInput("");
                          setConditionSuggestions(
                            buildConditionTags(selectedCommunity, threads)
                              .filter((tag) => tag !== "All")
                              .slice(0, 6)
                          );
                          setNewThreadModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#2F3C96] text-white rounded-lg font-semibold text-sm hover:bg-[#253075] transition-all shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Post</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Threads List - Layer 3: Content */}
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-[#E8E8E8] border-t-[#2F3C96] rounded-full spinner"></div>
                    </div>
                  </div>
                ) : threads.length > 0 ? (
                  <div className="space-y-4">
                    {threads.map((thread, idx) => {
                      const isUpvoted = thread.upvotes?.some(
                        (id) =>
                          id.toString() === (user?._id || user?.id)?.toString()
                      );
                      const isDownvoted = thread.downvotes?.some(
                        (id) =>
                          id.toString() === (user?._id || user?.id)?.toString()
                      );
                      const isExpanded = expandedThreadIds.has(thread._id);
                      const threadDetails = expandedThreads[thread._id];
                      const communityInfo =
                        thread.communityId || thread.categoryId;

                      return (
                        <div
                          key={thread._id}
                          className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden relative ${
                            isExpanded
                              ? "shadow-md border-[#2F3C96]/20"
                              : "border-[#E8E8E8] hover:shadow-md hover:border-[#E8E8E8]"
                          }`}
                        >
                          {/* Favorite Button - Top Right */}
                          {user && (
                            <button
                              onClick={() =>
                                toggleFavorite(thread._id, "thread")
                              }
                              disabled={favoritingItems.has(thread._id)}
                              className={`absolute top-4 right-4 p-2 rounded-lg transition-all z-10 ${
                                favorites.some(
                                  (fav) =>
                                    fav.itemId === thread._id &&
                                    fav.itemType === "thread"
                                )
                                  ? "text-red-500 bg-red-50 hover:bg-red-100"
                                  : "text-[#787878] hover:text-red-500 hover:bg-red-50"
                              }`}
                            >
                              {favoritingItems.has(thread._id) ? (
                                <Loader2 className="w-4 h-4 spinner" />
                              ) : (
                                <Heart
                                  className={`w-4 h-4 ${
                                    favorites.some(
                                      (fav) =>
                                        fav.itemId === thread._id &&
                                        fav.itemType === "thread"
                                    )
                                      ? "fill-current"
                                      : ""
                                  }`}
                                />
                              )}
                            </button>
                          )}
                          <div className="p-6">
                            <div className="flex items-start gap-4">
                              {/* Vote Controls - Simplified */}
                              <div className="flex flex-col items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() =>
                                    voteOnThread(thread._id, "upvote")
                                  }
                                  className={`p-1 rounded transition-all ${
                                    isUpvoted
                                      ? "text-[#2F3C96]"
                                      : "text-[#787878] hover:text-[#2F3C96]"
                                  }`}
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <span
                                  className={`text-xs font-semibold min-w-[1.5rem] text-center ${
                                    thread.voteScore > 0
                                      ? "text-emerald-600"
                                      : thread.voteScore < 0
                                      ? "text-red-500"
                                      : "text-[#787878]"
                                  }`}
                                >
                                  {thread.voteScore || 0}
                                </span>
                                <button
                                  onClick={() =>
                                    voteOnThread(thread._id, "downvote")
                                  }
                                  className={`p-1 rounded transition-all ${
                                    isDownvoted
                                      ? "text-red-500"
                                      : "text-[#787878] hover:text-red-500"
                                  }`}
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Thread Content */}
                              <div className="flex-1 min-w-0 pr-12">
                                <h3
                                  className="text-lg font-bold text-[#2F3C96] cursor-pointer hover:text-[#253075] transition-colors mb-2 leading-tight"
                                  onClick={() => toggleThread(thread._id)}
                                >
                                  {thread.title}
                                </h3>

                                {/* Thread Body Preview - Lighter */}
                                <p className="text-sm text-[#787878] leading-relaxed mb-3 line-clamp-2">
                                  {thread.body}
                                </p>

                                {thread.conditions?.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {thread.conditions.map((condition, idx) => (
                                      <span
                                        key={condition + idx}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2F3C96]/10 text-[#2F3C96] rounded-full text-xs font-medium"
                                      >
                                        <IconRibbonHealth className="w-3 h-3" />
                                        {condition}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Meta Info - Single Muted Line with Icons */}
                                <div className="flex items-center gap-3 text-xs text-[#787878] mb-3 flex-wrap">
                                  {communityInfo && (
                                    <span className="flex items-center gap-1 font-medium">
                                      <Tag className="w-3 h-3" />
                                      {communityInfo.name}
                                    </span>
                                  )}
                                  {communityInfo && <span>·</span>}
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {thread.authorUserId?.username ||
                                      "Anonymous"}
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(
                                      thread.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    {thread.replyCount || 0}
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {thread.viewCount || 0}
                                  </span>
                                </div>

                                {/* Actions Row */}
                                <div className="flex items-center gap-3">
                                  {/* Expand/Collapse - With Icons */}
                                  {!isExpanded ? (
                                    <button
                                      onClick={() => toggleThread(thread._id)}
                                      className="flex items-center gap-2 text-sm text-[#2F3C96] hover:text-[#253075] font-medium transition-colors group"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                      <span>
                                        {thread.replyCount || 0} replies
                                      </span>
                                      <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => toggleThread(thread._id)}
                                      className="flex items-center gap-2 text-sm text-[#2F3C96] hover:text-[#253075] font-medium transition-colors group"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                      <span>
                                        {thread.replyCount || 0} replies
                                      </span>
                                      <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                    </button>
                                  )}
                                </div>

                                {/* Expanded Replies Section */}
                                {isExpanded && (
                                  <div className="thread-expandable expanded border-t border-[#E8E8E8] pt-4 mt-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="flex items-center gap-2 font-semibold text-sm text-[#2F3C96]">
                                        <MessageCircle className="w-4 h-4" />
                                        <span>
                                          {threadDetails?.replies?.length ||
                                            thread.replyCount ||
                                            0}{" "}
                                          Replies
                                        </span>
                                      </h4>
                                      <button
                                        onClick={() => toggleThread(thread._id)}
                                        className="flex items-center gap-1.5 text-xs text-[#787878] hover:text-[#2F3C96] font-medium transition-colors group"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                                        <span>Collapse</span>
                                      </button>
                                    </div>

                                    {loadingThreadDetails.has(thread._id) ? (
                                      <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-[#2F3C96] spinner" />
                                      </div>
                                    ) : threadDetails?.replies?.length > 0 ? (
                                      <div className="space-y-3">
                                        {threadDetails.replies.map((reply) =>
                                          renderReply(reply, thread._id, 0)
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <MessageCircle className="w-10 h-10 mx-auto mb-2 text-[#D0C4E2]" />
                                        <p className="text-sm text-[#787878]">
                                          No replies yet. Be the first to reply!
                                        </p>
                                      </div>
                                    )}

                                    {/* Reply Form */}
                                    {user && (
                                      <div className="mt-4 pt-4 border-t border-[#E8E8E8]">
                                        {replyingTo?.threadId === thread._id &&
                                        !replyingTo?.replyId ? (
                                          <div>
                                            <textarea
                                              value={
                                                replyBody[
                                                  `${thread._id}-root`
                                                ] || ""
                                              }
                                              onChange={(e) =>
                                                setReplyBody((prev) => ({
                                                  ...prev,
                                                  [`${thread._id}-root`]:
                                                    e.target.value,
                                                }))
                                              }
                                              placeholder="Write a reply..."
                                              className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                                              rows="3"
                                            />
                                            <div className="flex gap-2 mt-3">
                                              <button
                                                onClick={() =>
                                                  postReply(thread._id)
                                                }
                                                className="flex items-center gap-2 px-3 py-1.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all"
                                              >
                                                <Send className="w-3.5 h-3.5" />
                                                Reply
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setReplyingTo(null)
                                                }
                                                className="px-3 py-1.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              setReplyingTo({
                                                threadId: thread._id,
                                                replyId: null,
                                              })
                                            }
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F5F5F5] border border-[#E8E8E8] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] hover:text-[#2F3C96] transition-all w-full"
                                          >
                                            <MessageCircle className="w-4 h-4" />
                                            Add a reply
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#E8E8E8] p-12 text-center shadow-sm">
                    <MessageCircle className="w-12 h-12 text-[#D0C4E2] mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-[#2F3C96] mb-2">
                      {activeTab === "following" && !selectedCommunity
                        ? "No Posts from Followed Communities"
                        : activeTab === "forYou"
                        ? "No Recommendations Yet"
                        : activeTab === "involving"
                        ? "No Posts Involving You"
                        : "No Discussions Yet"}
                    </h3>
                    <p className="text-[#787878] max-w-md mx-auto text-sm">
                      {activeTab === "following" && !selectedCommunity
                        ? "Join some communities to see posts in your feed!"
                        : activeTab === "forYou"
                        ? "Complete your profile to get personalized recommendations."
                        : selectedCommunity && user
                        ? "Be the first to start a discussion!"
                        : "Select a community to view or start discussions."}
                    </p>
                    {user && selectedCommunity && (
                      <button
                        onClick={() => {
                          setModalSelectedCommunity(selectedCommunity);
                          setNewThreadConditions(
                            selectedConditionTag !== "All"
                              ? [selectedConditionTag]
                              : []
                          );
                          setNewThreadConditionInput("");
                          setConditionSuggestions(
                            buildConditionTags(selectedCommunity, threads)
                              .filter((tag) => tag !== "All")
                              .slice(0, 6)
                          );
                          setNewThreadModal(true);
                        }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#2F3C96] text-white rounded-lg font-semibold hover:bg-[#253075] transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Start Discussion
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* New Subcategory Modal */}
            {newSubcategoryModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
                  <div className="p-5 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#2F3C96]">
                        Create New Subcategory
                      </h2>
                      <button
                        onClick={() => {
                          setNewSubcategoryModal(false);
                          setNewSubcategoryName("");
                          setNewSubcategoryDescription("");
                          setNewSubcategoryTags([]);
                          setMeshInput("");
                          setMeshSuggestions([]);
                        }}
                        className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {selectedCommunity && (
                      <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-lg border border-[#E8E8E8]">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                          style={{
                            backgroundColor: `${selectedCommunity.color}15`,
                          }}
                        >
                          <CommunityIcon
                            community={selectedCommunity}
                            size="1.25rem"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-[#787878]">Creating in</p>
                          <p className="font-medium text-[#2F3C96]">
                            {selectedCommunity.name}
                          </p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Subcategory Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        placeholder="e.g., Breast Cancer, Anxiety, Type 1 Diabetes"
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                      />
                      <p className="text-xs text-[#787878] mt-1">
                        The system will check if a similar subcategory already
                        exists
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={newSubcategoryDescription}
                        onChange={(e) =>
                          setNewSubcategoryDescription(e.target.value)
                        }
                        placeholder="Brief description of this subcategory..."
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Tags (MeSH Terminology)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={meshInput}
                          onChange={(e) => setMeshInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              meshInput.trim() &&
                              !meshSuggestions.length
                            ) {
                              e.preventDefault();
                              if (
                                !newSubcategoryTags.includes(meshInput.trim())
                              ) {
                                setNewSubcategoryTags([
                                  ...newSubcategoryTags,
                                  meshInput.trim(),
                                ]);
                                setMeshInput("");
                              }
                            }
                          }}
                          placeholder="Type to search MeSH terms (e.g., treatment, therapy, diagnosis)..."
                          className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                        />
                        {meshSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-[#E8E8E8] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {meshSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (
                                    !newSubcategoryTags.includes(suggestion)
                                  ) {
                                    setNewSubcategoryTags([
                                      ...newSubcategoryTags,
                                      suggestion,
                                    ]);
                                  }
                                  setMeshInput("");
                                  setMeshSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-[#484848] hover:bg-[#F5F5F5] transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#787878] mt-1">
                        Use MeSH terms for better recommendations (e.g.,
                        Treatment, Therapy, Diagnosis)
                      </p>
                      {newSubcategoryTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {newSubcategoryTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#2F3C96]/10 text-[#2F3C96] rounded-lg text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() =>
                                  setNewSubcategoryTags(
                                    newSubcategoryTags.filter(
                                      (_, i) => i !== idx
                                    )
                                  )
                                }
                                className="hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={createSubcategory}
                        disabled={!newSubcategoryName.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Create Subcategory
                      </button>
                      <button
                        onClick={() => {
                          setNewSubcategoryModal(false);
                          setNewSubcategoryName("");
                          setNewSubcategoryDescription("");
                          setNewSubcategoryTags([]);
                          setMeshInput("");
                          setMeshSuggestions([]);
                        }}
                        className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* New Thread Modal */}
            {newThreadModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E8E8]">
                  <div className="p-5 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#2F3C96]">
                        New Discussion
                      </h2>
                      <button
                        onClick={() => {
                          setNewThreadModal(false);
                          setNewThreadTitle("");
                          setNewThreadBody("");
                          setNewThreadSubcategory(null);
                          setNewThreadTags([]);
                          setNewThreadConditions([]);
                          setNewThreadConditionInput("");
                          setConditionSuggestions([]);
                          setNewThreadMeshInput("");
                          setNewThreadMeshSuggestions([]);
                          setModalSelectedCommunity(null);
                        }}
                        className="p-2 text-[#787878] hover:text-[#2F3C96] hover:bg-[#F5F5F5] rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {modalSelectedCommunity ? (
                      <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-lg border border-[#E8E8E8]">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                          style={{
                            backgroundColor: `${modalSelectedCommunity.color}15`,
                          }}
                        >
                          <CommunityIcon
                            community={modalSelectedCommunity}
                            size="1.25rem"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-[#787878]">Posting in</p>
                          <p className="font-medium text-[#2F3C96]">
                            {modalSelectedCommunity.name}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setModalSelectedCommunity(null);
                            setNewThreadSubcategory(null);
                          }}
                          className="text-xs text-[#787878] hover:text-[#2F3C96] transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                          Select Community
                        </label>
                        <CustomSelect
                          value={modalSelectedCommunity?._id || ""}
                          onChange={(value) => {
                            const community = communities.find(
                              (c) => c._id === value
                            );
                            setModalSelectedCommunity(community);
                            setNewThreadSubcategory(null);
                            setNewThreadConditions(
                              selectedConditionTag !== "All" && community
                                ? [selectedConditionTag]
                                : []
                            );
                            setNewThreadConditionInput("");
                            setConditionSuggestions(
                              buildConditionTags(community, threads)
                                .filter((tag) => tag !== "All")
                                .slice(0, 6)
                            );
                          }}
                          options={communities
                            .filter((c) => followingIds.has(c._id))
                            .map((c) => ({
                              value: c._id,
                              label: c.name,
                            }))}
                          placeholder="Select from your joined communities..."
                          className="w-full"
                        />
                        {communities.filter((c) => followingIds.has(c._id))
                          .length === 0 && (
                          <p className="text-xs text-[#787878] mt-2">
                            You haven't joined any communities yet. Join a
                            community to create a post.
                          </p>
                        )}
                      </div>
                    )}
                    {modalSelectedCommunity &&
                      modalSubcategories.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                            Subcategory (Optional)
                          </label>
                          <CustomSelect
                            value={newThreadSubcategory?._id || ""}
                            onChange={(value) => {
                              const subcategory = modalSubcategories.find(
                                (s) => s._id === value
                              );
                              setNewThreadSubcategory(subcategory || null);
                            }}
                            options={[
                              { value: "", label: "None (All Subcategories)" },
                              ...modalSubcategories.map((s) => ({
                                value: s._id,
                                label: s.name,
                              })),
                            ]}
                            placeholder="Select a subcategory..."
                            className="w-full"
                          />
                        </div>
                      )}
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Condition Tags (disease/condition)
                      </label>
                      <p className="text-xs text-[#787878] mb-2">
                        Add the condition this discussion is about so advice is
                        tailored.
                      </p>
                      {newThreadConditions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {newThreadConditions.map((condition, idx) => (
                            <span
                              key={condition + idx}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#2F3C96]/10 text-[#2F3C96] rounded-lg text-xs font-medium"
                            >
                              {condition}
                              <button
                                onClick={() =>
                                  setNewThreadConditions(
                                    newThreadConditions.filter(
                                      (_, i) => i !== idx
                                    )
                                  )
                                }
                                className="hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="relative" ref={conditionSuggestionsRef}>
                        <input
                          type="text"
                          value={newThreadConditionInput}
                          onChange={(e) => updateConditionSuggestions(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              newThreadConditionInput.trim()
                            ) {
                              e.preventDefault();
                              addConditionTag(newThreadConditionInput);
                            }
                            if (e.key === "Escape") {
                              setConditionSuggestions([]);
                            }
                          }}
                          onFocus={() => {
                            if (newThreadConditionInput.trim()) {
                              updateConditionSuggestions(newThreadConditionInput);
                            } else {
                              setConditionSuggestions(
                                modalConditionOptions.slice(0, 6)
                              );
                            }
                          }}
                          placeholder="e.g., Parkinson's, Breast Cancer, Heart Disease"
                          className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                        />
                        {conditionSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full bottom-full mb-1 bg-white border border-[#E8E8E8] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {conditionSuggestions.map((suggestion, idx) => (
                              <button
                                key={suggestion + idx}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addConditionTag(suggestion);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-[#484848] hover:bg-[#F5F5F5] transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newThreadTitle}
                        onChange={(e) => setNewThreadTitle(e.target.value)}
                        placeholder="What would you like to discuss?"
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Content
                      </label>
                      <textarea
                        value={newThreadBody}
                        onChange={(e) => setNewThreadBody(e.target.value)}
                        placeholder="Share your thoughts, questions, or experiences..."
                        className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] resize-none text-[#484848] placeholder-[#787878]"
                        rows="6"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2F3C96] mb-2">
                        Tags
                      </label>
                      <div className="relative" ref={tagSuggestionsRef}>
                        <input
                          type="text"
                          value={newThreadMeshInput}
                          onChange={(e) => {
                            setNewThreadMeshInput(e.target.value);
                            if (e.target.value.trim()) {
                              fetchThreadTagSuggestions(e.target.value);
                            } else {
                              setNewThreadMeshSuggestions([]);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              newThreadMeshInput.trim()
                            ) {
                              e.preventDefault();
                              if (
                                !newThreadTags.includes(
                                  newThreadMeshInput.trim()
                                )
                              ) {
                                setNewThreadTags([
                                  ...newThreadTags,
                                  newThreadMeshInput.trim(),
                                ]);
                                setNewThreadMeshInput("");
                                setNewThreadMeshSuggestions([]);
                              }
                            }
                            if (e.key === "Escape") {
                              setNewThreadMeshSuggestions([]);
                            }
                          }}
                          onFocus={() => {
                            if (newThreadMeshInput.trim()) {
                              fetchThreadTagSuggestions(newThreadMeshInput);
                            }
                          }}
                          placeholder="Add tags (e.g., Treatment, Therapy, Diagnosis)..."
                          className="w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F3C96]/20 focus:border-[#2F3C96] text-[#484848] placeholder-[#787878]"
                        />
                        {newThreadMeshSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full bottom-full mb-1 bg-white border border-[#E8E8E8] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {newThreadMeshSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!newThreadTags.includes(suggestion)) {
                                    setNewThreadTags([
                                      ...newThreadTags,
                                      suggestion,
                                    ]);
                                  }
                                  setNewThreadMeshInput("");
                                  setNewThreadMeshSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-[#484848] hover:bg-[#F5F5F5] transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#787878] mt-1">
                        Add tags for better organization (e.g., Treatment,
                        Therapy, Diagnosis)
                      </p>
                      {newThreadTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {newThreadTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#2F3C96]/10 text-[#2F3C96] rounded-lg text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() =>
                                  setNewThreadTags(
                                    newThreadTags.filter((_, i) => i !== idx)
                                  )
                                }
                                className="hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={postThread}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-[#253075] transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Post Discussion
                      </button>
                      <button
                        onClick={() => {
                          setNewThreadModal(false);
                          setNewThreadTitle("");
                          setNewThreadBody("");
                          setNewThreadSubcategory(null);
                          setNewThreadTags([]);
                          setNewThreadConditions([]);
                          setNewThreadConditionInput("");
                          setConditionSuggestions([]);
                          setNewThreadMeshInput("");
                          setNewThreadMeshSuggestions([]);
                          setModalSelectedCommunity(null);
                        }}
                        className="px-6 py-2.5 bg-[#F5F5F5] text-[#787878] rounded-lg text-sm font-medium hover:bg-[#E8E8E8] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
