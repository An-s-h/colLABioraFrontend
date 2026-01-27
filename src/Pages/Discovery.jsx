"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  X,
  Loader2,
  User,
  CheckCircle2,
  Globe,
  Tag,
  Sparkles,
  Home,
  Bell,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Video,
  Upload,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import CustomSelect from "../components/ui/CustomSelect.jsx";
import { AuroraText } from "../components/ui/aurora-text.js";
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

  const IconComponent =
    iconMap[slug] ||
    iconMap[name?.toLowerCase().replace(/\s+/g, "-")] ||
    IconStethoscope;
  return IconComponent;
};

// Community Icon Component
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


export default function Discovery() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedPostType, setSelectedPostType] = useState("patient"); // "patient" or "researcher"
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerContent, setComposerContent] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [composerPostType, setComposerPostType] = useState(() => {
    // Set initial post type based on user role
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    return userData?.role === "researcher" ? "researcher" : "patient";
  });
  const [composerCommunity, setComposerCommunity] = useState(null);
  const [composerSubcategory, setComposerSubcategory] = useState(null);
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [followingCommunities, setFollowingCommunities] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set()); // Track which posts have comments expanded
  const [comments, setComments] = useState({}); // Store comments by postId
  const [loadingComments, setLoadingComments] = useState({}); // Track loading state per post
  const [commentInputs, setCommentInputs] = useState({}); // Store comment input text by postId
  const [submittingComment, setSubmittingComment] = useState({}); // Track submitting state per post
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const loadingPostsRef = useRef(false); // Prevent multiple simultaneous loads

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
    // Set composer post type based on user role - ensure it always matches
    if (userData?.role) {
      const correctPostType = userData.role === "researcher" ? "researcher" : "patient";
      setComposerPostType(correctPostType);
    }
    loadCommunities();
    loadPosts();
  }, []);

  useEffect(() => {
    // Reset and load posts when post type changes
    // Use the current selectedPostType value directly
    loadPosts(true, selectedPostType);
  }, [selectedPostType]);

  // Ensure composerPostType always matches user role
  useEffect(() => {
    if (user?.role) {
      const correctPostType = user.role === "researcher" ? "researcher" : "patient";
      if (composerPostType !== correctPostType) {
        setComposerPostType(correctPostType);
      }
    }
  }, [user?.role, composerPostType]);

  useEffect(() => {
    if (composerCommunity) {
      loadSubcategories(composerCommunity._id);
    } else {
      setSubcategories([]);
      setComposerSubcategory(null);
    }
  }, [composerCommunity]);

  async function loadCommunities() {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);

      const response = await fetch(`${base}/api/communities?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch communities");
      const data = await response.json();
      setCommunities(data.communities || []);
      
      // Load following communities if user is logged in
      if (userId) {
        loadFollowingCommunities(userId);
      }
    } catch (error) {
      console.error("Error loading communities:", error);
      toast.error("Failed to load communities");
    }
  }

  async function loadFollowingCommunities(userId) {
    try {
      const response = await fetch(`${base}/api/communities/user/${userId}/following`);
      if (response.ok) {
        const data = await response.json();
        setFollowingCommunities(data.communities || []);
      }
    } catch (error) {
      console.error("Error loading following communities:", error);
    }
  }

  async function loadSubcategories(communityId) {
    if (!communityId) return;
    setLoadingSubcategories(true);
    try {
      const response = await fetch(`${base}/api/communities/${communityId}/subcategories`);
      if (!response.ok) throw new Error("Failed to fetch subcategories");
      const data = await response.json();
      setSubcategories(data.subcategories || []);
    } catch (error) {
      console.error("Error loading subcategories:", error);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function loadPosts(reset = false, postType = null) {
    // Prevent multiple simultaneous calls
    if (loadingPostsRef.current) {
      return;
    }

    loadingPostsRef.current = true;

    if (reset) {
      setPage(1);
      setPosts([]);
    }

    const currentPage = reset ? 1 : page;
    // Use provided postType or fall back to current selectedPostType state
    const postTypeToUse = postType !== null ? postType : selectedPostType;
    setLoading(reset);
    setLoadingMore(!reset);

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      params.set("postType", postTypeToUse);
      params.set("page", currentPage.toString());
      params.set("pageSize", "20");
      if (userId) params.set("userId", userId);

      const response = await fetch(`${base}/api/posts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();

      const newPosts = data.posts || [];

      if (reset) {
        setPosts(newPosts);
      } else {
        // Deduplicate posts by _id to prevent duplicates
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p._id));
          const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(p._id));
          return [...prev, ...uniqueNewPosts];
        });
      }

      setHasMore(data.hasMore || false);
      if (!reset) setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingPostsRef.current = false;
    }
  }

  async function handleLike(postId, isLiked) {
    if (!user) {
      toast.error("Please sign in to like posts");
      navigate("/signin");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to toggle like");
      const data = await response.json();

      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, isLiked: data.isLiked, likeCount: data.likeCount }
            : post
        )
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to like post");
    }
  }

  async function handleDeletePost(postId) {
    if (!user) {
      toast.error("Please sign in to delete posts");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete post");
      }

      toast.success("Post deleted successfully");
      // Remove post from list
      setPosts((prev) => prev.filter((post) => post._id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error(error.message || "Failed to delete post");
    }
  }

  async function loadComments(postId) {
    if (loadingComments[postId]) return;

    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);

      const response = await fetch(`${base}/api/posts/${postId}/comments?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();

      setComments((prev) => ({
        ...prev,
        [postId]: data.comments || [],
      }));

      // Update reply count in post
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, replyCount: data.commentCount || 0 }
            : post
        )
      );
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleToggleComments(postId) {
    const isExpanded = expandedComments.has(postId);
    if (isExpanded) {
      // Collapse
      setExpandedComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      // Expand and load comments
      setExpandedComments((prev) => new Set(prev).add(postId));
      if (!comments[postId]) {
        await loadComments(postId);
      }
    }
  }

  async function handleSubmitComment(postId) {
    if (!user) {
      toast.error("Please sign in to comment");
      navigate("/signin");
      return;
    }

    const content = commentInputs[postId]?.trim();
    if (!content) {
      toast.error("Please enter a comment");
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create comment");
      }

      const data = await response.json();
      
      // Add comment to state
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data.comment],
      }));

      // Clear input
      setCommentInputs((prev) => {
        const newInputs = { ...prev };
        delete newInputs[postId];
        return newInputs;
      });

      // Update reply count
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, replyCount: (post.replyCount || 0) + 1 }
            : post
        )
      );

      toast.success("Comment added!");
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error(error.message || "Failed to create comment");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function handleLikeComment(postId, commentId, isLiked) {
    if (!user) {
      toast.error("Please sign in to like comments");
      navigate("/signin");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts/${postId}/comments/${commentId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to toggle like");
      const data = await response.json();

      // Update comment in state
      const updateCommentLikes = (commentList) => {
        return commentList.map((comment) => {
          if (comment._id === commentId) {
            return {
              ...comment,
              isLiked: data.isLiked,
              likeCount: data.likeCount,
            };
          }
          if (comment.children && comment.children.length > 0) {
            return {
              ...comment,
              children: updateCommentLikes(comment.children),
            };
          }
          return comment;
        });
      };

      setComments((prev) => ({
        ...prev,
        [postId]: updateCommentLikes(prev[postId] || []),
      }));
    } catch (error) {
      console.error("Error toggling comment like:", error);
      toast.error("Failed to like comment");
    }
  }

  async function uploadToBackend(files) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const token = localStorage.getItem("token");
    
    // Check if user is logged in
    if (!token) {
      toast.error("Please sign in to upload files");
      navigate("/signin");
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${base}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle token expiration
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.error("Session expired. Please sign in again.");
        navigate("/signin");
        throw new Error("Token expired");
      }
      
      throw new Error(error.error || "Upload failed");
    }

    const data = await response.json();
    return data.files;
  }

  async function handleFileUpload(event) {
    // Check if user is logged in
    if (!user) {
      toast.error("Please sign in to upload files");
      navigate("/signin");
      if (event.target) event.target.value = "";
      return;
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate file types
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      return isImage || isPDF;
    });

    if (validFiles.length === 0) {
      toast.error("Please select only images or PDF files");
      if (event.target) event.target.value = "";
      return;
    }

    if (validFiles.length < files.length) {
      toast.error("Some files were skipped. Only images and PDFs are allowed.");
    }

    setUploading(true);
    try {
      const uploadedFiles = await uploadToBackend(validFiles);
      setComposerAttachments((prev) => [...prev, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading files:", error);
      // Don't show error toast if it's a redirect (token expired/not authenticated)
      if (error.message !== "Token expired" && error.message !== "Not authenticated") {
        toast.error(error.message || "Failed to upload files");
      }
    } finally {
      setUploading(false);
      // Reset input
      if (event.target) event.target.value = "";
    }
  }

  function removeAttachment(index) {
    setComposerAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreatePost() {
    if (!user) {
      toast.error("Please sign in to create a post");
      navigate("/signin");
      return;
    }

    if (!composerContent.trim()) {
      toast.error("Please enter some content");
      return;
    }

    // Ensure postType matches user role - critical validation
    const finalPostType = user.role === "researcher" ? "researcher" : "patient";
    if (composerPostType !== finalPostType) {
      console.warn(`Post type mismatch: composerPostType=${composerPostType}, user.role=${user.role}. Correcting to ${finalPostType}`);
      setComposerPostType(finalPostType);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: composerContent,
          postType: finalPostType, // Use validated postType, not composerPostType
          communityId: composerCommunity?._id || null,
          subcategoryId: composerSubcategory?._id || null,
          attachments: composerAttachments,
          isOfficial: isOfficial && user.role === "researcher",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create post");
      }

      const data = await response.json();
      toast.success("Post created successfully!");

      // Reset composer
      setComposerContent("");
      setComposerAttachments([]);
      setComposerCommunity(null);
      setComposerSubcategory(null);
      setIsOfficial(false);
      setComposerOpen(false);

      // Reload posts
      loadPosts(true);
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(error.message || "Failed to create post");
    }
  }

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />

        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          {/* Header - Same style as Trials and Experts */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#2F3C96", "#474F97", "#757BB1", "#B8A5D5", "#D0C4E2"]}
              >
                Discovery
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600">
              Share your thoughts, experiences, and work
            </p>
          </div>

          {/* Sidebar and Discovery Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Only Post Filters */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {/* Post Filters - Collapsible */}
                <div>
                  <button
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <span className="font-semibold text-gray-900">Discovery Filters</span>
                    {filtersExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  {filtersExpanded && (
                    <div className="space-y-3">
                      {/* Patients */}
                      <button
                        onClick={() => {
                          if (selectedPostType !== "patient") {
                            setSelectedPostType("patient");
                            // Pass the new post type directly to avoid stale closure issue
                            loadPosts(true, "patient");
                          }
                        }}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          selectedPostType === "patient"
                            ? "border-[#2F3C96] bg-purple-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-purple-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className={`w-5 h-5 ${selectedPostType === "patient" ? "text-[#2F3C96]" : "text-gray-500"}`} />
                          <span className={`font-semibold ${selectedPostType === "patient" ? "text-[#2F3C96]" : "text-gray-700"}`}>
                            Patients
                          </span>
                          {selectedPostType === "patient" && (
                            <CheckCircle2 className="w-4 h-4 text-[#2F3C96] ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          Share your experiences and connect with others
                        </p>
                      </button>
                      
                      {/* Researchers */}
                      <button
                        onClick={() => {
                          if (selectedPostType !== "researcher") {
                            setSelectedPostType("researcher");
                            // Pass the new post type directly to avoid stale closure issue
                            loadPosts(true, "researcher");
                          }
                        }}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          selectedPostType === "researcher"
                            ? "border-[#2F3C96] bg-purple-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-purple-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className={`w-5 h-5 ${selectedPostType === "researcher" ? "text-[#2F3C96]" : "text-gray-500"}`} />
                          <span className={`font-semibold ${selectedPostType === "researcher" ? "text-[#2F3C96]" : "text-gray-700"}`}>
                            Researchers
                          </span>
                          {selectedPostType === "researcher" && (
                            <CheckCircle2 className="w-4 h-4 text-[#2F3C96] ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          Share your work, findings, and research
                        </p>
                      </button>

                      {/* Following Communities */}
                      <div className="border-t border-gray-200 pt-3">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Following Communities</h3>
                        {followingCommunities.length === 0 ? (
                          <p className="text-xs text-gray-500">No communities followed yet</p>
                        ) : (
                          <div className="space-y-2">
                            {followingCommunities.map((community) => (
                              <button
                                key={community._id}
                                onClick={() => {
                                  // Filter posts by community
                                  // You can implement this functionality later
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <CommunityIcon community={community} size="1rem" />
                                  <span className="text-sm font-medium text-gray-700 truncate">
                                    {community.name}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Central Feed */}
            <div className="lg:col-span-9">
              {/* Post Composer - Inline */}
              {user && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={composerContent}
                        onChange={(e) => setComposerContent(e.target.value)}
                        placeholder="What's on your mind? Share your thoughts, experiences, or research..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent resize-none mb-3 cursor-text"
                        rows={3}
                        onFocus={() => setComposerOpen(true)}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setComposerOpen(true);
                              setTimeout(() => imageInputRef.current?.click(), 100);
                            }}
                            className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors"
                            title="Add Image"
                          >
                            <ImageIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setComposerOpen(true)}
                            className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors"
                            title="Add Video"
                          >
                            <Video className="w-5 h-5" />
                          </button>
                          <button
                            className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors"
                            title="Upload"
                          >
                            <Upload className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors"
                            title="Attach File"
                          >
                            <Paperclip className="w-5 h-5" />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-[#2F3C96] hover:bg-gray-50 rounded-lg transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                        <button
                          onClick={handleCreatePost}
                          disabled={!composerContent.trim() || uploading}
                          className="px-6 py-2 bg-[#2F3C96] text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Discovery Feed */}
              {loading && posts.length === 0 ? (
                <div className="flex justify-center items-center py-12 bg-white rounded-xl border border-gray-200">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2F3C96]" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <p className="text-gray-600">No posts yet. Be the first to share!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post._id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
                    >
                  {/* Post Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      {/* Fallback avatar with first letter - always rendered */}
                      <div className="w-12 h-12 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-lg absolute inset-0">
                        <span>
                          {post.authorUserId?.username?.charAt(0)?.toUpperCase() || post.authorUserId?.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                      {/* Profile picture - overlays the fallback if available */}
                      {post.authorUserId?.picture && (
                        <img
                          src={post.authorUserId.picture}
                          alt={post.authorUserId.username}
                          className="w-12 h-12 rounded-full object-cover absolute inset-0"
                          onError={(e) => {
                            // Hide image on error to show fallback
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-semibold text-[#2F3C96]">
                            {post.authorUserId?.username || "Anonymous"}
                          </h3>
                          {post.isOfficial && (
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-sm text-gray-500">
                            · {formatTimeAgo(post.createdAt)}
                          </span>
                        </div>
                        {/* Delete button for post owner */}
                        {user && (user._id === post.authorUserId?._id || user.id === post.authorUserId?._id) && (
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                            title="Delete post"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {(post.communityId || post.subcategoryId) && (
                        <div className="flex items-center gap-2 text-sm text-brand-gray">
                          {post.communityId && (
                            <div className="flex items-center gap-1">
                              <CommunityIcon community={post.communityId} size="0.875rem" />
                              <span>{post.communityId.name}</span>
                            </div>
                          )}
                          {post.subcategoryId && (
                            <>
                              <span>·</span>
                              <span>{post.subcategoryId.name}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* Attachments */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="mb-4 space-y-3">
                      {post.attachments.map((att, idx) => (
                        <div key={idx} className="relative">
                          {att.type === "image" ? (
                            <div className="relative group">
                              <img
                                src={att.url}
                                alt={att.name || `Image ${idx + 1}`}
                                className="w-full max-h-96 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(att.url, '_blank')}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg pointer-events-none" />
                            </div>
                          ) : (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-brand-royal-blue/50 transition-all group"
                            >
                              <div className="w-12 h-12 bg-brand-royal-blue/10 rounded-lg flex items-center justify-center group-hover:bg-brand-royal-blue/20 transition-colors">
                                <FileText className="w-6 h-6 text-brand-royal-blue" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {att.name || "Document"}
                                </p>
                                {att.size && (
                                  <p className="text-xs text-gray-500">
                                    {(att.size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-brand-royal-blue font-medium">View</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                      {/* Post Actions */}
                      <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleLike(post._id, post.isLiked)}
                          className={`flex items-center gap-2 transition-colors ${
                            post.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${post.isLiked ? "fill-current" : ""}`} />
                          <span className="text-sm">{post.likeCount || 0}</span>
                        </button>
                        <button
                          onClick={() => handleToggleComments(post._id)}
                          className={`flex items-center gap-2 transition-colors ${
                            expandedComments.has(post._id)
                              ? "text-[#2F3C96]"
                              : "text-gray-500 hover:text-[#2F3C96]"
                          }`}
                        >
                          <MessageCircle className={`w-5 h-5 ${expandedComments.has(post._id) ? "fill-current" : ""}`} />
                          <span className="text-sm">{post.replyCount || 0}</span>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {expandedComments.has(post._id) && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {/* Comment Input */}
                          {user && (
                            <div className="mb-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                  {user?.username?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div className="flex-1">
                                  <textarea
                                    value={commentInputs[post._id] || ""}
                                    onChange={(e) =>
                                      setCommentInputs((prev) => ({
                                        ...prev,
                                        [post._id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Write a comment..."
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2F3C96] focus:border-transparent resize-none text-sm"
                                    rows={2}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        handleSubmitComment(post._id);
                                      }
                                    }}
                                  />
                                  <div className="flex justify-end mt-2">
                                    <button
                                      onClick={() => handleSubmitComment(post._id)}
                                      disabled={!commentInputs[post._id]?.trim() || submittingComment[post._id]}
                                      className="px-4 py-1.5 bg-[#2F3C96] text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                                    >
                                      {submittingComment[post._id] ? "Posting..." : "Post"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Comments List */}
                          {loadingComments[post._id] ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-[#2F3C96]" />
                            </div>
                          ) : comments[post._id] && comments[post._id].length > 0 ? (
                            <div className="space-y-4">
                              {comments[post._id].map((comment) => (
                                <div key={comment._id} className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                    {comment.authorUserId?.username?.charAt(0)?.toUpperCase() || "U"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-[#2F3C96]">
                                        {comment.authorUserId?.username || "Anonymous"}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatTimeAgo(comment.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                                    <button
                                      onClick={() => handleLikeComment(post._id, comment._id, comment.isLiked)}
                                      className={`flex items-center gap-1 text-xs transition-colors ${
                                        comment.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                                      }`}
                                    >
                                      <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-current" : ""}`} />
                                      <span>{comment.likeCount || 0}</span>
                                    </button>
                                    {/* Render nested comments */}
                                    {comment.children && comment.children.length > 0 && (
                                      <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                                        {comment.children.map((childComment) => (
                                          <div key={childComment._id} className="flex items-start gap-2">
                                            <div className="w-6 h-6 rounded-full bg-[#2F3C96] flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                                              {childComment.authorUserId?.username?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-[#2F3C96]">
                                                  {childComment.authorUserId?.username || "Anonymous"}
                                                </span>
                                                <span className="text-[10px] text-gray-500">
                                                  {formatTimeAgo(childComment.createdAt)}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-700 mb-1">{childComment.content}</p>
                                              <button
                                                onClick={() => handleLikeComment(post._id, childComment._id, childComment.isLiked)}
                                                className={`flex items-center gap-1 text-[10px] transition-colors ${
                                                  childComment.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                                                }`}
                                              >
                                                <Heart className={`w-3 h-3 ${childComment.isLiked ? "fill-current" : ""}`} />
                                                <span>{childComment.likeCount || 0}</span>
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No comments yet. Be the first to comment!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <button
                      onClick={() => loadPosts()}
                      disabled={loadingMore}
                      className="w-full py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#2F3C96]" />
                      ) : (
                        "Load More"
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Composer Modal */}
        {composerOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-brand-royal-blue">Create Post</h2>
                <button
                  onClick={() => setComposerOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Post Type Selector - Restricted by role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        if (user?.role === "patient") {
                          setComposerPostType("patient");
                        }
                      }}
                      disabled={user?.role !== "patient"}
                      className={`p-3 rounded-lg border-2 ${
                        composerPostType === "patient"
                          ? "border-brand-royal-blue bg-brand-purple/20"
                          : "border-gray-200"
                      } ${
                        user?.role !== "patient"
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-brand-royal-blue/50"
                      }`}
                    >
                      Patient Post
                      {user?.role !== "patient" && (
                        <span className="block text-xs text-gray-500 mt-1">
                          (Patients only)
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (user?.role === "researcher") {
                          setComposerPostType("researcher");
                        }
                      }}
                      disabled={user?.role !== "researcher"}
                      className={`p-3 rounded-lg border-2 ${
                        composerPostType === "researcher"
                          ? "border-brand-royal-blue bg-brand-purple/20"
                          : "border-gray-200"
                      } ${
                        user?.role !== "researcher"
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-brand-royal-blue/50"
                      }`}
                    >
                      Researcher Post
                      {user?.role !== "researcher" && (
                        <span className="block text-xs text-gray-500 mt-1">
                          (Researchers only)
                        </span>
                      )}
                    </button>
                  </div>
                  {user?.role && (
                    <p className="text-xs text-gray-500 mt-2">
                      You can only create {user.role} posts based on your role.
                    </p>
                  )}
                </div>

                {/* Community Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Community (Optional)
                  </label>
                  <CustomSelect
                    options={[
                      { value: "", label: "None" },
                      ...communities.map((c) => ({ value: c._id, label: c.name })),
                    ]}
                    value={composerCommunity?._id || ""}
                    onChange={(value) => {
                      const community = communities.find((c) => c._id === value);
                      setComposerCommunity(community || null);
                    }}
                  />
                </div>

                {/* Subcategory Selection */}
                {composerCommunity && subcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory (Optional)
                    </label>
                    <CustomSelect
                      options={[
                        { value: "", label: "None" },
                        ...subcategories.map((s) => ({ value: s._id, label: s.name })),
                      ]}
                      value={composerSubcategory?._id || ""}
                      onChange={(value) => {
                        const subcategory = subcategories.find((s) => s._id === value);
                        setComposerSubcategory(subcategory || null);
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={composerContent}
                    onChange={(e) => setComposerContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-royal-blue focus:border-transparent resize-none"
                    rows={6}
                  />
                </div>

                {/* Official Work Toggle (for researchers) */}
                {user?.role === "researcher" && composerPostType === "researcher" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isOfficial"
                      checked={isOfficial}
                      onChange={(e) => setIsOfficial(e.target.checked)}
                      className="w-4 h-4 text-brand-royal-blue border-gray-300 rounded focus:ring-brand-royal-blue"
                    />
                    <label htmlFor="isOfficial" className="text-sm text-gray-700">
                      Mark as Official Work
                    </label>
                  </div>
                )}

                {/* Attachments */}
                {composerAttachments.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Attachments
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {composerAttachments.map((att, idx) => (
                        <div key={idx} className="relative group">
                          {att.type === "image" ? (
                            <img
                              src={att.url}
                              alt={att.name || `Attachment ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                              <FileText className="w-5 h-5 text-brand-royal-blue" />
                              <span className="text-sm truncate">{att.name || "File"}</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                    {uploading ? "Uploading..." : "Add Image"}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                    {uploading ? "Uploading..." : "Add PDF"}
                  </button>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setComposerOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={!composerContent.trim() || uploading}
                    className="px-6 py-2 bg-brand-royal-blue text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

