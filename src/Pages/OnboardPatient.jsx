import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import LocationInput from "../components/LocationInput.jsx";
import { SMART_SUGGESTION_KEYWORDS } from "../utils/smartSuggestions.js";
import { useAuth0Social } from "../hooks/useAuth0Social.js";
import {
  User,
  Heart,
  MapPin,
  Mail,
  CheckCircle,
  Sparkles,
  ChevronRight,
  X,
  ChevronDown,
} from "lucide-react";

export default function OnboardPatient() {
  const [searchParams] = useSearchParams();
  const isOAuthFlow = searchParams.get("oauth") === "true";
  const initialStep = parseInt(searchParams.get("step") || "1", 10);

  const [step, setStep] = useState(initialStep);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [identifiedConditions, setIdentifiedConditions] = useState([]); // Track auto-identified conditions
  const [lastExtractedText, setLastExtractedText] = useState(""); // Track what was extracted
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isQuickSelectOpen, setIsQuickSelectOpen] = useState(false);
  const [showAllConditions, setShowAllConditions] = useState(false);
  const [socialLoginLoading, setSocialLoginLoading] = useState(null); // Track which social login is loading
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  // Auth0 social login
  const {
    loginWithGoogle,
    loginWithMicrosoft,
    loginWithFacebook,
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

  // Common medical conditions
  const commonConditions = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Prostate Cancer",
    "Breast Cancer",
    "Lung Cancer",
    "Asthma",
    "Arthritis",
    "Depression",
    "Anxiety",
    "Chronic Pain",
    "Migraine",
    "Obesity",
    "High Cholesterol",
    "Thyroid Disorder",
    "Sleep Apnea",
    "COPD",
    "Epilepsy",
    "Parkinson's Disease",
    "Alzheimer's Disease",
    "Multiple Sclerosis",
    "Crohn's Disease",
    "IBD",
    "Osteoporosis",
    "Fibromyalgia",
    "Lupus",
    "Rheumatoid Arthritis",
  ];

  function capitalizeMedicalCondition(condition) {
    if (!condition || typeof condition !== "string") return condition;
    condition = condition.trim();
    if (!condition) return condition;

    const words = condition.split(/\s+/);
    const capitalizedWords = words.map((word) => {
      if (!word) return word;
      if (word.includes("'")) {
        const parts = word.split("'");
        return parts
          .map((part) => {
            if (!part) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("'");
      }
      if (word.length <= 4 && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return capitalizedWords.join(" ");
  }

  async function extractConditions(text) {
    if (!text || text.length < 5) return;
    setIsExtracting(true);
    setLastExtractedText(text);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${base}/api/ai/extract-conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json());
      if (res.conditions?.length > 0) {
        const capitalizedConditions = res.conditions.map(
          capitalizeMedicalCondition
        );
        // Add to identified conditions (for display)
        setIdentifiedConditions((prev) => {
          const newConditions = capitalizedConditions.filter(
            (c) => !prev.includes(c)
          );
          return [...prev, ...newConditions];
        });
        // Also add to selected conditions
        setSelectedConditions((prev) => {
          const newConditions = capitalizedConditions.filter(
            (c) => !prev.includes(c)
          );
          return [...prev, ...newConditions];
        });
        setConditionInput("");
      }
    } catch (e) {
      console.error("Condition extraction failed", e);
    } finally {
      setIsExtracting(false);
    }
  }

  function toggleCondition(condition) {
    setSelectedConditions((prev) => {
      if (prev.includes(condition)) {
        return prev.filter((c) => c !== condition);
      } else {
        return [...prev, condition];
      }
    });
    // If removing, also remove from identified if it was there
    if (selectedConditions.includes(condition)) {
      setIdentifiedConditions((prev) => prev.filter((c) => c !== condition));
    }
  }

  function handleConditionSubmit(value) {
    const capitalized = capitalizeMedicalCondition(value);
    if (capitalized && !selectedConditions.includes(capitalized)) {
      setSelectedConditions((prev) => [...prev, capitalized]);
      setConditionInput("");
      // Remove from identified if it was there (since user manually added it)
      setIdentifiedConditions((prev) => prev.filter((c) => c !== capitalized));
    }
  }

  function getCombinedConditions() {
    return [...new Set(selectedConditions)];
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
      setError(
        "Please agree to the Terms of Service and Privacy Policy before signing up"
      );
      return;
    }

    setSocialLoginLoading(provider);
    setError("");

    // Prepare onboarding data to pass through OAuth flow
    const onboardingData = {
      role: "patient",
      conditions: getCombinedConditions(),
      location: parseLocation(location),
      gender: gender.trim() || undefined,
    };

    try {
      if (provider === "google") {
        await loginWithGoogle({ onboardingData, screenHint: "signup" });
      } else if (provider === "microsoft") {
        await loginWithMicrosoft({ onboardingData, screenHint: "signup" });
      } else if (provider === "facebook") {
        await loginWithFacebook({ onboardingData, screenHint: "signup" });
      } else if (provider === "apple") {
        await loginWithApple({ onboardingData, screenHint: "signup" });
      }
    } catch (e) {
      console.error(`${provider} login error:`, e);
      setError(`Failed to sign up with ${provider}. Please try again.`);
      setSocialLoginLoading(null);
    }
  }

  // Handle OAuth profile completion (when coming back from OAuth with step=2)
  async function handleOAuthComplete() {
    setLoading(true);
    setError("");

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      setLoading(false);
      return;
    }

    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const token = localStorage.getItem("token");

    try {
      const conditionsArray = getCombinedConditions();
      const locationData = parseLocation(location);
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = storedUser._id || storedUser.id;

      if (!userId) {
        throw new Error("User not found. Please sign in again.");
      }

      // Update profile with conditions and location
      const profile = {
        role: "patient",
        patient: {
          conditions: conditionsArray,
          location: locationData,
          gender: gender.trim() || undefined,
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

      // Update user's medicalInterests
      await fetch(`${base}/api/auth/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          medicalInterests: conditionsArray,
        }),
      });

      navigate("/dashboard/patient");
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

    if (password !== confirmPassword) return setError("Passwords do not match");
    if (password.length < 6)
      return setError("Password must be at least 6 characters");
    if (!email) return setError("Email is required");

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const conditionsArray = getCombinedConditions();
      const username = `${firstName} ${lastName}`.trim();
      const locationData = parseLocation(location);

      const registerRes = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          role: "patient",
          medicalInterests: conditionsArray,
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
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("login"));

      const profile = {
        role: "patient",
        patient: {
          conditions: conditionsArray,
          location: locationData,
          gender: gender.trim() || undefined,
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

      navigate("/dashboard/patient");
    } catch (e) {
      console.error("Registration error:", e);
      setError("Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  const steps = [
    { id: 1, label: "Your Name", icon: User },
    { id: 2, label: "Conditions", icon: Heart },
    { id: 3, label: "Location", icon: MapPin },
    { id: 4, label: "Account", icon: Mail },
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

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xl"
          >
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-center relative">
                {/* Single centered line */}
                <div
                  className="absolute top-5 left-[12%] right-[12%] h-[2px]"
                  style={{ backgroundColor: "rgba(120, 120, 120, 0.15)" }}
                />
                {/* Animated progress line */}
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
                                transition={{ duration: 0.3, ease: "backOut" }}
                              >
                                <CheckCircle size={16} />
                              </motion.div>
                            ) : (
                              <Icon size={16} />
                            )}
                          </motion.div>
                        </div>
                        <span
                          className="text-[10px] font-medium mt-1.5"
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
                      className="text-lg font-bold mb-0.5"
                      style={{ color: "#2F3C96" }}
                    >
                      {step === 1 && "Let's get started"}
                      {step === 2 && "Medical Conditions"}
                      {step === 3 && "Your Location"}
                      {step === 4 && "Create Your Account"}
                    </h2>
                    <p className="text-[10px]" style={{ color: "#787878" }}>
                      {step === 1 &&
                        "Tell us your name to personalize your experience"}
                      {step === 2 &&
                        "Select or describe your conditions. We'll help identify them automatically."}
                      {step === 3 &&
                        "Help us find relevant clinical trials and experts near you"}
                      {step === 4 &&
                        "Almost there! Set up your account to get started"}
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
                          className="block text-[10px] font-semibold mb-1"
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
                          className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[10px] font-semibold mb-1"
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
                          className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => firstName && lastName && setStep(2)}
                      disabled={!firstName || !lastName}
                      className="w-full py-1.5 rounded-lg font-semibold text-xs transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

                    {/* Researcher redirect */}
                    <div
                      className="pt-2 mt-3 border-t"
                      style={{ borderColor: "#E8E8E8" }}
                    >
                      <p
                        className="text-[10px] text-center"
                        style={{ color: "#787878", opacity: 0.8 }}
                      >
                        Are you a researcher?{" "}
                        <button
                          onClick={() => navigate("/onboard/researcher")}
                          className="font-semibold underline hover:opacity-80 transition-opacity"
                          style={{ color: "#2F3C96" }}
                        >
                          Sign up here
                        </button>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Conditions */}
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
                    {/* Search Input */}
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <SmartSearchInput
                            value={conditionInput}
                            onChange={setConditionInput}
                            onSubmit={(value) => {
                              if (value && value.trim()) {
                                const trimmed = value.trim();
                                // Check if it's a direct condition match
                                const exactMatch = commonConditions.find(
                                  (c) =>
                                    c.toLowerCase() === trimmed.toLowerCase()
                                );
                                if (exactMatch) {
                                  handleConditionSubmit(exactMatch);
                                } else {
                                  // Check if it looks like symptoms
                                  const symptomKeywords = [
                                    "pain",
                                    "ache",
                                    "pressure",
                                    "high",
                                    "low",
                                    "difficulty",
                                    "trouble",
                                    "issue",
                                    "problem",
                                    "feeling",
                                    "symptom",
                                    "bp",
                                    "blood pressure",
                                    "breathing",
                                    "chest",
                                    "headache",
                                  ];
                                  const looksLikeSymptom =
                                    symptomKeywords.some((keyword) =>
                                      trimmed.toLowerCase().includes(keyword)
                                    ) || trimmed.length > 15;

                                  if (looksLikeSymptom) {
                                    extractConditions(trimmed);
                                  } else {
                                    handleConditionSubmit(trimmed);
                                  }
                                }
                              }
                            }}
                            placeholder="Search or describe symptoms..."
                            extraTerms={[
                              ...commonConditions,
                              ...SMART_SUGGESTION_KEYWORDS,
                            ]}
                            maxSuggestions={8}
                            autoSubmitOnSelect={true}
                            inputClassName="w-full py-1.5 px-3 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                          />
                          {isExtracting && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute right-2.5 top-1.5 flex items-center gap-1"
                            >
                              <Sparkles
                                size={10}
                                className="animate-pulse"
                                style={{ color: "#2F3C96" }}
                              />
                            </motion.div>
                          )}
                        </div>
                        {/* Only show Add button when typing something unusual (not matching suggestions) */}
                        {conditionInput &&
                          conditionInput.trim().length >= 3 &&
                          !commonConditions.some(
                            (c) =>
                              c.toLowerCase() ===
                              conditionInput.trim().toLowerCase()
                          ) && (
                            <Button
                              onClick={() => {
                                const trimmed = conditionInput.trim();
                                // Check if it looks like symptoms
                                const symptomKeywords = [
                                  "pain",
                                  "ache",
                                  "pressure",
                                  "high",
                                  "low",
                                  "difficulty",
                                  "trouble",
                                  "issue",
                                  "problem",
                                  "feeling",
                                  "symptom",
                                  "bp",
                                  "blood pressure",
                                  "breathing",
                                  "chest",
                                  "headache",
                                ];
                                const looksLikeSymptom =
                                  symptomKeywords.some((keyword) =>
                                    trimmed.toLowerCase().includes(keyword)
                                  ) || trimmed.length > 15;

                                if (looksLikeSymptom) {
                                  extractConditions(trimmed);
                                } else {
                                  handleConditionSubmit(trimmed);
                                }
                              }}
                              disabled={isExtracting}
                              className="px-3 py-1.5 rounded-lg font-semibold text-xs transition-all disabled:opacity-40"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#FFFFFF",
                              }}
                            >
                              Add
                            </Button>
                          )}
                      </div>
                      {/* Inline Selected Conditions Chips */}
                      {getCombinedConditions().length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {getCombinedConditions().map((condition, idx) => {
                            const isIdentified =
                              identifiedConditions.includes(condition);
                            return (
                              <motion.span
                                key={idx}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                                style={{
                                  backgroundColor: isIdentified
                                    ? "rgba(208, 196, 226, 0.2)"
                                    : "rgba(208, 196, 226, 0.1)",
                                  color: "#2F3C96",
                                }}
                              >
                                {isIdentified && (
                                  <Sparkles
                                    size={7}
                                    style={{ color: "#2F3C96" }}
                                  />
                                )}
                                {condition}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCondition(condition);
                                  }}
                                  className="ml-0.5 hover:opacity-70 transition-opacity"
                                  style={{ color: "#787878" }}
                                >
                                  <X size={8} />
                                </button>
                              </motion.span>
                            );
                          })}
                        </div>
                      )}
                      {/* Softer helper text */}
                      <p
                        className="text-[9px] flex items-center gap-0.5"
                        style={{ color: "#787878", opacity: 0.7 }}
                      >
                        <Sparkles size={7} />
                        You can describe symptoms if you're unsure of the
                        condition
                      </p>
                    </div>

                    {/* Collapsible Quick Select */}
                    <div className="pt-1">
                      <motion.button
                        type="button"
                        onClick={() => setIsQuickSelectOpen(!isQuickSelectOpen)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg transition-all border cursor-pointer"
                        style={{
                          backgroundColor: isQuickSelectOpen
                            ? "rgba(208, 196, 226, 0.1)"
                            : "rgba(208, 196, 226, 0.05)",
                          borderColor: isQuickSelectOpen
                            ? "#D0C4E2"
                            : "rgba(208, 196, 226, 0.3)",
                          color: "#2F3C96",
                        }}
                        whileHover={{
                          backgroundColor: "rgba(208, 196, 226, 0.15)",
                          borderColor: "#D0C4E2",
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            Common conditions
                          </span>
                          {selectedConditions.length > 0 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#2F3C96",
                                color: "#FFFFFF",
                              }}
                            >
                              {selectedConditions.length}
                            </span>
                          )}
                          {!isQuickSelectOpen && (
                            <span
                              className="text-[10px] font-normal"
                              style={{ color: "#787878", opacity: 0.7 }}
                            >
                              (Click to expand)
                            </span>
                          )}
                        </div>
                        <motion.div
                          animate={{ rotate: isQuickSelectOpen ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ color: "#2F3C96" }}
                        >
                          <ChevronRight size={16} />
                        </motion.div>
                      </motion.button>

                      <AnimatePresence>
                        {isQuickSelectOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {(showAllConditions
                                  ? commonConditions
                                  : commonConditions.slice(0, 8)
                                ).map((condition) => {
                                  const isSelected =
                                    selectedConditions.includes(condition);
                                  return (
                                    <motion.button
                                      key={condition}
                                      type="button"
                                      onClick={() => toggleCondition(condition)}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                                      style={{
                                        backgroundColor: isSelected
                                          ? "#2F3C96"
                                          : "transparent",
                                        color: isSelected
                                          ? "#FFFFFF"
                                          : "#787878",
                                        borderColor: isSelected
                                          ? "#2F3C96"
                                          : "rgba(208, 196, 226, 0.2)",
                                      }}
                                    >
                                      {condition}
                                    </motion.button>
                                  );
                                })}
                              </div>
                              {commonConditions.length > 8 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAllConditions(!showAllConditions)
                                  }
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                                  style={{
                                    color: "#2F3C96",
                                    backgroundColor: "rgba(208, 196, 226, 0.1)",
                                  }}
                                >
                                  {showAllConditions
                                    ? "Show less"
                                    : `Show ${
                                        commonConditions.length - 8
                                      } more`}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2.5">
                        <Button
                          onClick={() => setStep(1)}
                          className="flex-1 py-2 rounded-lg font-semibold text-sm border transition-all"
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
                          Continue →
                        </Button>
                      </div>
                      <p
                        className="text-[10px] text-center"
                        style={{ color: "#787878", opacity: 0.7 }}
                      >
                        You can edit this later
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Location */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-2.5"
                  >
                    <div>
                      <label
                        className="block text-[10px] font-semibold mb-1"
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
                      <p
                        className="text-[9px] mt-1"
                        style={{ color: "#787878" }}
                      >
                        Type to see location suggestions
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-[10px] font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Gender (Optional)
                      </label>
                      <div className="relative" data-gender-dropdown>
                        <button
                          type="button"
                          onClick={() =>
                            setIsGenderDropdownOpen(!isGenderDropdownOpen)
                          }
                          className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 flex items-center justify-between cursor-pointer"
                          style={{
                            borderColor: isGenderDropdownOpen
                              ? "#D0C4E2"
                              : gender
                              ? "#2F3C96"
                              : "#E8E8E8",
                            color: gender ? "#2F3C96" : "#787878",
                            backgroundColor: isGenderDropdownOpen
                              ? "rgba(208, 196, 226, 0.08)"
                              : gender
                              ? "rgba(208, 196, 226, 0.05)"
                              : "#FFFFFF",
                            "--tw-ring-color": "#D0C4E2",
                            boxShadow: isGenderDropdownOpen
                              ? "0 2px 6px rgba(208, 196, 226, 0.25)"
                              : gender
                              ? "0 1px 3px rgba(208, 196, 226, 0.2)"
                              : "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!isGenderDropdownOpen) {
                              e.currentTarget.style.borderColor = "#D0C4E2";
                              e.currentTarget.style.backgroundColor = gender
                                ? "rgba(208, 196, 226, 0.1)"
                                : "rgba(208, 196, 226, 0.05)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isGenderDropdownOpen) {
                              e.currentTarget.style.borderColor = gender
                                ? "#2F3C96"
                                : "#E8E8E8";
                              e.currentTarget.style.backgroundColor = gender
                                ? "rgba(208, 196, 226, 0.05)"
                                : "#FFFFFF";
                            }
                          }}
                        >
                          <span>{gender || "Select gender"}</span>
                          <motion.div
                            animate={{
                              rotate: isGenderDropdownOpen ? 180 : 0,
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown
                              size={16}
                              style={{
                                color: gender ? "#2F3C96" : "#787878",
                              }}
                            />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isGenderDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute z-50 w-full mt-1 bg-white rounded-xl border shadow-xl overflow-hidden"
                              style={{
                                borderColor: "#D0C4E2",
                                boxShadow:
                                  "0 8px 24px rgba(208, 196, 226, 0.2)",
                              }}
                            >
                              {[
                                { value: "", label: "Select gender" },
                                { value: "Male", label: "Male" },
                                { value: "Female", label: "Female" },
                                { value: "Non-binary", label: "Non-binary" },
                                {
                                  value: "Prefer not to say",
                                  label: "Prefer not to say",
                                },
                              ].map((option) => {
                                const isSelected = gender === option.value;
                                return (
                                  <motion.button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setGender(option.value);
                                      setIsGenderDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-3.5 py-2.5 text-sm transition-all duration-150 flex items-center justify-between"
                                    style={{
                                      backgroundColor: isSelected
                                        ? "rgba(208, 196, 226, 0.15)"
                                        : "transparent",
                                      color: isSelected ? "#2F3C96" : "#787878",
                                    }}
                                    whileHover={{
                                      backgroundColor: isSelected
                                        ? "rgba(208, 196, 226, 0.2)"
                                        : "rgba(208, 196, 226, 0.08)",
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <span className="font-medium">
                                      {option.label}
                                    </span>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 500,
                                          damping: 30,
                                        }}
                                      >
                                        <CheckCircle
                                          size={16}
                                          style={{ color: "#2F3C96" }}
                                        />
                                      </motion.div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
                        <p className="text-[10px]">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setStep(2)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-xs border transition-all"
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#787878",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          if (isOAuthFlow) {
                            // Skip email/password step for OAuth users
                            handleOAuthComplete();
                          } else {
                            setStep(4);
                          }
                        }}
                        disabled={loading}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                        {isOAuthFlow
                          ? loading
                            ? "Saving..."
                            : "Complete →"
                          : "Continue →"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Email & Password (Only for non-OAuth users) */}
                {step === 4 && !isOAuthFlow && (
                  <motion.div
                    key="step4"
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="space-y-2.5"
                  >
                    {/* Social Sign-In Options - At Top */}
                    {isAuth0Configured && (
                      <div className="space-y-2">
                        <p
                          className="text-[10px] text-center font-medium"
                          style={{ color: "#787878" }}
                        >
                          Sign up with
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
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

                          {/* Microsoft/Outlook Button */}
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
                              Outlook
                            </span>
                          </motion.button>

                          {/* Facebook Button */}
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
                            onClick={() => handleSocialLogin("facebook")}
                          >
                            {socialLoginLoading === "facebook" ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="w-[14px] h-[14px] rounded-full border-2"
                                style={{
                                  borderColor: "rgba(24, 119, 242, 0.3)",
                                  borderTopColor: "#1877F2",
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
                                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                                  fill="#1877F2"
                                />
                              </svg>
                            )}
                            <span className="text-[8px] font-medium leading-tight">
                              Facebook
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
                          <span className="text-[9px]">or</span>
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: "#E8E8E8" }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        className="block text-[10px] font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-[10px] font-semibold mb-1"
                        style={{ color: "#2F3C96" }}
                      >
                        Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-[10px] font-semibold mb-1"
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
                        className="w-full py-1.5 px-2.5 text-xs border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
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
                        <p className="text-[10px]">{error}</p>
                      </motion.div>
                    )}

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
                        <span
                          className="text-[10px]"
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

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setStep(3)}
                        className="flex-1 py-1.5 rounded-lg font-semibold text-xs border transition-all"
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
                          (!isOAuthFlow &&
                            (!email ||
                              !password ||
                              !confirmPassword ||
                              !agreedToTerms))
                        }
                        className="flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                        {loading
                          ? isOAuthFlow
                            ? "Saving..."
                            : "Creating..."
                          : isOAuthFlow
                          ? "Save Profile →"
                          : "Complete →"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <style>{`
        .condition-selector::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Layout>
  );
}
