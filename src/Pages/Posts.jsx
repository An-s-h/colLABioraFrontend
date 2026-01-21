"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Heart,
  MessageCircle,
  Share2,
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
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import CustomSelect from "../components/ui/CustomSelect.jsx";
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

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dtgmjvfms";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedPostType, setSelectedPostType] = useState("patient"); // "patient" or "researcher"
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerContent, setComposerContent] = useState("");
  const [composerPostType, setComposerPostType] = useState("patient");
  const [composerCommunity, setComposerCommunity] = useState(null);
  const [composerSubcategory, setComposerSubcategory] = useState(null);
  const [composerAttachments, setComposerAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
    loadCommunities();
    loadPosts();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [selectedPostType]);

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
    } catch (error) {
      console.error("Error loading communities:", error);
      toast.error("Failed to load communities");
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

  async function loadPosts(reset = false) {
    if (reset) {
      setPage(1);
      setPosts([]);
    }

    const currentPage = reset ? 1 : page;
    setLoading(reset);
    setLoadingMore(!reset);

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userData?._id || userData?.id || "";
      const params = new URLSearchParams();
      params.set("postType", selectedPostType);
      params.set("page", currentPage.toString());
      params.set("pageSize", "20");
      if (userId) params.set("userId", userId);

      const response = await fetch(`${base}/api/posts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();

      if (reset) {
        setPosts(data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }

      setHasMore(data.hasMore || false);
      if (!reset) setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
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

  async function uploadToCloudinary(file, type) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type === "image" ? "image" : "raw"}/upload`);

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            type: type,
            url: response.secure_url,
            name: file.name,
            size: file.size,
          });
        } else {
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(formData);
    });
  }

  async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map((file) => uploadToCloudinary(file, type));
      const uploadedFiles = await Promise.all(uploadPromises);
      setComposerAttachments((prev) => [...prev, ...uploadedFiles]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
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
          postType: composerPostType,
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
      <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30">

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-brand-royal-blue mb-2">Posts</h1>
            <p className="text-brand-gray">Share your thoughts, experiences, and work</p>
          </div>

          {/* Post Type Selector - Big Options */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setSelectedPostType("patient");
                loadPosts(true);
              }}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedPostType === "patient"
                  ? "border-brand-royal-blue bg-brand-purple/20 shadow-lg"
                  : "border-gray-200 bg-white hover:border-brand-purple/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <User className="w-6 h-6 text-brand-royal-blue" />
                <h3 className="text-xl font-semibold text-brand-royal-blue">Patient Posts</h3>
              </div>
              <p className="text-sm text-brand-gray">Share your experiences and connect with others</p>
            </button>

            <button
              onClick={() => {
                setSelectedPostType("researcher");
                loadPosts(true);
              }}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedPostType === "researcher"
                  ? "border-brand-royal-blue bg-brand-purple/20 shadow-lg"
                  : "border-gray-200 bg-white hover:border-brand-purple/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-brand-royal-blue" />
                <h3 className="text-xl font-semibold text-brand-royal-blue">Researcher Posts</h3>
              </div>
              <p className="text-sm text-brand-gray">Share your work, findings, and research</p>
            </button>
          </div>

          {/* Composer Button */}
          {user && (
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full mb-6 p-4 bg-brand-royal-blue text-white rounded-xl font-semibold hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl"
            >
              Share your work
            </button>
          )}

          {/* Posts Feed */}
          {loading && posts.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-royal-blue" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-brand-gray">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post._id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
                >
                  {/* Post Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                      {post.authorUserId?.picture ? (
                        <img
                          src={post.authorUserId.picture}
                          alt={post.authorUserId.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-brand-royal-blue" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-brand-royal-blue">
                          {post.authorUserId?.username || "Anonymous"}
                        </h3>
                        {post.isOfficial && (
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="text-sm text-brand-gray">
                          · {formatTimeAgo(post.createdAt)}
                        </span>
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
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      {post.attachments.map((att, idx) => (
                        <div key={idx} className="relative">
                          {att.type === "image" ? (
                            <img
                              src={att.url}
                              alt={att.name || `Attachment ${idx + 1}`}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          ) : (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                              <FileText className="w-5 h-5 text-brand-royal-blue" />
                              <span className="text-sm truncate">{att.name || "File"}</span>
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
                    <button className="flex items-center gap-2 text-gray-500 hover:text-brand-royal-blue transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.replyCount || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-500 hover:text-brand-royal-blue transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
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
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-royal-blue" />
                  ) : (
                    "Load More"
                  )}
                </button>
              )}
            </div>
          )}
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
                {/* Post Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setComposerPostType("patient")}
                      className={`p-3 rounded-lg border-2 ${
                        composerPostType === "patient"
                          ? "border-brand-royal-blue bg-brand-purple/20"
                          : "border-gray-200"
                      }`}
                    >
                      Patient Post
                    </button>
                    <button
                      onClick={() => setComposerPostType("researcher")}
                      className={`p-3 rounded-lg border-2 ${
                        composerPostType === "researcher"
                          ? "border-brand-royal-blue bg-brand-purple/20"
                          : "border-gray-200"
                      }`}
                    >
                      Researcher Post
                    </button>
                  </div>
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
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ImageIcon className="w-5 h-5" />
                    {uploading ? "Uploading..." : "Add Image"}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText className="w-5 h-5" />
                    {uploading ? "Uploading..." : "Add File"}
                  </button>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e, "image")}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, "file")}
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

