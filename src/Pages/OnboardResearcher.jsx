import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import LocationInput from "../components/LocationInput.jsx";
import SpecialtyInput from "../components/SpecialtyInput.jsx";
import ResearchInterestInput from "../components/ResearchInterestInput.jsx";
import EmailVerificationStep from "../components/EmailVerificationStep.jsx";
import { useAuth0Social } from "../hooks/useAuth0Social.js";
import { generateUniqueUsernames } from "../utils/usernameSuggestions.js";
import {
  User,
  Microscope,
  MapPin,
  Mail,
  CheckCircle,
  Sparkles,
  ChevronRight,
  X,
  ChevronDown,
  GraduationCap,
  Briefcase,
  DollarSign,
  MessageSquare,
  Users,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function OnboardResearcher() {
  const [searchParams] = useSearchParams();
  const isOAuthFlow = searchParams.get("oauth") === "true";
  const initialStep = parseInt(searchParams.get("step") || "1", 10);

  const [step, setStep] = useState(initialStep);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [researchInterestInput, setResearchInterestInput] = useState("");
  const [researchInterests, setResearchInterests] = useState([]);
  const [location, setLocation] = useState("");
  const [institutionAffiliation, setInstitutionAffiliation] = useState("");
  const [orcid, setOrcid] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState([]);
  const [interestedInMeetings, setInterestedInMeetings] = useState(false);
  const [interestedInForums, setInterestedInForums] = useState(false);
  const [meetingRate, setMeetingRate] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [socialLoginLoading, setSocialLoginLoading] = useState(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  const navigate = useNavigate();
  
  // Generate 3 unique username suggestions (numbers used sparingly - only 30% chance)
  const [usernameSuggestions, setUsernameSuggestions] = useState(() => 
    generateUniqueUsernames(3, false)
  );
  
  // Function to refresh username suggestions
  const refreshUsernameSuggestions = () => {
    setUsernameSuggestions(generateUniqueUsernames(3, false));
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUsernameSuggestions && !event.target.closest('[data-username-suggestions]')) {
        setShowUsernameSuggestions(false);
      }
    };

    if (showUsernameSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUsernameSuggestions]);

  // Auth0 social login
  const {
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithApple,
    isConfigured: isAuth0Configured,
  } = useAuth0Social();

  // Pre-fill name from OAuth if available
  useEffect(() => {
    if (isOAuthFlow) {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.username) {
            const nameParts = user.username.split(" ");
            setFirstName(nameParts[0] || "");
            setLastName(nameParts.slice(1).join(" ") || "");
          }
        }
      } catch (e) {
        console.error("Failed to parse stored user:", e);
      }
    }
  }, [isOAuthFlow]);

  // Common research specialties
  const commonSpecialties = [
    "Oncology",
    "Cardiology",
    "Neurology",
    "Immunology",
    "Genetics",
    "Pharmacology",
    "Epidemiology",
    "Biostatistics",
    "Public Health",
    "Biomedical Engineering",
    "Molecular Biology",
    "Clinical Research",
    "Translational Research",
    "Precision Medicine",
    "Biotechnology",
  ];

  // Common research interests/keywords
  const commonResearchInterests = [
    "Clinical Trials",
    "Drug Development",
    "Biomarkers",
    "Personalized Medicine",
    "Immunotherapy",
    "Gene Therapy",
    "Stem Cell Research",
    "AI in Healthcare",
    "Machine Learning",
    "Data Science",
    "Biostatistics",
    "Epidemiology",
    "Public Health",
    "Health Policy",
    "Medical Devices",
  ];

  // Research skills options
  const researchSkills = [
    "Clinical Trials",
    "Industry Research",
    "Qualitative Research",
    "Quantitative Research",
    "Translational Research",
    "Public Health Research",
    "Regulatory / Compliance Research",
    "Academic Research",
  ];

  function capitalizeText(text) {
    if (!text || typeof text !== "string") return text;
    return text
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function handleResearchInterestSubmit(value) {
    const capitalized = capitalizeText(value);
    if (capitalized && !researchInterests.includes(capitalized)) {
      setResearchInterests((prev) => [...prev, capitalized]);
      setResearchInterestInput("");
    }
  }

  function toggleResearchInterest(interest) {
    setResearchInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  function handleSkillSubmit(value) {
    const capitalized = capitalizeText(value);
    if (capitalized && !skills.includes(capitalized)) {
      setSkills((prev) => [...prev, capitalized]);
      setSkillsInput("");
    }
  }

  function toggleSkill(skill) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function parseLocation(locationString) {
    if (!locationString) return { city: "", country: "" };
    const parts = locationString.split(",").map((s) => s.trim());
    if (parts.length > 1) {
      return {
        city: parts[0],
        country: parts.slice(1).join(", "),
      };
    }
    return { city: parts[0] || "", country: "" };
  }

  // Handle social login button clicks
  async function handleSocialLogin(provider) {
    // Check if terms are accepted before proceeding
    if (!agreedToTerms) {
      setShowTermsDialog(true);
      return;
    }

    setSocialLoginLoading(provider);
    setError("");

    // Prepare onboarding data to pass through OAuth flow
    const onboardingData = {
      role: "researcher",
      specialty,
      researchInterests,
      location: parseLocation(location),
      institutionAffiliation,
      orcid,
      skills,
      interestedInMeetings,
      interestedInForums,
      meetingRate,
    };

    try {
      if (provider === "google") {
        await loginWithGoogle({ onboardingData, screenHint: "signup" });
      } else if (provider === "microsoft") {
        await loginWithMicrosoft({ onboardingData, screenHint: "signup" });
      } else if (provider === "apple") {
        await loginWithApple({ onboardingData, screenHint: "signup" });
      }
    } catch (e) {
      console.error(`${provider} login error:`, e);
      setError(`Failed to sign up with ${provider}. Please try again.`);
      setSocialLoginLoading(null);
    }
  }

  // Handle OAuth profile completion
  async function handleOAuthComplete() {
    setLoading(true);
    setError("");

    if (researchInterests.length < 3) {
      setError("Please add at least 3 research interests/keywords");
      setLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      setLoading(false);
      return;
    }

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const token = localStorage.getItem("token");

    try {
      const locationData = parseLocation(location);
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = storedUser._id || storedUser.id;

      if (!userId) {
        throw new Error("User not found. Please sign in again.");
      }

      // Combine specialty and research interests
      const medicalInterests = [
        ...(specialty ? [specialty] : []),
        ...researchInterests,
      ];

      // Update user's medicalInterests
      await fetch(`${base}/api/auth/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          medicalInterests,
        }),
      });

      // Update profile
      const profile = {
        role: "researcher",
        researcher: {
          specialties: specialty ? [specialty] : [],
          interests: researchInterests,
          location: locationData,
          institutionAffiliation,
          orcid: orcid || undefined,
          skills,
          available: interestedInMeetings,
          interestedInMeetings,
          interestedInForums,
          meetingRate: meetingRate ? parseFloat(meetingRate) : undefined,
        },
      };

      await fetch(`${base}/api/profile/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      // Ensure emailVerified is false for OAuth users too
      const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
      updatedUser.emailVerified = false;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // DO NOT dispatch login event until email is verified

      // Send verification email for OAuth users too
      try {
        const verifyRes = await fetch(`${base}/api/auth/send-verification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          // Store OTP expiry if provided
          const userEmail = updatedUser.email || email;
          if (verifyData.otpExpiresAt && userEmail) {
            localStorage.setItem(`otp_expiry_${userEmail}`, verifyData.otpExpiresAt);
          }
        }
      } catch (e) {
        console.error("Failed to send verification email:", e);
        // Continue to verification step anyway
      }

      // Move to verification step instead of dashboard
      setStep(6);
      setLoading(false);
    } catch (e) {
      console.error("OAuth profile completion error:", e);
      setError(e.message || "Failed to save profile. Please try again.");
      setLoading(false);
    }
  }

  async function handleComplete() {
    setError("");

    // If OAuth flow, just save profile and redirect
    if (isOAuthFlow) {
      await handleOAuthComplete();
      return;
    }

    // Validation
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (password.length < 6)
      return setError("Password must be at least 6 characters");
    if (!email) return setError("Email is required");
    if (researchInterests.length < 3) {
      return setError("Please add at least 3 research interests/keywords");
    }
    if (!agreedToTerms) {
      return setError(
        "Please agree to the Terms of Service and Privacy Policy"
      );
    }

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const username = `${firstName} ${lastName}`.trim();
      const locationData = parseLocation(location);
      const medicalInterests = [
        ...(specialty ? [specialty] : []),
        ...researchInterests,
      ];

      const registerRes = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          role: "researcher",
          medicalInterests,
          handle: handle.trim() || undefined,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        setError(registerData.error || "Registration failed");
        setLoading(false);
        return;
      }

      const user = registerData.user;
      localStorage.setItem("token", registerData.token);
      // Don't set emailVerified to true - user needs to verify first
      user.emailVerified = false;
      localStorage.setItem("user", JSON.stringify(user));
      // DO NOT dispatch login event until email is verified

      // Create profile
      const profile = {
        role: "researcher",
        researcher: {
          specialties: specialty ? [specialty] : [],
          interests: researchInterests,
          location: locationData,
          institutionAffiliation,
          orcid: orcid || undefined,
          skills,
          available: interestedInMeetings,
          interestedInMeetings,
          interestedInForums,
          meetingRate: meetingRate ? parseFloat(meetingRate) : undefined,
        },
      };

      await fetch(`${base}/api/profile/${user._id || user.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${registerData.token}`,
        },
        body: JSON.stringify(profile),
      });

      // Send verification email
      try {
        const verifyRes = await fetch(`${base}/api/auth/send-verification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${registerData.token}`,
          },
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          // Store OTP expiry if provided
          if (verifyData.otpExpiresAt) {
            localStorage.setItem(`otp_expiry_${email}`, verifyData.otpExpiresAt);
          }
        }
      } catch (e) {
        console.error("Failed to send verification email:", e);
        // Continue to verification step anyway
      }

      // Move to verification step instead of dashboard
      setStep(6);
      setLoading(false);
    } catch (e) {
      console.error("Registration error:", e);
      setError("Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  const steps = [
    { id: 1, label: "Your Name", icon: User },
    { id: 2, label: "Research Info", icon: Microscope },
    { id: 3, label: "Background", icon: GraduationCap },
    { id: 4, label: "Preferences", icon: MessageSquare },
    { id: 5, label: "Account", icon: Mail },
    { id: 6, label: "Verify Email", icon: CheckCircle },
  ];

  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  // Close gender dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isGenderDropdownOpen &&
        !event.target.closest("[data-gender-dropdown]")
      ) {
        setIsGenderDropdownOpen(false);
      }
    };

    if (isGenderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isGenderDropdownOpen]);

  // Close skills dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSkillsDropdownOpen &&
        !event.target.closest("[data-skills-dropdown]")
      ) {
        setIsSkillsDropdownOpen(false);
      }
    };

    if (isSkillsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSkillsDropdownOpen]);

  // Inject scrollbar styles for skills dropdown
  useEffect(() => {
    const styleId = "skills-dropdown-scrollbar-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .skills-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .skills-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .skills-dropdown::-webkit-scrollbar-thumb {
          background-color: rgba(47, 60, 150, 0.3);
          border-radius: 3px;
        }
        .skills-dropdown::-webkit-scrollbar-thumb:hover {
          background-color: rgba(47, 60, 150, 0.5);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10 pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl"
          >
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-center relative">
                <div
                  className="absolute top-5 left-[12%] right-[12%] h-[2px]"
                  style={{ backgroundColor: "rgba(120, 120, 120, 0.15)" }}
                />
                <motion.div
                  className="absolute top-5 left-[12%] h-[2px]"
                  style={{ backgroundColor: "#2F3C96" }}
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${Math.max(
                      0,
                      ((step - 1) / (steps.length - 1)) * 76
                    )}%`,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />

                <div className="flex items-center justify-between w-full max-w-lg">
                  {steps.map((s, index) => {
                    const Icon = s.icon;
                    const isActive = step === s.id;
                    const isCompleted = step > s.id;
                    return (
                      <div
                        key={s.id}
                        className="flex flex-col items-center relative z-10"
                      >
                        <div className="relative">
                          <motion.div
                            className="w-10 h-10 rounded-full flex items-center justify-center relative z-10"
                            style={{
                              backgroundColor:
                                isCompleted || isActive ? "#2F3C96" : "#F5F5F5",
                              color:
                                isCompleted || isActive ? "#FFFFFF" : "#787878",
                              border: isActive
                                ? "2px solid #D0C4E2"
                                : "2px solid transparent",
                              boxShadow: isActive
                                ? "0 2px 8px rgba(208, 196, 226, 0.4)"
                                : isCompleted
                                ? "0 1px 4px rgba(47, 60, 150, 0.1)"
                                : "none",
                            }}
                            animate={{
                              backgroundColor:
                                isCompleted || isActive ? "#2F3C96" : "#F5F5F5",
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: "backOut",
                                }}
                              >
                                <CheckCircle size={16} />
                              </motion.div>
                            ) : (
                              <Icon size={16} />
                            )}
                          </motion.div>
                        </div>
                        <span
                          className="text-xs font-medium mt-1.5"
                          style={{
                            color:
                              isActive || isCompleted ? "#2F3C96" : "#787878",
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Card */}
            <motion.div
              className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border p-3 sm:p-4"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 10px 40px rgba(208, 196, 226, 0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
              }}
            >
              {/* Unified Section Heading */}
              <div className="text-center mb-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2
                      className="text-xl font-bold mb-0.5"
                      style={{ color: "#2F3C96" }}
                    >
                      {step === 1 && "Let's get started"}
                      {step === 2 && "Research Information"}
                      {step === 3 && "Background & Skills"}
                      {step === 4 && "Preferences & Availability"}
                      {step === 5 && "Create Your Account"}
                      {step === 6 && "Verify Your Email"}
                    </h2>
                    <p className="text-xs" style={{ color: "#787878" }}>
                      {step === 1 &&
                        "Tell us your name to personalize your experience"}
                      {step === 2 &&
                        "Share your specialty and research interests (at least 3 keywords)"}
                      {step === 3 && "Add your education, skills, and location"}
                      {step === 4 &&
                        "Let us know your availability and meeting preferences"}
                      {step === 5 &&
                        "Almost there! Set up your account to get started"}
                      {step === 6 &&
                        "Just before you get started, verify yourself"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: Name */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-2.5"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          First Name
                        </label>
                        <Input
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            firstName &&
                            lastName &&
                            setStep(2)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          Last Name
                        </label>
                        <Input
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            firstName &&
                            lastName &&
                            setStep(2)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Handle / Username
                        <span className="ml-1 text-xs font-normal" style={{ color: "#787878" }}>
                          (Optional)
                        </span>
                      </label>
                      <div className="relative" data-username-suggestions>
                        <Input
                          placeholder="@username or choose from suggestions"
                          value={handle}
                          onChange={(e) => {
                            // Remove @ if user types it, we'll add it for display
                            let value = e.target.value.replace(/^@+/, "");
                            setHandle(value);
                            setShowUsernameSuggestions(value.length === 0);
                          }}
                          onFocus={() => setShowUsernameSuggestions(true)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            firstName &&
                            lastName &&
                            setStep(2)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                        {showUsernameSuggestions && usernameSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg" style={{ borderColor: "#E8E8E8" }}>
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold" style={{ color: "#2F3C96" }}>
                                  Suggested usernames:
                                </p>
                                <button
                                  type="button"
                                  onClick={refreshUsernameSuggestions}
                                  className="flex items-center gap-1 text-xs transition-colors"
                                  style={{ color: "#2F3C96" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#253075";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#2F3C96";
                                  }}
                                  title="Refresh suggestions"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Refresh</span>
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {usernameSuggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setHandle(suggestion);
                                      setShowUsernameSuggestions(false);
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                                    style={{
                                      backgroundColor: "#2F3C961A",
                                      color: "#2F3C96",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#2F3C9633";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "#2F3C961A";
                                    }}
                                  >
                                    @{suggestion}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowUsernameSuggestions(false)}
                                className="text-xs hover:underline"
                                style={{ color: "#787878" }}
                              >
                                Hide suggestions
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#787878" }}>
                        Your unique handle (optional) - Choose from suggestions or type your own
                      </p>
                    </div>

                    <Button
                      onClick={() => firstName && lastName && setStep(2)}
                      disabled={!firstName || !lastName}
                      className="w-full py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{
                        backgroundColor: "#2F3C96",
                        color: "#FFFFFF",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = "#474F97";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(208, 196, 226, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#2F3C96";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      Continue →
                    </Button>

                    <div className="text-center pt-1">
                      <p className="text-xs" style={{ color: "#787878" }}>
                        Are you a Patient?{" "}
                        <a
                          href="/onboard/patient"
                          className="underline hover:opacity-80 transition-opacity font-medium"
                          style={{ color: "#2F3C96" }}
                        >
                          Sign up here
                        </a>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Research Info */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Specialty */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Medical Specialty
                      </label>
                      <SpecialtyInput
                        value={specialty}
                        onChange={setSpecialty}
                        placeholder="e.g. Oncology, Cardiology"
                        maxSuggestions={8}
                        inputClassName="w-full py-1.5 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    {/* Research Interests */}
                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Research Interests{" "}
                        <span
                          className="text-[10px] font-normal"
                          style={{ color: "#787878" }}
                        >
                          (At least 3 required)
                        </span>
                      </label>
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <ResearchInterestInput
                            value={researchInterestInput}
                            onChange={setResearchInterestInput}
                            onSelect={(term) => {
                              handleResearchInterestSubmit(term);
                            }}
                            placeholder="Search research interests from MeSH database..."
                            maxSuggestions={8}
                            inputClassName="w-full py-1.5 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                            onKeyPress={(e) => {
                              if (
                                e.key === "Enter" &&
                                researchInterestInput.trim()
                              ) {
                                e.preventDefault();
                                handleResearchInterestSubmit(
                                  researchInterestInput
                                );
                              }
                            }}
                          />
                        </div>
                        {researchInterestInput &&
                          researchInterestInput.trim().length >= 2 &&
                          !researchInterests.includes(
                            capitalizeText(researchInterestInput.trim())
                          ) && (
                            <Button
                              onClick={() =>
                                handleResearchInterestSubmit(
                                  researchInterestInput
                                )
                              }
                              className="px-3 py-1.5 rounded-lg font-semibold text-sm transition-all"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#FFFFFF",
                              }}
                            >
                              Add
                            </Button>
                          )}
                      </div>

                      {/* Selected Research Interests Chips */}
                      {researchInterests.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {researchInterests.map((interest, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.2)",
                                color: "#2F3C96",
                              }}
                            >
                              <Sparkles size={7} style={{ color: "#2F3C96" }} />
                              {interest}
                              <button
                                type="button"
                                onClick={() => toggleResearchInterest(interest)}
                                className="ml-0.5 hover:opacity-70 transition-opacity"
                                style={{ color: "#787878" }}
                              >
                                <X size={8} />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      )}

                      {researchInterests.length < 3 && (
                        <p className="text-[10px]" style={{ color: "#DC2626" }}>
                          {3 - researchInterests.length} more required
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => setStep(1)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep(3)}
                        disabled={researchInterests.length < 3}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = "#474F97";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(208, 196, 226, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#2F3C96";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        Continue →
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Background & Skills */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Location */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Location
                      </label>
                      <LocationInput
                        value={location}
                        onChange={setLocation}
                        placeholder="e.g. New York, USA or City, Country"
                        inputClassName="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                      />
                    </div>

                    {/* Institution */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Institution
                      </label>
                      <Input
                        placeholder="e.g. Harvard Medical School, MIT, Johns Hopkins University"
                        value={institutionAffiliation}
                        onChange={(e) =>
                          setInstitutionAffiliation(e.target.value)
                        }
                        className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    {/* ORCID */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        ORCID ID
                        <span
                          className="text-[10px] font-normal ml-1"
                          style={{ color: "#787878" }}
                        >
                          (Optional)
                        </span>
                      </label>
                      <Input
                        placeholder="e.g. 0000-0000-0000-0000"
                        value={orcid}
                        onChange={(e) => setOrcid(e.target.value)}
                        className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "#787878" }}
                      >
                        Your ORCID ID helps link your research activities and
                        publications
                      </p>
                    </div>

                    {/* Skills */}
                    <div className="space-y-1.5" data-skills-dropdown>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Skills
                      </label>
                      <div className="relative" style={{ overflow: "visible" }}>
                        <button
                          type="button"
                          onClick={() =>
                            setIsSkillsDropdownOpen(!isSkillsDropdownOpen)
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 flex items-center justify-between"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            backgroundColor: "#FFFFFF",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        >
                          <span
                            className="text-xs"
                            style={{
                              color: skills.length > 0 ? "#2F3C96" : "#787878",
                            }}
                          >
                            {skills.length > 0
                              ? `${skills.length} skill${
                                  skills.length > 1 ? "s" : ""
                                } selected`
                              : "Select research skills"}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${
                              isSkillsDropdownOpen ? "rotate-180" : ""
                            }`}
                            style={{ color: "#787878" }}
                          />
                        </button>
                        {isSkillsDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto skills-dropdown"
                            style={{
                              borderColor: "#E8E8E8",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                              top: "100%",
                              left: 0,
                              scrollbarWidth: "thin",
                              scrollbarColor:
                                "rgba(47, 60, 150, 0.3) transparent",
                            }}
                          >
                            {researchSkills.map((skill) => (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => {
                                  toggleSkill(skill);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-opacity-10 transition-all flex items-center gap-2"
                                style={{
                                  backgroundColor: skills.includes(skill)
                                    ? "rgba(47, 60, 150, 0.1)"
                                    : "transparent",
                                  color: "#2F3C96",
                                }}
                                onMouseEnter={(e) => {
                                  if (!skills.includes(skill)) {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(208, 196, 226, 0.1)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!skills.includes(skill)) {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }
                                }}
                              >
                                <div
                                  className="w-3.5 h-3.5 rounded border flex items-center justify-center"
                                  style={{
                                    borderColor: skills.includes(skill)
                                      ? "#2F3C96"
                                      : "#E8E8E8",
                                    backgroundColor: skills.includes(skill)
                                      ? "#2F3C96"
                                      : "transparent",
                                  }}
                                >
                                  {skills.includes(skill) && (
                                    <CheckCircle
                                      size={10}
                                      style={{ color: "#FFFFFF" }}
                                    />
                                  )}
                                </div>
                                <span>{skill}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {skills.map((skill, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: "rgba(208, 196, 226, 0.1)",
                                color: "#2F3C96",
                              }}
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className="ml-0.5 hover:opacity-70"
                                style={{ color: "#787878" }}
                              >
                                <X size={8} />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        <p className="text-xs">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => setStep(2)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep(4)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = "#474F97";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(208, 196, 226, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#2F3C96";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        Continue →
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Preferences & Availability */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Meeting Rate */}
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        <DollarSign size={12} className="inline mr-1" />
                        Rate per 30 minutes (USD)
                        <span
                          className="text-[10px] font-normal ml-1"
                          style={{ color: "#787878" }}
                        >
                          (Optional)
                        </span>
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 100"
                        value={meetingRate}
                        onChange={(e) => setMeetingRate(e.target.value)}
                        className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    {/* Interests */}
                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Interests
                      </label>
                      <label
                        className="flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer hover:bg-opacity-5 transition-all"
                        style={{
                          borderColor: interestedInMeetings
                            ? "#2F3C96"
                            : "#E8E8E8",
                          backgroundColor: interestedInMeetings
                            ? "rgba(47, 60, 150, 0.05)"
                            : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={interestedInMeetings}
                          onChange={(e) =>
                            setInterestedInMeetings(e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded"
                          style={{ accentColor: "#2F3C96" }}
                        />
                        <MessageSquare size={14} style={{ color: "#2F3C96" }} />
                        <span
                          className="text-xs font-medium"
                          style={{ color: "#2F3C96" }}
                        >
                          Interested in video meetings with patients
                        </span>
                      </label>
                      <label
                        className="flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer hover:bg-opacity-5 transition-all"
                        style={{
                          borderColor: interestedInForums
                            ? "#2F3C96"
                            : "#E8E8E8",
                          backgroundColor: interestedInForums
                            ? "rgba(47, 60, 150, 0.05)"
                            : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={interestedInForums}
                          onChange={(e) =>
                            setInterestedInForums(e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded"
                          style={{ accentColor: "#2F3C96" }}
                        />
                        <Users size={14} style={{ color: "#2F3C96" }} />
                        <span
                          className="text-xs font-medium"
                          style={{ color: "#2F3C96" }}
                        >
                          Interested in participating in forums
                        </span>
                      </label>
                    </div>

                    {/* Terms & Conditions (for OAuth flow) */}
                    {isOAuthFlow && (
                      <div
                        className="p-2 rounded-lg border"
                        style={{ borderColor: "#E8E8E8" }}
                      >
                        <label className="flex items-start gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-0.5 w-3.5 h-3.5 rounded"
                            style={{ accentColor: "#2F3C96" }}
                          />
                          <span
                            className="text-xs"
                            style={{ color: "#787878" }}
                          >
                            I agree to the{" "}
                            <a
                              href="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:opacity-80 transition-opacity"
                              style={{ color: "#2F3C96" }}
                            >
                              Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:opacity-80 transition-opacity"
                              style={{ color: "#2F3C96" }}
                            >
                              Privacy Policy
                            </a>
                          </span>
                        </label>
                      </div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        <p className="text-xs">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => setStep(3)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      {isOAuthFlow ? (
                        <Button
                          onClick={() => handleOAuthComplete()}
                          disabled={loading || !agreedToTerms}
                          className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          style={{
                            backgroundColor: "#2F3C96",
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = "#474F97";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(208, 196, 226, 0.4)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#2F3C96";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {loading ? "Saving..." : "Complete →"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setStep(5)}
                          className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          style={{
                            backgroundColor: "#2F3C96",
                            color: "#FFFFFF",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = "#474F97";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(208, 196, 226, 0.4)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#2F3C96";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          Continue →
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Account Creation */}
                {step === 5 && !isOAuthFlow && (
                  <motion.div
                    key="step5"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Social Sign-In Options - At Top */}
                    {isAuth0Configured && (
                      <div className="space-y-2">
                        <p
                          className="text-xs text-center font-medium"
                          style={{ color: "#787878" }}
                        >
                          Sign up with
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {/* Google Button */}
                          <motion.button
                            type="button"
                            disabled={
                              socialLoginLoading !== null || !agreedToTerms
                            }
                            whileHover={{
                              scale:
                                socialLoginLoading || !agreedToTerms ? 1 : 1.02,
                              backgroundColor:
                                socialLoginLoading || !agreedToTerms
                                  ? "rgba(208, 196, 226, 0.08)"
                                  : "rgba(208, 196, 226, 0.15)",
                            }}
                            whileTap={{
                              scale:
                                socialLoginLoading || !agreedToTerms ? 1 : 0.98,
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg border transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.08)",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                            }}
                            onClick={() => handleSocialLogin("google")}
                          >
                            {socialLoginLoading === "google" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(47, 60, 150, 0.3)",
                                  borderTopColor: "#2F3C96",
                                }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  fill="#4285F4"
                                />
                                <path
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  fill="#34A853"
                                />
                                <path
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                  fill="#FBBC05"
                                />
                                <path
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                  fill="#EA4335"
                                />
                              </svg>
                            )}
                            <span className="text-[8px] font-medium leading-tight">
                              Google
                            </span>
                          </motion.button>

                          {/* Microsoft Button */}
                          <motion.button
                            type="button"
                            disabled={
                              socialLoginLoading !== null || !agreedToTerms
                            }
                            whileHover={{
                              scale:
                                socialLoginLoading || !agreedToTerms ? 1 : 1.02,
                              backgroundColor:
                                socialLoginLoading || !agreedToTerms
                                  ? "rgba(208, 196, 226, 0.08)"
                                  : "rgba(208, 196, 226, 0.15)",
                            }}
                            whileTap={{
                              scale:
                                socialLoginLoading || !agreedToTerms ? 1 : 0.98,
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg border transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.08)",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                            }}
                            onClick={() => handleSocialLogin("microsoft")}
                          >
                            {socialLoginLoading === "microsoft" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(0, 120, 212, 0.3)",
                                  borderTopColor: "#0078D4",
                                }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M11.4 11.4H3V3h8.4v8.4z"
                                  fill="#F25022"
                                />
                                <path
                                  d="M21 11.4h-8.4V3H21v8.4z"
                                  fill="#7FBA00"
                                />
                                <path
                                  d="M11.4 21H3v-8.4h8.4V21z"
                                  fill="#00A4EF"
                                />
                                <path
                                  d="M21 21h-8.4v-8.4H21V21z"
                                  fill="#FFB900"
                                />
                              </svg>
                            )}
                            <span className="text-[8px] font-medium leading-tight">
                              Microsoft
                            </span>
                          </motion.button>

                          {/* Apple Button */}
                          <motion.button
                            type="button"
                            disabled={
                              socialLoginLoading !== null || !agreedToTerms
                            }
                            whileHover={{
                              scale:
                                socialLoginLoading || !agreedToTerms ? 1 : 1.02,
                              backgroundColor:
                                socialLoginLoading || !agreedToTerms
                                  ? "rgba(208, 196, 226, 0.08)"
                                  : "rgba(208, 196, 226, 0.15)",
                            }}
                            whileTap={{
                              scale:
                                socialLoginLoading || !agreedToTerms ? 1 : 0.98,
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg border transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(208, 196, 226, 0.08)",
                              borderColor: "#D0C4E2",
                              color: "#2F3C96",
                            }}
                            onClick={() => handleSocialLogin("apple")}
                          >
                            {socialLoginLoading === "apple" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(0, 0, 0, 0.3)",
                                  borderTopColor: "#000000",
                                }}
                              />
                            ) : (
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                                  fill="#000000"
                                />
                              </svg>
                            )}
                            <span className="text-[8px] font-medium leading-tight">
                              Apple
                            </span>
                          </motion.button>
                        </div>

                        <div
                          className="flex items-center gap-2 py-1"
                          style={{ color: "#787878" }}
                        >
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: "#E8E8E8" }}
                          />
                          <span className="text-[10px]">or</span>
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: "#E8E8E8" }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Email & Password */}
                    <div className="space-y-2">
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          Email
                        </label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          Password
                        </label>
                        <Input
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: "#2F3C96" }}
                        >
                          Confirm Password
                        </label>
                        <Input
                          type="password"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            email &&
                            password &&
                            confirmPassword &&
                            !loading &&
                            handleComplete()
                          }
                          className="w-full py-1.5 px-2.5 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div
                      className="p-2 rounded-lg border"
                      style={{ borderColor: "#E8E8E8" }}
                    >
                      <label className="flex items-start gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded"
                          style={{ accentColor: "#2F3C96" }}
                        />
                        <span className="text-xs" style={{ color: "#787878" }}>
                          I agree to the{" "}
                          <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "#2F3C96" }}
                          >
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "#2F3C96" }}
                          >
                            Privacy Policy
                          </a>
                        </span>
                      </label>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-2 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        <p className="text-xs">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setStep(4)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleComplete}
                        disabled={
                          loading ||
                          !email ||
                          !password ||
                          !confirmPassword ||
                          !agreedToTerms
                        }
                        className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = "#474F97";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(208, 196, 226, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#2F3C96";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        {loading ? "Creating..." : "Complete →"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 6: Email Verification */}
                {step === 6 && (
                  <motion.div
                    key="step6"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <EmailVerificationStep
                      email={(() => {
                        if (email) return email;
                        const userData = JSON.parse(localStorage.getItem("user") || "{}");
                        return userData.email || "";
                      })()}
                      onVerified={() => {
                        // After verification, navigate to dashboard
                        const userData = JSON.parse(localStorage.getItem("user") || "{}");
                        const userRole = userData?.role || "researcher";
                        navigate(`/dashboard/${userRole}`);
                      }}
                      onResend={() => {
                        // Resend handled by EmailVerificationStep component
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Terms of Service Dialog */}
      <AnimatePresence>
        {showTermsDialog && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermsDialog(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="bg-white rounded-xl shadow-xl border p-6 max-w-md w-full"
                style={{
                  borderColor: "#D0C4E2",
                  boxShadow: "0 10px 40px rgba(208, 196, 226, 0.3)",
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="rounded-full p-2 shrink-0"
                    style={{
                      backgroundColor: "rgba(47, 60, 150, 0.1)",
                    }}
                  >
                    <AlertCircle size={24} style={{ color: "#2F3C96" }} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ color: "#2F3C96" }}
                    >
                      Agreement Required
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#787878" }}
                    >
                      To continue with social sign-in, please review and agree
                      to our{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "#2F3C96" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: "#2F3C96" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Privacy Policy
                      </a>
                      . This helps us protect your privacy and ensure a safe
                      experience.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={() => setShowTermsDialog(false)}
                    className="flex-1 py-2 rounded-lg font-semibold text-sm border transition-all"
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: "#787878",
                      borderColor: "#E8E8E8",
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowTermsDialog(false);
                      // Scroll to terms checkbox
                      const termsCheckbox = document.querySelector(
                        'input[type="checkbox"]'
                      );
                      if (termsCheckbox) {
                        termsCheckbox.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        // Highlight the checkbox area briefly
                        setTimeout(() => {
                          const termsContainer = termsCheckbox.closest("div");
                          if (termsContainer) {
                            termsContainer.style.transition =
                              "background-color 0.3s";
                            termsContainer.style.backgroundColor =
                              "rgba(208, 196, 226, 0.2)";
                            setTimeout(() => {
                              termsContainer.style.backgroundColor = "";
                            }, 2000);
                          }
                        }, 500);
                      }
                    }}
                    className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: "#2F3C96",
                      color: "#FFFFFF",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#474F97";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(208, 196, 226, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2F3C96";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    Go to Terms
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}
