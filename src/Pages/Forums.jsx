"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  MessageCircle,
  ArrowUp,
  ArrowDown,
  User,
  Eye,
  Clock,
  Tag,
  Plus,
  Send,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";

export default function Forums() {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [threads, setThreads] = useState([]);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [expandedThreadIds, setExpandedThreadIds] = useState(new Set());
  const [loadingThreadDetails, setLoadingThreadDetails] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newThreadModal, setNewThreadModal] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [replyBody, setReplyBody] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadThreads();
    } else {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  async function loadCategories() {
    setLoadingCategories(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`${base}/api/forums/categories`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("Error loading categories:", response.status, errorText);
        toast.error("Failed to load forum categories");
        setCategories([]);
        return;
      }
      const data = await response.json();
      const categoriesList = data.categories || [];
      setCategories(categoriesList);
      if (!selectedCategoryId && categoriesList.length > 0) {
        const generalHealthCategory = categoriesList.find(
          (cat) =>
            cat.slug === "general-health" || cat.name === "General Health"
        );
        if (generalHealthCategory) {
          setSelectedCategoryId(generalHealthCategory._id);
        } else if (categoriesList[0]?._id) {
          setSelectedCategoryId(categoriesList[0]._id);
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Request timeout loading categories");
        toast.error("Request timed out. Please check your connection.");
      } else if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        console.error("Network error loading categories:", error);
        toast.error("Network error. Please check your connection.");
      } else {
        console.error("Error loading categories:", error);
        toast.error("Failed to load forum categories");
      }
      setCategories([]);
    } finally {
      clearTimeout(timeoutId);
      setLoadingCategories(false);
    }
  }

  async function loadThreads() {
    if (!selectedCategoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const params = new URLSearchParams();
      if (selectedCategoryId) params.set("categoryId", selectedCategoryId);
      const response = await fetch(
        `${base}/api/forums/threads?${params.toString()}`,
        {
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("Error loading threads:", response.status, errorText);
        toast.error("Failed to load forum threads");
        setThreads([]);
        return;
      }
      const data = await response.json();
      const threadsData = data.threads || [];
      setThreads(threadsData);
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Request timeout loading threads");
        toast.error("Request timed out. Please check your connection.");
      } else if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        console.error("Network error loading threads:", error);
        toast.error("Network error. Please check your connection.");
      } else {
        console.error("Error loading threads:", error);
        toast.error("Failed to load forum threads");
      }
      setThreads([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function loadThreadDetails(threadId, forceReload = false) {
    // If thread is already loaded and we're not forcing a reload, skip
    if (expandedThreads[threadId] && !forceReload) {
      return;
    }

    setLoadingThreadDetails((prev) => new Set(prev).add(threadId));

    try {
      const response = await fetch(`${base}/api/forums/threads/${threadId}`);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          "Error loading thread details:",
          response.status,
          errorText
        );
        return;
      }
      const data = await response.json();
      setExpandedThreads((prev) => ({
        ...prev,
        [threadId]: data,
      }));
    } catch (error) {
      console.error("Error loading thread details:", error);
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

  async function postThread() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to post a thread");
      return;
    }
    if (!newThreadTitle || !newThreadBody) {
      toast.error("Please fill in both title and body");
      return;
    }

    try {
      await fetch(`${base}/api/forums/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          authorUserId: user._id || user.id,
          authorRole: user.role,
          title: newThreadTitle,
          body: newThreadBody,
        }),
      });
      toast.success("Thread posted successfully!");
      setNewThreadModal(false);
      setNewThreadTitle("");
      setNewThreadBody("");
      loadThreads();
    } catch (error) {
      console.error("Error posting thread:", error);
      toast.error("Failed to post thread");
    }
  }

  async function postReply(threadId, parentReplyId = null) {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in to reply");
      return;
    }

    if (!user?.role) {
      toast.error("User role not found. Please sign in again.");
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
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.warn("Failed to parse error response:", parseError);
        }
        toast.error(
          `Failed to post reply: ${errorData.error || "Unknown error"}`
        );
        return;
      }

      // Clear reply form
      setReplyBody((prev) => {
        const newState = { ...prev };
        delete newState[`${threadId}-${parentReplyId || "root"}`];
        return newState;
      });
      setReplyingTo(null);

      toast.success("Reply posted successfully!");

      // Force reload thread details first (if expanded) to show the new reply immediately
      if (expandedThreadIds.has(threadId)) {
        try {
          // Force reload by passing true to bypass the cache check
          await loadThreadDetails(threadId, true);
        } catch (detailsError) {
          console.warn("Error reloading thread details:", detailsError);
          // Continue even if details reload fails
        }
      }

      // Reload threads list to update reply counts
      try {
        await loadThreads();
      } catch (reloadError) {
        console.warn("Error reloading threads:", reloadError);
        // Continue even if reload fails
      }
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply. Please try again.");
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
        body: JSON.stringify({
          userId: user._id || user.id,
          voteType,
        }),
      }).then((r) => r.json());

      setThreads((prev) =>
        prev.map((t) =>
          t._id === threadId ? { ...t, voteScore: res.voteScore } : t
        )
      );
      if (expandedThreadIds.has(threadId)) {
        loadThreadDetails(threadId);
      }
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
        body: JSON.stringify({
          userId: user._id || user.id,
          voteType,
        }),
      }).then((r) => r.json());

      setExpandedThreads((prev) => {
        const updated = { ...prev };
        const updateReplyVote = (replies) => {
          return replies.map((reply) => {
            if (reply._id === replyId) {
              return { ...reply, voteScore: res.voteScore };
            }
            if (reply.children) {
              return { ...reply, children: updateReplyVote(reply.children) };
            }
            return reply;
          });
        };

        Object.keys(updated).forEach((threadId) => {
          const threadData = updated[threadId];
          if (threadData.replies && threadData.replies.length > 0) {
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

  function renderReply(reply, threadId, depth = 0) {
    const isUpvoted = reply.upvotes?.some(
      (id) => id.toString() === (user?._id || user?.id)?.toString()
    );
    const isDownvoted = reply.downvotes?.some(
      (id) => id.toString() === (user?._id || user?.id)?.toString()
    );
    const replyKey = `${threadId}-${reply._id}`;
    const indentMobile = depth * 12;

    return (
      <div
        key={reply._id}
        className="mt-3 animate-fadeInUp"
        style={{
          marginLeft: `${indentMobile}px`,
        }}
        data-depth={depth}
      >
        <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-indigo-300 transition-all duration-300 hover:shadow-md">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                {reply.authorUserId?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">
                    {reply.authorUserId?.username || "Anonymous"}
                  </span>
                  {reply.authorRole === "researcher" && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold shrink-0 border border-blue-200">
                      Researcher
                    </span>
                  )}
                  {reply.authorRole === "patient" && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold shrink-0 border border-indigo-200">
                      Patient
                    </span>
                  )}
                </div>
                {reply.specialties && reply.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {reply.specialties.slice(0, 3).map((spec, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-600 shrink-0 font-medium">
              {new Date(reply.createdAt).toLocaleDateString()}
            </div>
          </div>

          <p className="text-sm text-slate-700 mb-3 leading-relaxed break-words">
            {reply.body}
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-50 rounded-full px-2 py-1.5 border border-slate-200">
              <button
                onClick={() => voteOnReply(reply._id, "upvote")}
                className={`p-1 rounded transition-all duration-300 transform hover:scale-110 ${
                  isUpvoted
                    ? "text-indigo-600 bg-white shadow-sm"
                    : "text-slate-400 hover:text-indigo-600"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <span
                className={`text-sm font-bold min-w-[2rem] text-center transition-colors duration-300 ${
                  reply.voteScore > 0
                    ? "text-emerald-600"
                    : reply.voteScore < 0
                    ? "text-red-600"
                    : "text-slate-600"
                }`}
              >
                {reply.voteScore || 0}
              </span>
              <button
                onClick={() => voteOnReply(reply._id, "downvote")}
                className={`p-1 rounded transition-all duration-300 transform hover:scale-110 ${
                  isDownvoted
                    ? "text-red-600 bg-white shadow-sm"
                    : "text-slate-400 hover:text-red-600"
                }`}
              >
                <ArrowDown className="w-4 h-4" />
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
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-all duration-300"
            >
              <MessageCircle className="w-4 h-4" />
              Reply
            </button>
          </div>

          {replyingTo?.replyId === reply._id && user && (
            <div className="mt-3 pt-3 border-t border-slate-200 animate-slideDown">
              <textarea
                value={replyBody[replyKey] || ""}
                onChange={(e) =>
                  setReplyBody((prev) => ({
                    ...prev,
                    [replyKey]: e.target.value,
                  }))
                }
                placeholder="Write a reply..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition text-slate-900 placeholder-slate-400"
                rows="3"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => postReply(threadId, reply._id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md"
                >
                  <Send className="w-4 h-4" />
                  Reply
                </button>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {reply.children && reply.children.length > 0 && (
            <div className="mt-2 sm:mt-3 space-y-2">
              {reply.children.map((child) =>
                renderReply(child, threadId, depth + 1)
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes expandContent {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 5000px;
            transform: translateY(0);
          }
        }

        @keyframes collapseContent {
          from {
            opacity: 1;
            max-height: 5000px;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }

        .animate-expand {
          animation: expandContent 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-collapse {
          animation: collapseContent 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .thread-expandable {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          padding-top: 0;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      opacity 0.2s ease-out,
                      padding-top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .thread-expandable.expanded {
          max-height: 5000px;
          opacity: 1;
          padding-top: 1rem;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                      opacity 0.3s ease-out 0.1s,
                      padding-top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-depth] {
          margin-left: var(--indent-base, 12px);
        }

        @media (min-width: 640px) {
          [data-depth] {
            margin-left: calc(var(--indent-base, 12px) * 2);
          }
        }

        html {
          scroll-behavior: smooth;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

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

      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
          <AnimatedBackgroundDiff />

          <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
            {/* Compact Header */}
            <div className="text-center mb-6 animate-fade-in">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
                Health Forums
              </h1>
              <p className="text-sm text-slate-600">
                Ask questions, share experiences, and connect with experts
              </p>
            </div>

            {/* Category Filters */}
            <div className="mb-4">
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map((category, idx) => (
                  <button
                    key={category._id}
                    onClick={() => setSelectedCategoryId(category._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 shadow-sm animate-fade-in ${
                      selectedCategoryId === category._id
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border border-indigo-600 shadow-lg hover:shadow-xl"
                        : "bg-white border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-lg hover:text-indigo-700 active:bg-blue-50 active:border-blue-300"
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <Tag className="w-3 h-3" />
                    <span className="whitespace-nowrap">
                      {category.name} ({category.threadCount || 0})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Create New Post Button */}
            {user && (
              <div className="mb-4 flex justify-center">
                <button
                  onClick={() => setNewThreadModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold animate-fade-in"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Post</span>
                </button>
              </div>
            )}

            {/* Loading State */}
            {loadingCategories || loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full spinner"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-indigo-500 animate-pulse" />
                  </div>
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
                  const previewLength = 150;
                  const showPreview =
                    !isExpanded &&
                    thread.body &&
                    thread.body.length > previewLength;

                  return (
                    <div
                      key={thread._id}
                      className={`bg-white rounded-xl shadow-sm border transition-all duration-300 transform overflow-hidden animate-fade-in ${
                        isExpanded
                          ? "shadow-lg border-indigo-300 ring-2 ring-indigo-100"
                          : "border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5"
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4 mb-4">
                          <div
                            className="flex flex-col items-center gap-1 shrink-0 bg-slate-50 rounded-lg px-2 py-2 border border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => voteOnThread(thread._id, "upvote")}
                              className={`p-1.5 rounded transition-all duration-300 transform hover:scale-110 ${
                                isUpvoted
                                  ? "text-indigo-600 bg-white shadow-sm"
                                  : "text-slate-400 hover:text-indigo-600"
                              }`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <span
                              className={`text-sm font-bold min-w-[2rem] text-center transition-colors duration-300 ${
                                thread.voteScore > 0
                                  ? "text-emerald-600"
                                  : thread.voteScore < 0
                                  ? "text-red-600"
                                  : "text-slate-600"
                              }`}
                            >
                              {thread.voteScore || 0}
                            </span>
                            <button
                              onClick={() =>
                                voteOnThread(thread._id, "downvote")
                              }
                              className={`p-1.5 rounded transition-all duration-300 transform hover:scale-110 ${
                                isDownvoted
                                  ? "text-red-600 bg-white shadow-sm"
                                  : "text-slate-400 hover:text-red-600"
                              }`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <h3
                                className="text-base font-bold text-slate-900 break-words cursor-pointer hover:text-indigo-700 transition-colors duration-300"
                                onClick={() => toggleThread(thread._id)}
                              >
                                {thread.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mb-3 text-xs text-slate-600">
                              <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium border border-indigo-200">
                                {thread.categoryId?.name || "Uncategorized"}
                              </span>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[100px]">
                                  {thread.authorUserId?.username || "Anonymous"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(
                                    thread.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <MessageCircle className="w-3 h-3" />
                                <span>{thread.replyCount || 0}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Eye className="w-3 h-3" />
                                <span>{thread.viewCount || 0}</span>
                              </div>
                            </div>

                            <div className="mb-4">
                              <p className="text-sm text-slate-700 leading-relaxed mb-3 break-words">
                                {showPreview
                                  ? `${thread.body.substring(
                                      0,
                                      previewLength
                                    )}...`
                                  : thread.body}
                              </p>

                              {!isExpanded ? (
                                <button
                                  onClick={() => toggleThread(thread._id)}
                                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold mb-4 flex items-center gap-1.5 transition-all duration-300 group"
                                >
                                  <MessageCircle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                                  View {thread.replyCount || 0} replies
                                  <ArrowDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                                </button>
                              ) : (
                                <div className="thread-expandable expanded border-t border-slate-200">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-sm text-indigo-700 flex items-center gap-2">
                                      <MessageCircle className="w-4 h-4" />
                                      {threadDetails?.replies
                                        ? threadDetails.replies.length
                                        : thread.replyCount || 0}{" "}
                                      Replies
                                    </h4>
                                    <button
                                      onClick={() => toggleThread(thread._id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-semibold transition-all duration-300 border border-slate-200 hover:border-indigo-300 group"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                                      Collapse
                                    </button>
                                  </div>

                                  {loadingThreadDetails.has(thread._id) ? (
                                    <div className="flex items-center justify-center py-12">
                                      <div className="relative">
                                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full spinner"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <MessageCircle className="w-6 h-6 text-indigo-500 animate-pulse" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : threadDetails?.replies &&
                                    threadDetails.replies.length > 0 ? (
                                    <div className="space-y-3 animate-fade-in">
                                      {threadDetails.replies.map(
                                        (reply, replyIdx) => (
                                          <div
                                            key={reply._id}
                                            style={{
                                              animationDelay: `${
                                                replyIdx * 50
                                              }ms`,
                                            }}
                                            className="animate-fadeInUp"
                                          >
                                            {renderReply(reply, thread._id, 0)}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-slate-600">
                                      <MessageCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                      <p className="text-sm font-medium">
                                        No replies yet. Be the first to reply!
                                      </p>
                                    </div>
                                  )}

                                  {user && (
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                      {replyingTo?.threadId === thread._id &&
                                      !replyingTo?.replyId ? (
                                        <div className="animate-slideDown">
                                          <textarea
                                            value={
                                              replyBody[`${thread._id}-root`] ||
                                              ""
                                            }
                                            onChange={(e) =>
                                              setReplyBody((prev) => ({
                                                ...prev,
                                                [`${thread._id}-root`]:
                                                  e.target.value,
                                              }))
                                            }
                                            placeholder="Write a reply..."
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition text-slate-900 placeholder-slate-400"
                                            rows="3"
                                          />
                                          <div className="flex gap-2 mt-3">
                                            <button
                                              onClick={() =>
                                                postReply(thread._id)
                                              }
                                              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md"
                                            >
                                              <Send className="w-4 h-4" />
                                              Reply
                                            </button>
                                            <button
                                              onClick={() =>
                                                setReplyingTo(null)
                                              }
                                              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
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
                                          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all w-full"
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-md border border-slate-200 px-4 animate-fade-in">
                <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  No Threads Found
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {user
                    ? "Be the first to start a discussion in this category!"
                    : "Sign in to create a new thread"}
                </p>
              </div>
            )}

            {/* New Thread Modal */}
            {newThreadModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">
                      Create New Post
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Category
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900"
                      >
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newThreadTitle}
                        onChange={(e) => setNewThreadTitle(e.target.value)}
                        placeholder="Enter your question or topic..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Content
                      </label>
                      <textarea
                        value={newThreadBody}
                        onChange={(e) => setNewThreadBody(e.target.value)}
                        placeholder="Describe your question or share your experience..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none text-slate-900 placeholder-slate-400"
                        rows="6"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={postThread}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                        Post
                      </button>
                      <button
                        onClick={() => {
                          setNewThreadModal(false);
                          setNewThreadTitle("");
                          setNewThreadBody("");
                        }}
                        className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
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
