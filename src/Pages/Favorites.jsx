import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Heart,
  Sparkles,
  Beaker,
  FileText,
  User,
  MessageCircle,
  Trash2,
  ExternalLink,
  Info,
  Calendar,
  BookOpen,
  MapPin,
  Link as LinkIcon,
  Eye,
  Tag,
  Star,
  Mail,
  CheckCircle,
  ListChecks,
  Activity,
  Users,
  TrendingUp,
  Building2,
  Briefcase,
  Plus,
  Loader2,
  Send,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import { BorderBeam } from "@/components/ui/border-beam";
import { AuroraText } from "@/components/ui/aurora-text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { pdf } from "@react-pdf/renderer";
import PDFReportDocument from "../components/PDFReportDocument.jsx";
import { FileText as FileTextIcon, CheckSquare, Square, X, XCircle } from "lucide-react";

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [summaryModal, setSummaryModal] = useState({
    open: false,
    title: "",
    type: "",
    summary: "",
    loading: false,
  });
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    item: null,
    type: "",
    favorite: null, // Store the full favorite object to check addedByUrl
  });
  const [urlInput, setUrlInput] = useState("");
  const [addingByUrl, setAddingByUrl] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    favorite: null,
  });
  const [selectedItems, setSelectedItems] = useState({
    experts: [],
    publications: [],
    trials: [],
  });
  const [reportModal, setReportModal] = useState({
    open: false,
    loading: false,
    report: null,
  });
  const [userProfile, setUserProfile] = useState(null);
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData?._id && !userData?.id) {
      toast.error("Please sign in first");
      navigate("/signin");
      return;
    }
  }, [navigate]);

  // Helper function to get status color (matching Trials.jsx)
  function getStatusColor(status) {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("recruiting") || statusLower.includes("active")) {
      return "bg-green-100 text-green-800 border-green-300";
    } else if (
      statusLower.includes("completed") ||
      statusLower.includes("approved")
    ) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    } else if (
      statusLower.includes("suspended") ||
      statusLower.includes("terminated")
    ) {
      return "bg-red-100 text-red-800 border-red-300";
    } else if (statusLower.includes("not yet")) {
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    } else {
      return "bg-slate-100 text-slate-800 border-slate-300";
    }
  }

  const filterOptions = [
    { value: "all", label: "All Favorites", icon: "⭐" },
    { value: "trial", label: "Trials", icon: "🔬" },
    { value: "publication", label: "Publications", icon: "📄" },
    { value: "expert", label: "Experts", icon: "👤" },
    { value: "collaborator", label: "Collaborators", icon: "🤝" },
    { value: "thread", label: "Forum Threads", icon: "💬" },
    { value: "addedByUrl", label: "Added by URL", icon: "🔗" },
  ];

  async function load() {
    if (!user?._id && !user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetch(
        `${base}/api/favorites/${user._id || user.id}`
      ).then((r) => r.json());
      setItems(data.items || []);
      setFilteredItems(data.items || []);
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Load user profile for patient context
    if (user?._id || user?.id) {
      fetch(`${base}/api/profile/${user._id || user.id}`)
        .then((r) => r.json())
        .then((data) => {
          setUserProfile(data.profile || null);
        })
        .catch((err) => console.error("Error loading profile:", err));
    }
  }, []);

  useEffect(() => {
    if (selectedFilter === "all") {
      setFilteredItems(items);
    } else if (selectedFilter === "addedByUrl") {
      // Filter items that were added by URL
      setFilteredItems(items.filter((item) => item.addedByUrl === true));
    } else {
      setFilteredItems(items.filter((item) => item.type === selectedFilter));
    }
  }, [selectedFilter, items]);

  function openDeleteDialog(favorite) {
    setDeleteDialog({
      open: true,
      favorite: favorite,
    });
  }

  async function confirmDelete() {
    const favorite = deleteDialog.favorite;
    if (!favorite) return;

    try {
      // Determine the correct ID to use for deletion (matching the logic used when adding)
      let itemId;
      if (favorite.type === "expert" || favorite.type === "collaborator") {
        itemId =
          favorite.item?.orcid ||
          favorite.item?.id ||
          favorite.item?._id ||
          favorite.item?.userId;
      } else if (favorite.type === "publication") {
        itemId = favorite.item?.pmid || favorite.item?.id || favorite.item?._id;
      } else if (favorite.type === "trial") {
        itemId = favorite.item?.id || favorite.item?._id;
      } else if (favorite.type === "thread") {
        itemId =
          favorite.item?.threadId || favorite.item?.id || favorite.item?._id;
      } else {
        itemId =
          favorite.item?.id || favorite.item?._id || favorite.item?.userId;
      }

      await fetch(
        `${base}/api/favorites/${user._id || user.id}?type=${
          favorite.type
        }&id=${encodeURIComponent(itemId)}`,
        { method: "DELETE" }
      );
      toast.success("Removed from favorites");
      setDeleteDialog({ open: false, favorite: null });
      load();
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove favorite. Please try again.");
    }
  }

  function toggleItemSelection(favorite) {
    const type = favorite.type === "collaborator" ? "expert" : favorite.type;
    if (type !== "expert" && type !== "publication" && type !== "trial") {
      return; // Only allow experts, publications, and trials
    }

    setSelectedItems((prev) => {
      const items = prev[type + "s"] || [];
      const isSelected = items.some(
        (item) =>
          item._id === favorite._id || item.item?.id === favorite.item?.id
      );

      if (isSelected) {
        return {
          ...prev,
          [type + "s"]: items.filter(
            (item) =>
              item._id !== favorite._id && item.item?.id !== favorite.item?.id
          ),
        };
      } else {
        return {
          ...prev,
          [type + "s"]: [...items, favorite],
        };
      }
    });
  }

  function isItemSelected(favorite) {
    const type = favorite.type === "collaborator" ? "expert" : favorite.type;
    if (type !== "expert" && type !== "publication" && type !== "trial") {
      return false;
    }
    const items = selectedItems[type + "s"] || [];
    return items.some(
      (item) => item._id === favorite._id || item.item?.id === favorite.item?.id
    );
  }

  function clearSelections() {
    setSelectedItems({
      experts: [],
      publications: [],
      trials: [],
    });
    toast.success("Selections cleared");
  }

  async function generateSummaryReport() {
    const totalSelected =
      selectedItems.experts.length +
      selectedItems.publications.length +
      selectedItems.trials.length;

    if (totalSelected === 0) {
      toast.error("Please select at least one item to generate a report");
      return;
    }

    setReportModal({ open: true, loading: true, report: null });

    try {
      // Prepare patient context
      // Try multiple sources for patient name
      let patientName = "Not specified";
      if (userProfile?.patient?.name) {
        patientName = userProfile.patient.name;
      } else if (user?.username) {
        patientName = user.username;
      } else if (user?.name) {
        patientName = user.name;
      } else if (user?.firstName && user?.lastName) {
        patientName = `${user.firstName} ${user.lastName}`.trim();
      }

      const patientContext = {
        name: patientName,
        condition:
          userProfile?.patient?.conditions?.[0] ||
          user?.medicalInterests?.[0] ||
          "Not specified",
        location: userProfile?.patient?.location
          ? `${userProfile.patient.location.city || ""}${
              userProfile.patient.location.city &&
              userProfile.patient.location.country
                ? ", "
                : ""
            }${userProfile.patient.location.country || ""}`.trim()
          : "Not specified",
        keyConcerns: userProfile?.patient?.concerns || [],
        interests: user?.medicalInterests || [],
      };

      // Prepare selected items
      const itemsToSend = {
        experts: selectedItems.experts.map((fav) => fav.item),
        publications: selectedItems.publications.map((fav) => fav.item),
        trials: selectedItems.trials.map((fav) => fav.item),
      };

      const response = await fetch(`${base}/api/ai/generate-summary-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedItems: itemsToSend,
          patientContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();
      setReportModal({ open: true, loading: false, report: data.report });
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate summary report. Please try again.");
      setReportModal({ open: false, loading: false, report: null });
    }
  }

  async function exportToPDF() {
    if (!reportModal.report) {
      toast.error("No report to export");
      return;
    }

    try {
      toast.loading("Generating PDF...", { id: "pdf-generation" });

      const patientName = reportModal.report?.patientContext?.name || "Patient";
      const fileName = `Collabiora-Summary-Report-${patientName.replace(
        /\s+/g,
        "-"
      )}-${new Date().toISOString().split("T")[0]}.pdf`;

      // Use react-pdf to generate and download the PDF
      const pdfInstance = pdf(
        <PDFReportDocument report={reportModal.report} />
      );
      const blob = await pdfInstance.toBlob();

      // Create a download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF generated successfully!", { id: "pdf-generation" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(`Failed to generate PDF: ${error.message}`, {
        id: "pdf-generation",
      });
    }
  }

  function printReport() {
    const element = document.getElementById("summary-report-content");
    if (!element) {
      toast.error("Report content not found");
      return;
    }

    const patientName = reportModal.report?.patientContext?.name || "Patient";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Collabiora Summary Report - ${patientName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #4f46e5; }
            h2 { color: #6366f1; margin-top: 30px; }
            h3 { color: #818cf8; margin-top: 20px; }
            .section { margin-bottom: 30px; }
            .item { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
    } else if (type === "publication") {
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
    } else {
      return; // No summary for other types
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

  function closeSummaryModal() {
    setSummaryModal({
      open: false,
      title: "",
      type: "",
      summary: "",
      loading: false,
    });
  }

  function openDetailsModal(item, type, favorite = null) {
    setDetailsModal({
      open: true,
      item: item,
      type: type,
      favorite: favorite, // Pass the full favorite object
    });
  }

  function closeDetailsModal() {
    setDetailsModal({
      open: false,
      item: null,
      type: "",
      favorite: null,
    });
  }

  async function addFavoriteByUrl() {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (!user?._id && !user?.id) {
      toast.error("Please sign in to add favorites");
      return;
    }

    setAddingByUrl(true);
    try {
      const response = await fetch(
        `${base}/api/favorites/${user._id || user.id}/add-by-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to add favorite");
        return;
      }

      if (data.message) {
        toast.success(data.message);
      } else {
        toast.success("Added to favorites!");
      }

      // Clear input and reload favorites
      setUrlInput("");
      await load();
    } catch (error) {
      console.error("Error adding favorite by URL:", error);
      toast.error("Failed to add favorite. Please try again.");
    } finally {
      setAddingByUrl(false);
    }
  }

  function renderTrialCard(favorite) {
    const t = favorite.item;
    // Check if this favorite was added by URL
    const isAddedByUrl = favorite.addedByUrl === true;

    return (
      <div
        key={favorite._id}
        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden h-full flex flex-col"
      >
        <div className="p-5 flex flex-col flex-1">
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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemSelection(favorite);
                  }}
                  className="p-1 hover:bg-indigo-50 rounded transition-colors"
                >
                  {isItemSelected(favorite) ? (
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                  <Beaker className="w-3 h-3 mr-1" />
                  {t.id || t._id || "Trial"}
                </span>
                {isAddedByUrl && (
                  <span className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Added by You
                  </span>
                )}
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
              <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-2">
                {t.title || "Untitled Trial"}
              </h3>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(favorite);
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Basic Info */}
          <div className="space-y-1.5 mb-3 text-sm text-slate-700">
            {t.conditions?.length > 0 && (
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                <span className="line-clamp-1">
                  {Array.isArray(t.conditions)
                    ? t.conditions.join(", ")
                    : t.conditions}
                </span>
              </div>
            )}
            {t.phase && (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-3.5 h-3.5" /> Phase {t.phase}
              </div>
            )}
          </div>

          {/* Description with Info Button */}
          {t.description && (
            <div className="mb-3">
              <button
                onClick={() => openDetailsModal(t, "trial", favorite)}
                className="w-full flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-700 font-medium py-2 px-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Info className="w-4 h-4" />
                <span className="flex-1 text-left line-clamp-2">
                  {t.description}
                </span>
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
            <button
              onClick={() => generateSummary(t, "trial")}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Summarize
            </button>
            <button
              onClick={() => openDetailsModal(t, "trial", favorite)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm"
            >
              <Info className="w-4 h-4" /> Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPublicationCard(favorite) {
    const p = favorite.item;
    // Check if this favorite was added by URL
    const isAddedByUrl = favorite.addedByUrl === true;

    return (
      <div
        key={favorite._id}
        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden h-full flex flex-col"
      >
        <div className="p-5 flex flex-col flex-1">
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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemSelection(favorite);
                  }}
                  className="p-1 hover:bg-indigo-50 rounded transition-colors"
                >
                  {isItemSelected(favorite) ? (
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                  <FileText className="w-3 h-3 mr-1" />
                  {p.pmid ? `PMID: ${p.pmid}` : p.id || "PUB-001"}
                </span>
                {isAddedByUrl && (
                  <span className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Added by You
                  </span>
                )}
                {p.journal && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200">
                    {p.journal.length > 20
                      ? `${p.journal.substring(0, 20)}...`
                      : p.journal}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-2 leading-tight">
                {p.title || "Untitled Publication"}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Citations - More Prominent */}
              {(p.citations || p.citations === 0) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-indigo-700">
                    {p.citations || 0}
                  </span>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(favorite);
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Basic Info - Authors and Published Date */}
          <div className="space-y-1.5 mb-3">
            {p.authors && Array.isArray(p.authors) && p.authors.length > 0 && (
              <div className="flex items-center text-sm text-slate-700">
                <User className="w-3.5 h-3.5 mr-2 shrink-0" />
                <span className="line-clamp-1">
                  {p.authors.slice(0, 3).join(", ")}
                  {p.authors.length > 3 && " et al."}
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
                <span className="line-clamp-1">{p.journal}</span>
              </div>
            )}
          </div>

          {/* One-line Abstract Description */}
          {p.abstract && (
            <div className="mb-3">
              <button
                onClick={() => openDetailsModal(p, "publication", favorite)}
                className="w-full text-left text-sm text-slate-700 hover:text-indigo-700 font-medium py-2 px-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="line-clamp-2 flex-1">{p.abstract}</span>
                </div>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
            <button
              onClick={() => generateSummary(p, "publication")}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Summarize
            </button>
            <button
              onClick={() => openDetailsModal(p, "publication", favorite)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm"
            >
              <Info className="w-4 h-4" />
              Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderExpertCard(favorite) {
    const e = favorite.item;
    return (
      <div
        key={favorite._id}
        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden h-full flex flex-col"
      >
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItemSelection(favorite);
                }}
                className="p-1 hover:bg-indigo-50 rounded transition-colors shrink-0"
              >
                {isItemSelected(favorite) ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                {e.name?.charAt(0)?.toUpperCase() || "E"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    Expert
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {e.name || "Unknown Expert"}
                </h3>
                {e.orcid && (
                  <p className="text-xs text-indigo-600 mt-0.5">
                    ORCID: {e.orcid}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(favorite);
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 mb-3">
            {e.affiliation && (
              <p className="text-xs text-slate-700 line-clamp-1">
                {e.affiliation}
              </p>
            )}
            {e.location && (
              <div className="flex items-center text-xs text-slate-600">
                <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                <span>
                  {typeof e.location === "string"
                    ? e.location
                    : `${e.location.city || ""}${
                        e.location.city && e.location.country ? ", " : ""
                      }${e.location.country || ""}`}
                </span>
              </div>
            )}
            {e.researchInterests &&
              Array.isArray(e.researchInterests) &&
              e.researchInterests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {e.researchInterests.slice(0, 3).map((interest, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                  {e.researchInterests.length > 3 && (
                    <span className="text-xs text-slate-600">
                      +{e.researchInterests.length - 3} more
                    </span>
                  )}
                </div>
              )}
          </div>

          <button
            onClick={() => openDetailsModal(e, "expert", favorite)}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md mt-auto"
          >
            View Profile
          </button>
        </div>
      </div>
    );
  }

  function renderCollaboratorCard(favorite) {
    const e = favorite.item;
    const medicalInterests = [...(e.specialties || []), ...(e.interests || [])];
    return (
      <div
        key={favorite._id}
        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden h-full flex flex-col"
      >
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItemSelection(favorite);
                }}
                className="p-1 hover:bg-indigo-50 rounded transition-colors shrink-0"
              >
                {isItemSelected(favorite) ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                {e.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    Collaborator
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {e.name || "Unknown Researcher"}
                </h3>
                {medicalInterests.length > 0 && (
                  <p className="text-xs text-slate-700 mt-0.5 line-clamp-1">
                    {medicalInterests.slice(0, 3).join(", ")}
                    {medicalInterests.length > 3 && "..."}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(favorite);
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 mb-3">
            {e.location && (
              <div className="flex items-center text-xs text-slate-600">
                <MapPin className="w-3 h-3 mr-1.5 shrink-0" />
                <span>
                  {e.location.city || ""}
                  {e.location.city && e.location.country && ", "}
                  {e.location.country || ""}
                </span>
              </div>
            )}
            {e.orcid && (
              <div className="flex items-center text-xs text-indigo-600">
                <LinkIcon className="w-3 h-3 mr-1.5 shrink-0" />
                <span>ORCID: {e.orcid}</span>
              </div>
            )}
            {e.bio && (
              <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                {e.bio}
              </p>
            )}
          </div>

          <button
            onClick={() => openDetailsModal(e, "collaborator", favorite)}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md mt-auto"
          >
            View Profile
          </button>
        </div>
      </div>
    );
  }

  function renderThreadCard(favorite) {
    const t = favorite.item;
    return (
      <div
        key={favorite._id}
        className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden h-full flex flex-col"
      >
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  Forum Thread
                </span>
                {t.categoryName && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    <Tag className="w-3 h-3 inline mr-1" />
                    {t.categoryName}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-base line-clamp-2 mb-2">
                {t.title || "Untitled Thread"}
              </h3>
            </div>
            <button
              onClick={() => openDeleteDialog(favorite)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 mb-3">
            {t.authorName && (
              <div className="flex items-center text-xs text-slate-700">
                <User className="w-3 h-3 mr-1.5 shrink-0" />
                <span>By {t.authorName}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              {t.viewCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{t.viewCount || 0} views</span>
                </div>
              )}
              {t.replyCount !== undefined && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{t.replyCount || 0} replies</span>
                </div>
              )}
            </div>
          </div>

          {t.body && (
            <div className="mb-3">
              <p className="text-xs text-slate-700 line-clamp-3">{t.body}</p>
            </div>
          )}

          <button
            onClick={() => navigate("/forums")}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md mt-auto"
          >
            View Thread
          </button>
        </div>
      </div>
    );
  }

  function renderCard(favorite) {
    switch (favorite.type) {
      case "trial":
        return renderTrialCard(favorite);
      case "publication":
        return renderPublicationCard(favorite);
      case "expert":
        return renderExpertCard(favorite);
      case "collaborator":
        return renderCollaboratorCard(favorite);
      case "thread":
        return renderThreadCard(favorite);
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
          <AnimatedBackgroundDiff />
          <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-700">Loading favorites...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackgroundDiff />
        <div className="relative pt-24 px-4 md:px-8 mx-auto max-w-6xl pb-8">
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 bg-clip-text text-transparent mb-1">
              <AuroraText
                speed={2.5}
                colors={["#38bdf8", "#6366F1", "#818CF8", "#9333EA", "#C084FC"]}
              >
                My Favorites
              </AuroraText>
            </h1>
            <p className="text-sm text-slate-600 mb-4">
              All your saved trials, publications, experts, and forum threads
            </p>
            {/* Create Summary Report and Clear Selections Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={generateSummaryReport}
                disabled={
                  selectedItems.experts.length +
                    selectedItems.publications.length +
                    selectedItems.trials.length ===
                  0
                }
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileTextIcon className="w-5 h-5" />
                Create Summary Report
                {selectedItems.experts.length +
                  selectedItems.publications.length +
                  selectedItems.trials.length >
                  0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {selectedItems.experts.length +
                      selectedItems.publications.length +
                      selectedItems.trials.length}{" "}
                    selected
                  </span>
                )}
              </button>
              {selectedItems.experts.length +
                selectedItems.publications.length +
                selectedItems.trials.length >
                0 && (
                <button
                  onClick={clearSelections}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all shadow-md hover:shadow-lg border border-slate-300"
                >
                  <XCircle className="w-5 h-5" />
                  Clear Selections
                </button>
              )}
            </div>
          </div>

          {/* Add by URL Section */}
          <div className="mb-6 bg-white rounded-xl shadow-lg p-5 border border-slate-200 animate-fade-in">
            <BorderBeam
              duration={10}
              size={100}
              className="from-transparent via-indigo-500 to-transparent"
            />
            <BorderBeam
              duration={10}
              size={300}
              borderWidth={3}
              className="from-transparent via-blue-500 to-transparent"
            />
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Add by URL
              </h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Paste a ClinicalTrials.gov or PubMed URL to automatically add it
              to your favorites
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addFavoriteByUrl()}
                placeholder="https://clinicaltrials.gov/study/NCT... or https://pubmed.ncbi.nlm.nih.gov/..."
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-900 placeholder-slate-400"
                disabled={addingByUrl}
              />
              <button
                onClick={addFavoriteByUrl}
                disabled={addingByUrl || !urlInput.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingByUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Favorites
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <p className="font-medium">Supported URLs:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>
                  ClinicalTrials.gov:
                  https://clinicaltrials.gov/study/NCT12345678
                </li>
                <li>PubMed: https://pubmed.ncbi.nlm.nih.gov/12345678/</li>
              </ul>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-2">
              {filterOptions.map((filter, idx) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm text-sm font-medium animate-fade-in ${
                    selectedFilter === filter.value
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                      : "bg-white border border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <span className="text-base">{filter.icon}</span>
                  <span>{filter.label}</span>
                  {selectedFilter === filter.value && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {filteredItems.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Favorites Grid */}
          {filteredItems.length > 0 ? (
            selectedFilter === "all" ? (
              <div className="space-y-10">
                {[
                  "trial",
                  "publication",
                  "expert",
                  "collaborator",
                  "thread",
                ].map((section) => {
                  const sectionMeta = {
                    trial: {
                      label: "Clinical Trials",
                      gradient: "from-indigo-600 to-blue-600",
                      icon: Beaker,
                    },
                    publication: {
                      label: "Publications",
                      gradient: "from-blue-600 to-indigo-700",
                      icon: FileText,
                    },
                    expert: {
                      label: "Experts",
                      gradient: "from-purple-600 to-purple-700",
                      icon: User,
                    },
                    collaborator: {
                      label: "Collaborators",
                      gradient: "from-teal-600 to-emerald-600",
                      icon: Users,
                    },
                    thread: {
                      label: "Forum Threads",
                      gradient: "from-pink-600 to-rose-600",
                      icon: MessageCircle,
                    },
                  }[section];

                  const sectionItems = filteredItems.filter(
                    (fav) => fav.type === section
                  );
                  if (!sectionItems.length) return null;
                  const SectionIcon = sectionMeta.icon;
                  return (
                    <div key={section} className="space-y-4 animate-fade-in">
                      <div
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white shadow-md bg-gradient-to-r ${sectionMeta.gradient}`}
                      >
                        <SectionIcon className="w-5 h-5" />
                        <div className="flex-1 flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold">
                            {sectionMeta.label}
                          </h3>
                          <span className="px-3 py-0.5 rounded-full text-xs bg-white/20 font-semibold">
                            {sectionItems.length} item
                            {sectionItems.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                        {sectionItems.map((favorite, idx) => (
                          <div
                            key={favorite._id}
                            style={{ animationDelay: `${idx * 50}ms` }}
                            className="animate-fade-in h-full"
                          >
                            {renderCard(favorite)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                {filteredItems.map((favorite, idx) => (
                  <div
                    key={favorite._id}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className="animate-fade-in h-full"
                  >
                    {renderCard(favorite)}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-md border border-slate-200 animate-fade-in">
              <Heart className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                No Favorites Yet
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                {selectedFilter === "all"
                  ? "Start exploring and favorite items you're interested in!"
                  : `No ${filterOptions
                      .find((f) => f.value === selectedFilter)
                      ?.label.toLowerCase()} found.`}
              </p>
            </div>
          )}

          {/* Summary Modal */}
          <Modal
            isOpen={summaryModal.open}
            onClose={closeSummaryModal}
            title="AI Summary"
          >
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  {summaryModal.type === "trial" ? (
                    <Beaker className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-indigo-600" />
                  )}
                  <h4 className="font-bold text-slate-900 text-lg">
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
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {summaryModal.summary}
                  </p>
                </div>
              )}
            </div>
          </Modal>

          {/* Details Modal */}
          <Modal
            isOpen={detailsModal.open}
            onClose={closeDetailsModal}
            title={
              detailsModal.type === "trial"
                ? "Trial Details"
                : detailsModal.type === "publication"
                ? "Publication Details"
                : detailsModal.type === "expert"
                ? "Expert Details"
                : "Collaborator Details"
            }
          >
            {detailsModal.item && detailsModal.type === "trial" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Beaker className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-lg">
                      {detailsModal.item.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                      {detailsModal.item.id || detailsModal.item._id}
                    </span>
                    {detailsModal.favorite?.addedByUrl && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Added by You
                      </span>
                    )}
                    {detailsModal.item.status && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          detailsModal.item.status
                        )}`}
                      >
                        {detailsModal.item.status.replace(/_/g, " ")}
                      </span>
                    )}
                    {detailsModal.item.phase && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                        Phase {detailsModal.item.phase}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {detailsModal.item.description && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Description
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {detailsModal.item.description}
                    </p>
                  </div>
                )}

                {/* Location */}
                {detailsModal.item.location &&
                  detailsModal.item.location !== "Not specified" && (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                        <MapPin className="w-5 h-5 text-green-600" />
                        Trial Locations
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {detailsModal.item.location}
                      </p>
                    </div>
                  )}

                {/* Conditions */}
                {detailsModal.item.conditions?.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                      <Activity className="w-5 h-5 text-blue-600" />
                      Conditions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailsModal.item.conditions.map((condition, idx) => (
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
                {detailsModal.item.eligibility && (
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
                          {detailsModal.item.eligibility.gender || "All"}
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
                          {detailsModal.item.eligibility.minimumAge !==
                            "Not specified" &&
                          detailsModal.item.eligibility.minimumAge
                            ? detailsModal.item.eligibility.minimumAge
                            : "N/A"}
                          {" - "}
                          {detailsModal.item.eligibility.maximumAge !==
                            "Not specified" &&
                          detailsModal.item.eligibility.maximumAge
                            ? detailsModal.item.eligibility.maximumAge
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
                          {detailsModal.item.eligibility.healthyVolunteers ||
                            "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Eligibility Criteria */}
                    {detailsModal.item.eligibility.criteria &&
                      detailsModal.item.eligibility.criteria !==
                        "Not specified" && (
                        <div className="mt-4 pt-4 border-t border-indigo-200">
                          <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                            <Info className="w-4 h-4 text-indigo-600" />
                            Detailed Eligibility Criteria
                          </h5>
                          <div className="bg-white rounded-lg p-4 border border-indigo-100">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                              {detailsModal.item.eligibility.criteria}
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Contacts */}
                {detailsModal.item.contacts?.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-base">
                      <User className="w-5 h-5 text-indigo-600" />
                      Contact Information
                    </h4>
                    <div className="space-y-3">
                      {detailsModal.item.contacts.map((contact, i) => (
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
                                <Send className="w-4 h-4" />
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sticky Footer */}
                <div className="sticky bottom-[-100]  px-6 py-4 -mx-6 -mb-6 flex gap-3 mt-6 mx-4">
                  <button
                    onClick={() => {
                      const fav = items.find(
                        (f) =>
                          f.type === "trial" &&
                          (f.item?.id === detailsModal.item.id ||
                            f.item?._id === detailsModal.item._id ||
                            f.item?.title === detailsModal.item.title)
                      );
                      if (fav) {
                        closeDetailsModal();
                        openDeleteDialog(fav);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all border border-red-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove from Favorites
                  </button>
                  <button
                    onClick={() => {
                      generateSummary(detailsModal.item, "trial");
                      closeDetailsModal();
                    }}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Summary
                  </button>
                </div>
              </div>
            )}

            {detailsModal.item && detailsModal.type === "publication" && (
              <div className="flex flex-col h-full -mx-6 -my-6">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-5">
                  {/* Header */}
                  <div className="pb-4 border-b border-slate-200/60">
                    <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">
                      {detailsModal.item.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {detailsModal.item.pmid && (
                        <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">
                          <FileText className="w-3 h-3 mr-1.5" />
                          PMID: {detailsModal.item.pmid}
                        </span>
                      )}
                      {detailsModal.favorite?.addedByUrl && (
                        <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md border border-purple-200">
                          <LinkIcon className="w-3 h-3 mr-1.5" />
                          Added by You
                        </span>
                      )}
                      {detailsModal.item.journal && (
                        <span className="inline-flex items-center px-3 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200">
                          <BookOpen className="w-3 h-3 mr-1.5" />
                          {detailsModal.item.journal}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Abstract Section - Moved to Top */}
                  {detailsModal.item.abstract && (
                    <div>
                      <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-xl p-5 border border-indigo-100/50">
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-indigo-700">
                          <Info className="w-4 h-4" />
                          Abstract
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {detailsModal.item.abstract}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Authors Section */}
                  {detailsModal.item.authors &&
                    Array.isArray(detailsModal.item.authors) &&
                    detailsModal.item.authors.length > 0 && (
                      <div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                            <User className="w-4 h-4" />
                            Authors
                          </h4>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {detailsModal.item.authors.join(", ")}
                          </p>
                          {detailsModal.item.authors.length > 1 && (
                            <p className="text-xs text-slate-500 mt-2">
                              {detailsModal.item.authors.length} authors
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
                        {(detailsModal.item.year ||
                          detailsModal.item.month) && (
                          <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Published
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                              {detailsModal.item.month
                                ? `${detailsModal.item.month} `
                                : ""}
                              {detailsModal.item.day
                                ? `${detailsModal.item.day}, `
                                : ""}
                              {detailsModal.item.year || "N/A"}
                            </p>
                          </div>
                        )}

                        {/* Volume & Issue */}
                        {(detailsModal.item.volume ||
                          detailsModal.item.issue) && (
                          <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                            <div className="flex items-center gap-2 mb-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Volume / Issue
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                              {detailsModal.item.volume || "N/A"}
                              {detailsModal.item.issue
                                ? ` (Issue ${detailsModal.item.issue})`
                                : ""}
                            </p>
                          </div>
                        )}

                        {/* Pages */}
                        {detailsModal.item.pages && (
                          <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                            <div className="flex items-center gap-2 mb-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Pages
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                              {detailsModal.item.pages}
                            </p>
                          </div>
                        )}

                        {/* Citations */}
                        {(detailsModal.item.citations ||
                          detailsModal.item.citations === 0) && (
                          <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
                            <div className="flex items-center gap-2 mb-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Citations
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                              {detailsModal.item.citations || 0}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Keywords */}
                  {detailsModal.item.keywords &&
                    detailsModal.item.keywords.length > 0 && (
                      <div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                            <Tag className="w-4 h-4" />
                            Keywords
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detailsModal.item.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* MeSH Terms */}
                  {detailsModal.item.meshTerms &&
                    detailsModal.item.meshTerms.length > 0 && (
                      <div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                            <Tag className="w-4 h-4" />
                            MeSH Terms
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detailsModal.item.meshTerms
                              .slice(0, 10)
                              .map((term, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100"
                                >
                                  {term}
                                </span>
                              ))}
                            {detailsModal.item.meshTerms.length > 10 && (
                              <span className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                                +{detailsModal.item.meshTerms.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Affiliations - Show only first */}
                  {detailsModal.item.affiliations &&
                    detailsModal.item.affiliations.length > 0 && (
                      <div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                            <Building2 className="w-4 h-4" />
                            Affiliation
                          </h4>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {Array.isArray(detailsModal.item.affiliations)
                              ? detailsModal.item.affiliations[0]
                              : detailsModal.item.affiliations}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Publication Types */}
                  {detailsModal.item.publicationTypes &&
                    detailsModal.item.publicationTypes.length > 0 && (
                      <div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-slate-600">
                            <FileText className="w-4 h-4" />
                            Publication Types
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detailsModal.item.publicationTypes.map(
                              (type, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md border border-purple-100"
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

                {/* Sticky Footer */}
                <div className="sticky bottom-[-100] px-6 py-4 -mx-6 -mb-6 flex gap-3 mx-5">
                  {(detailsModal.item.link || detailsModal.item.url) && (
                    <a
                      href={detailsModal.item.link || detailsModal.item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on {detailsModal.item.pmid ? "PubMed" : "Source"}
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const fav = items.find(
                        (f) =>
                          f.type === "publication" &&
                          (f.item?.id === detailsModal.item.id ||
                            f.item?._id === detailsModal.item._id ||
                            f.item?.pmid === detailsModal.item.pmid ||
                            f.item?.title === detailsModal.item.title)
                      );
                      if (fav) {
                        closeDetailsModal();
                        openDeleteDialog(fav);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all border border-red-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove from Favorites
                  </button>
                </div>
              </div>
            )}

            {detailsModal.item &&
              (detailsModal.type === "expert" ||
                detailsModal.type === "collaborator") && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                      {detailsModal.item.name?.charAt(0)?.toUpperCase() || "E"}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-lg mb-1">
                        {detailsModal.item.name || "Unknown"}
                      </h3>
                      {detailsModal.item.location && (
                        <div className="flex items-center gap-1 text-sm text-slate-600 mb-1">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {detailsModal.item.location.city || ""}
                            {detailsModal.item.location.city &&
                              detailsModal.item.location.country &&
                              ", "}
                            {detailsModal.item.location.country || ""}
                          </span>
                        </div>
                      )}
                      {detailsModal.item.orcid && (
                        <div className="flex items-center gap-1 text-sm text-indigo-600">
                          <LinkIcon className="w-4 h-4" />
                          <span>ORCID: {detailsModal.item.orcid}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {detailsModal.item.bio && (
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">
                        Biography
                      </h4>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {detailsModal.item.bio}
                      </p>
                    </div>
                  )}
                  {(detailsModal.item.researchInterests ||
                    detailsModal.item.specialties ||
                    detailsModal.item.interests) && (
                    <div>
                      <h4 className="font-semibold text-slate-700 mb-2">
                        Research Interests
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...(detailsModal.item.researchInterests || []),
                          ...(detailsModal.item.specialties || []),
                          ...(detailsModal.item.interests || []),
                        ].map((interest, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </Modal>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, favorite: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Favorites?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from your favorites?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary Report Modal - Custom wider modal for reports */}
      {reportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() =>
              setReportModal({ open: false, loading: false, report: null })
            }
          />
          <div className="relative z-10 w-full max-w-4xl max-h-[95vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200/50">
            <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border-b border-slate-200/80 backdrop-blur-sm">
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-indigo-600 bg-clip-text text-transparent">
                Summary Report
              </h2>
              <button
                onClick={() =>
                  setReportModal({ open: false, loading: false, report: null })
                }
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">
              {reportModal.loading ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-700 font-medium">
                    Generating your summary report...
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    This may take a few moments
                  </p>
                </div>
              ) : reportModal.report ? (
                <div className="space-y-6">
                  {/* Action Buttons - Only Export PDF and Print */}
                  <div className="flex gap-3 pb-4 border-b border-slate-200">
                    <button
                      onClick={exportToPDF}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                    >
                      <FileTextIcon className="w-4 h-4" />
                      Export PDF
                    </button>
                  </div>

                  {/* Report Content - Hidden for PDF generation */}
                  <div
                    id="summary-report-content"
                    className="space-y-8 print:block"
                    style={{ display: "block" }}
                  >
                    {/* Patient Context */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                      <h2 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <User className="w-6 h-6" />
                        Patient Context
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-1">
                            Patient Name:
                          </p>
                          <p className="text-slate-900">
                            {reportModal.report.patientContext.name ||
                              "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-1">
                            Condition:
                          </p>
                          <p className="text-slate-900">
                            {reportModal.report.patientContext.condition}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-1">
                            Location:
                          </p>
                          <p className="text-slate-900">
                            {reportModal.report.patientContext.location}
                          </p>
                        </div>
                        {reportModal.report.patientContext.keyConcerns?.length >
                          0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-1">
                              Key Concerns:
                            </p>
                            <p className="text-slate-900">
                              {reportModal.report.patientContext.keyConcerns.join(
                                ", "
                              )}
                            </p>
                          </div>
                        )}
                        {reportModal.report.patientContext.interests?.length >
                          0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-1">
                              Interests:
                            </p>
                            <p className="text-slate-900">
                              {reportModal.report.patientContext.interests.join(
                                ", "
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Experts Section */}
                    {reportModal.report.experts?.length > 0 && (
                      <div>
                        <h2 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                          <Users className="w-6 h-6" />
                          Experts Selected ({reportModal.report.experts.length})
                        </h2>
                        <div className="space-y-4">
                          {reportModal.report.experts.map((expert, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
                            >
                              <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {expert.name}
                              </h3>
                              <div className="space-y-2 text-sm">
                                <p>
                                  <span className="font-semibold">
                                    Affiliation:
                                  </span>{" "}
                                  {expert.affiliation}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Specialty:
                                  </span>{" "}
                                  {expert.specialty}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Key Expertise:
                                  </span>{" "}
                                  {expert.keyExpertise}
                                </p>
                                {Array.isArray(expert.topPublications) &&
                                  expert.topPublications.length > 0 && (
                                    <div>
                                      <p className="font-semibold mb-1">
                                        Top Relevant Publications:
                                      </p>
                                      <ul className="list-disc list-inside space-y-1 ml-2">
                                        {expert.topPublications.map(
                                          (pub, pIdx) => (
                                            <li
                                              key={pIdx}
                                              className="text-slate-700"
                                            >
                                              <span className="font-medium">
                                                {pub.title}
                                              </span>{" "}
                                              ({pub.year}) – {pub.significance}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                <p>
                                  <span className="font-semibold">
                                    Why relevant:
                                  </span>{" "}
                                  {expert.relevance}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Contact:
                                  </span>{" "}
                                  {expert.contact}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Publications Section */}
                    {reportModal.report.publications?.length > 0 && (
                      <div>
                        <h2 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                          <FileText className="w-6 h-6" />
                          Publications Selected (
                          {reportModal.report.publications.length})
                        </h2>
                        <div className="space-y-4">
                          {reportModal.report.publications.map((pub, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
                            >
                              <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {pub.title}
                              </h3>
                              <div className="space-y-2 text-sm">
                                <p>
                                  <span className="font-semibold">
                                    Authors:
                                  </span>{" "}
                                  {pub.authors}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Journal:
                                  </span>{" "}
                                  {pub.journal} ({pub.year})
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Key Finding:
                                  </span>{" "}
                                  {pub.keyFinding}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Relevance to patient:
                                  </span>{" "}
                                  {pub.clinicalRelevance}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Level of evidence:
                                  </span>{" "}
                                  {pub.evidenceLevel}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clinical Trials Section */}
                    {reportModal.report.trials?.length > 0 && (
                      <div>
                        <h2 className="text-2xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                          <Beaker className="w-6 h-6" />
                          Clinical Trials Selected (
                          {reportModal.report.trials.length})
                        </h2>
                        <div className="space-y-4">
                          {reportModal.report.trials.map((trial, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm"
                            >
                              <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {trial.title}
                              </h3>
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <p>
                                    <span className="font-semibold">
                                      Phase:
                                    </span>{" "}
                                    {trial.phase}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Status:
                                    </span>{" "}
                                    {trial.status}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Condition:
                                    </span>{" "}
                                    {trial.condition}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Location:
                                    </span>{" "}
                                    {trial.location}
                                  </p>
                                </div>
                                <p>
                                  <span className="font-semibold">
                                    Intervention:
                                  </span>{" "}
                                  {trial.intervention}
                                </p>
                                {trial.eligibilitySnapshot && (
                                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <p className="font-semibold mb-2">
                                      Eligibility Snapshot:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <p>
                                        <span className="font-medium">
                                          Age:
                                        </span>{" "}
                                        {trial.eligibilitySnapshot.age}
                                      </p>
                                      <p>
                                        <span className="font-medium">
                                          Gender:
                                        </span>{" "}
                                        {trial.eligibilitySnapshot.gender}
                                      </p>
                                      <p>
                                        <span className="font-medium">
                                          Key Inclusion:
                                        </span>{" "}
                                        {trial.eligibilitySnapshot.keyInclusion}
                                      </p>
                                      <p>
                                        <span className="font-medium">
                                          Key Exclusion:
                                        </span>{" "}
                                        {trial.eligibilitySnapshot.keyExclusion}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                <p>
                                  <span className="font-semibold">
                                    Goal of Study:
                                  </span>{" "}
                                  {trial.goal}
                                </p>
                                <p>
                                  <span className="font-semibold">
                                    Why relevant to patient:
                                  </span>{" "}
                                  {trial.relevance}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Doctor Notes Section */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        Doctor Notes
                      </h2>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-slate-200 min-h-[100px]">
                          <p className="text-slate-400 text-sm">
                            [Space for clinical notes and discussion]
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-slate-200 min-h-[100px]">
                          <p className="text-slate-400 text-sm">
                            [Additional notes]
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-200">
                      <p>
                        Generated on{" "}
                        {new Date(
                          reportModal.report.generatedAt
                        ).toLocaleString()}
                      </p>
                      <p className="mt-1">
                        Collabiora - Personalized Medical Research Platform
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

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
