import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  BookOpen,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Info,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  ListChecks,
  CheckCircle,
  AlertCircle,
  Heart,
} from "lucide-react";

export default function PublicationDetails() {
  const { pmid } = useParams();
  const navigate = useNavigate();
  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublicationDetails() {
      if (!pmid) {
        toast.error("No publication ID provided");
        navigate("/publications");
        return;
      }

      setLoading(true);
      try {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        
        // Fetch original publication details (not simplified)
        const response = await fetch(`${base}/api/search/publication/${pmid}`);

        if (!response.ok) {
          throw new Error("Failed to fetch publication details");
        }

        const data = await response.json();
        if (data.publication) {
          setPublication(data.publication);
        } else {
          toast.error("Publication not found");
          navigate("/publications");
        }
      } catch (error) {
        console.error("Error fetching publication details:", error);
        toast.error("Failed to load publication details");
        navigate("/publications");
      } finally {
        setLoading(false);
      }
    }

    fetchPublicationDetails();
  }, [pmid, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: "#2F3C96" }}
          />
          <p className="text-lg font-medium" style={{ color: "#787878" }}>
            Loading publication details...
          </p>
        </div>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-lg font-medium mb-4" style={{ color: "#787878" }}>
            Publication not found
          </p>
          <button
            onClick={() => navigate("/publications")}
            className="px-4 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: "#2F3C96" }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
            style={{ color: "#2F3C96" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#253075")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2F3C96")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div
            className="bg-white rounded-xl shadow-sm border p-6"
            style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "rgba(208, 196, 226, 0.2)" }}
              >
                <FileText className="w-8 h-8" style={{ color: "#2F3C96" }} />
              </div>
              <div className="flex-1">
                <h1
                  className="text-2xl font-bold mb-3"
                  style={{ color: "#2F3C96" }}
                >
                  {publication.simplifiedTitle ||
                    publication.title ||
                    "Untitled Publication"}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {publication.pmid && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "rgba(47, 60, 150, 0.15)",
                        color: "#2F3C96",
                        borderColor: "rgba(47, 60, 150, 0.3)",
                      }}
                    >
                      <FileText className="w-3 h-3 mr-1.5" />
                      PMID: {publication.pmid}
                    </span>
                  )}
                  {publication.journal && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        color: "#787878",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {publication.journal}
                    </span>
                  )}
                  {publication.doi && (
                    <span
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border"
                      style={{
                        backgroundColor: "rgba(208, 196, 226, 0.2)",
                        color: "#787878",
                        borderColor: "rgba(208, 196, 226, 0.3)",
                      }}
                    >
                      DOI: {publication.doi.length > 30
                        ? `${publication.doi.substring(0, 30)}...`
                        : publication.doi}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Abstract Section */}
            {(publication.simplifiedDetails?.abstract ||
              publication.abstract) && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <Info className="w-5 h-5" />
                  Abstract
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails?.abstract ||
                    publication.abstract}
                </p>
              </div>
            )}

            {/* Affiliations Section */}
            {publication.affiliations &&
              publication.affiliations.length > 0 && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <MapPin className="w-5 h-5" />
                    Affiliation
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#787878" }}
                  >
                    {publication.affiliations[0]}
                  </p>
                </div>
              )}

            {/* Publication Types */}
            {publication.publicationTypes &&
              publication.publicationTypes.length > 0 && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <FileText className="w-5 h-5" />
                    Publication Type
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {publication.publicationTypes.map((type, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border"
                        style={{
                          backgroundColor: "rgba(208, 196, 226, 0.2)",
                          color: "#787878",
                          borderColor: "rgba(208, 196, 226, 0.3)",
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Methods Section */}
            {publication.simplifiedDetails?.methods && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <ListChecks className="w-5 h-5" />
                  Methods
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.methods}
                </p>
              </div>
            )}

            {/* Results Section */}
            {publication.simplifiedDetails?.results && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <TrendingUp className="w-5 h-5" />
                  Results
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.results}
                </p>
              </div>
            )}

            {/* Conclusion Section */}
            {publication.simplifiedDetails?.conclusion && (
              <div
                className="bg-white rounded-xl p-6 border shadow-sm"
                style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <CheckCircle className="w-5 h-5" />
                  Conclusion
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.conclusion}
                </p>
              </div>
            )}

            {/* Key Takeaways Section */}
            {publication.simplifiedDetails?.keyTakeaways &&
              publication.simplifiedDetails.keyTakeaways.length > 0 && (
                <div
                  className="bg-gradient-to-br rounded-xl p-6 border shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(232, 224, 239, 0.4), rgba(245, 242, 248, 0.6))",
                    borderColor: "rgba(208, 196, 226, 0.3)",
                  }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <AlertCircle className="w-5 h-5" />
                    Key Takeaways
                  </h2>
                  <ul className="space-y-3">
                    {publication.simplifiedDetails.keyTakeaways.map(
                      (takeaway, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm"
                          style={{ color: "#787878" }}
                        >
                          <span
                            className="mt-1.5 shrink-0 w-2 h-2 rounded-full"
                            style={{ backgroundColor: "#2F3C96" }}
                          ></span>
                          <span>{takeaway}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {/* What This Means For You Section */}
            {publication.simplifiedDetails?.whatThisMeansForYou && (
              <div
                className="bg-gradient-to-br rounded-xl p-6 border shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(232, 233, 242, 1), rgba(245, 242, 248, 1))",
                  borderColor: "rgba(163, 167, 203, 1)",
                }}
              >
                <h2
                  className="font-bold mb-4 flex items-center gap-2 text-lg"
                  style={{ color: "#2F3C96" }}
                >
                  <Heart className="w-5 h-5" />
                  What This Means For You
                </h2>
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "#787878" }}
                >
                  {publication.simplifiedDetails.whatThisMeansForYou}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Authors Section */}
            {publication.authors &&
              Array.isArray(publication.authors) &&
              publication.authors.length > 0 && (
                <div
                  className="bg-white rounded-xl p-6 border shadow-sm"
                  style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
                >
                  <h2
                    className="font-bold mb-4 flex items-center gap-2 text-lg"
                    style={{ color: "#2F3C96" }}
                  >
                    <User className="w-5 h-5" />
                    Authors
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#787878" }}
                  >
                    {publication.authors.join(", ")}
                  </p>
                  {publication.authors.length > 1 && (
                    <p
                      className="text-xs mt-3"
                      style={{ color: "#787878" }}
                    >
                      {publication.authors.length} authors
                    </p>
                  )}
                </div>
              )}

            {/* Publication Information */}
            <div
              className="bg-white rounded-xl p-6 border shadow-sm"
              style={{ borderColor: "rgba(208, 196, 226, 0.3)" }}
            >
              <h2
                className="font-bold mb-4 flex items-center gap-2 text-lg"
                style={{ color: "#2F3C96" }}
              >
                <Info className="w-5 h-5" />
                Publication Information
              </h2>
              <div className="space-y-4">
                {/* Publication Date */}
                {(publication.year || publication.month) && (
                  <div className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium flex items-center gap-2"
                      style={{ color: "#787878" }}
                    >
                      <Calendar className="w-4 h-4" />
                      Published:
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.month ? `${publication.month} ` : ""}
                      {publication.day ? `${publication.day}, ` : ""}
                      {publication.year || "N/A"}
                    </span>
                  </div>
                )}

                {/* Journal */}
                {publication.journal && (
                  <div className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium flex items-center gap-2"
                      style={{ color: "#787878" }}
                    >
                      <BookOpen className="w-4 h-4" />
                      Journal:
                    </span>
                    <span
                      className="text-sm font-semibold text-right max-w-[60%]"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.journal}
                    </span>
                  </div>
                )}

                {/* DOI */}
                {publication.doi && (
                  <div className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#787878" }}
                    >
                      DOI:
                    </span>
                    <span
                      className="text-sm font-semibold text-right max-w-[60%] break-words"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.doi}
                    </span>
                  </div>
                )}

                {/* PMID */}
                {publication.pmid && (
                  <div className="flex justify-between items-center py-2 border-b"
                    style={{ borderColor: "rgba(232, 224, 239, 1)" }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#787878" }}
                    >
                      PMID:
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#2F3C96" }}
                    >
                      {publication.pmid}
                    </span>
                  </div>
                )}

                {/* Keywords Section */}
                {publication.keywords &&
                  publication.keywords.length > 0 && (
                    <div className="py-2">
                      <span
                        className="text-sm font-medium block mb-3 flex items-center gap-2"
                        style={{ color: "#787878" }}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Keywords:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {publication.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border"
                            style={{
                              backgroundColor: "rgba(47, 60, 150, 0.15)",
                              color: "#2F3C96",
                              borderColor: "rgba(47, 60, 150, 0.3)",
                            }}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Action Button */}
            {publication.url && (
              <a
                href={publication.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md w-full"
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
          </div>
        </div>
      </div>
    </div>
  );
}

