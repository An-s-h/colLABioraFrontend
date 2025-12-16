import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import LocationInput from "../components/LocationInput.jsx";
import { SMART_SUGGESTION_KEYWORDS } from "../utils/smartSuggestions.js";
import { User, Heart, MapPin, Mail, CheckCircle, Sparkles } from "lucide-react";

export default function OnboardPatient() {
  const [step, setStep] = useState(1);
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
  const navigate = useNavigate();

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

  async function handleComplete() {
    setError("");
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

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl"
          >
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-center relative">
                {/* Single centered line */}
                <div
                  className="absolute top-6 left-[12%] right-[12%] h-[2px]"
                  style={{ backgroundColor: "rgba(120, 120, 120, 0.15)" }}
                />
                {/* Animated progress line */}
                <motion.div
                  className="absolute top-6 left-[12%] h-[2px]"
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
                            className="w-12 h-12 rounded-full flex items-center justify-center relative z-10"
                            style={{
                              backgroundColor:
                                isCompleted || isActive ? "#2F3C96" : "#F5F5F5",
                              color:
                                isCompleted || isActive ? "#FFFFFF" : "#787878",
                              border: isActive
                                ? "2px solid #D0C4E2"
                                : "2px solid transparent",
                              boxShadow: isActive
                                ? "0 2px 8px rgba(47, 60, 150, 0.2)"
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
                                <CheckCircle size={20} />
                              </motion.div>
                            ) : (
                              <Icon size={20} />
                            )}
                          </motion.div>
                        </div>
                        <span
                          className="text-xs font-medium mt-2"
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
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border p-4 sm:p-5"
              style={{
                borderColor: "#D0C4E2",
                boxShadow: "0 20px 60px rgba(47, 60, 150, 0.15)",
              }}
            >
              {/* Unified Section Heading */}
              <div className="text-center mb-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2
                      className="text-xl font-bold mb-1"
                      style={{ color: "#2F3C96" }}
                    >
                      {step === 1 && "Let's get started"}
                      {step === 2 && "Medical Conditions"}
                      {step === 3 && "Your Location"}
                      {step === 4 && "Create Your Account"}
                    </h2>
                    <p className="text-xs" style={{ color: "#787878" }}>
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
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1.5"
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
                          className="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                          style={{
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                            "--tw-ring-color": "#D0C4E2",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-semibold mb-1.5"
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
                          className="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
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
                      className="w-full py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{
                        backgroundColor: "#2F3C96",
                        color: "#FFFFFF",
                      }}
                    >
                      Continue →
                    </Button>
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
                    {/* Search Input - Can't find yours? */}
                    <div>
                      <p
                        className="text-xs font-medium uppercase tracking-wide mb-2"
                        style={{ color: "#787878" }}
                      >
                        Can't find yours?
                      </p>
                      <div className="flex gap-2">
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
                                  // Direct condition name, add it
                                  handleConditionSubmit(trimmed);
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
                            inputClassName="w-full py-2.5 px-4 text-sm border rounded-xl transition-all focus:outline-none focus:ring-2"
                          />
                          {isExtracting && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute right-3 top-2.5 flex items-center gap-1.5"
                            >
                              <Sparkles
                                size={12}
                                className="animate-pulse"
                                style={{ color: "#2F3C96" }}
                              />
                            </motion.div>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            if (
                              conditionInput &&
                              conditionInput.trim().length >= 3
                            ) {
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
                            }
                          }}
                          disabled={
                            !conditionInput ||
                            conditionInput.trim().length < 3 ||
                            isExtracting
                          }
                          className="px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                          style={{
                            backgroundColor: "#2F3C96",
                            color: "#FFFFFF",
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <p
                        className="text-xs mt-2 flex items-center gap-1"
                        style={{ color: "#787878" }}
                      >
                        <Sparkles size={10} />
                        We can identify conditions from your symptoms (e.g.,
                        "trouble breathing" → Asthma)
                      </p>
                    </div>

                    {/* All Selected Conditions Summary */}
                    {getCombinedConditions().length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 rounded-xl border"
                        style={{
                          backgroundColor: "#F5F5F5",
                          borderColor: "#E8E8E8",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p
                            className="text-xs font-semibold"
                            style={{ color: "#2F3C96" }}
                          >
                            All Your Conditions (
                            {getCombinedConditions().length})
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {getCombinedConditions().map((condition, idx) => {
                            const isIdentified =
                              identifiedConditions.includes(condition);
                            return (
                              <motion.span
                                key={idx}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                                style={{
                                  backgroundColor: isIdentified
                                    ? "rgba(208, 196, 226, 0.2)"
                                    : "#FFFFFF",
                                  color: "#2F3C96",
                                  borderColor: isIdentified
                                    ? "#D0C4E2"
                                    : "#E8E8E8",
                                }}
                              >
                                {isIdentified && (
                                  <Sparkles
                                    size={9}
                                    style={{ color: "#2F3C96" }}
                                  />
                                )}
                                {condition}
                                <button
                                  type="button"
                                  onClick={() => toggleCondition(condition)}
                                  className="ml-1 hover:opacity-70 transition-opacity"
                                  style={{ color: "#787878" }}
                                >
                                  ×
                                </button>
                              </motion.span>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Quick Select */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#2F3C96" }}
                        >
                          Quick Select
                        </p>
                        <span className="text-xs" style={{ color: "#787878" }}>
                          {selectedConditions.length} selected
                        </span>
                      </div>
                      <div
                        className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 rounded-xl border"
                        style={{
                          backgroundColor: "#F5F5F5",
                          borderColor: "#E8E8E8",
                          scrollbarWidth: "thin",
                          scrollbarColor: "#D0C4E2 #F5F5F5",
                        }}
                      >
                        {commonConditions.map((condition) => {
                          const isSelected =
                            selectedConditions.includes(condition);
                          return (
                            <motion.button
                              key={condition}
                              type="button"
                              onClick={() => toggleCondition(condition)}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2 shadow-sm relative overflow-hidden"
                              style={{
                                backgroundColor: isSelected
                                  ? "#2F3C96"
                                  : "#FFFFFF",
                                color: isSelected ? "#FFFFFF" : "#2F3C96",
                                borderColor: isSelected ? "#2F3C96" : "#D0C4E2",
                                boxShadow: isSelected
                                  ? "0 4px 12px rgba(47, 60, 150, 0.25)"
                                  : "0 2px 4px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              {isSelected && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: "#D0C4E2" }}
                                >
                                  <CheckCircle
                                    size={12}
                                    style={{ color: "#2F3C96" }}
                                  />
                                </motion.span>
                              )}
                              {condition}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

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
                      >
                        Continue →
                      </Button>
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
                    className="space-y-3"
                  >
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#2F3C96" }}
                      >
                        Location
                      </label>
                      {/* <LocationInput
                        value={location}
                        onChange={setLocation}
                        placeholder="e.g. New York, USA or City, Country"
                        inputClassName="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                      /> */}
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. New York, USA or City, Country"
                        className="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                      {/* <p className="text-xs mt-2" style={{ color: "#787878" }}>
                        Type to see location suggestions
                      </p> */}
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#2F3C96" }}
                      >
                        Gender (Optional)
                      </label>
                      <div className="relative">
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                          style={{
                            borderColor: gender ? "#2F3C96" : "#E8E8E8",
                            color: gender ? "#2F3C96" : "#787878",
                            backgroundColor: "#FFFFFF",
                            "--tw-ring-color": "#D0C4E2",
                            paddingRight: "2.5rem",
                          }}
                        >
                          <option value="">Select gender</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Non-binary</option>
                          <option>Prefer not to say</option>
                        </select>
                        <div
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: "#787878" }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M2 4L6 8L10 4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="flex gap-2.5">
                      <Button
                        onClick={() => setStep(2)}
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
                        onClick={() => setStep(4)}
                        className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                      >
                        Continue →
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Email & Password */}
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
                    {/* Social Sign-In Options */}
                    <div className="space-y-2.5">
                      <p
                        className="text-xs text-center font-medium"
                        style={{ color: "#787878" }}
                      >
                        Or sign up with
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-all"
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                          }}
                          onClick={() => {
                            // Placeholder for Google sign-in
                            console.log("Google sign-in clicked");
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
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
                          <span className="text-xs font-medium">Google</span>
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-all"
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E8E8E8",
                            color: "#2F3C96",
                          }}
                          onClick={() => {
                            // Placeholder for Outlook sign-in
                            console.log("Outlook sign-in clicked");
                          }}
                        >
                          <Mail size={16} style={{ color: "#0078D4" }} />
                          <span className="text-xs font-medium">Outlook</span>
                        </motion.button>
                      </div>
                      <div className="relative my-3">
                        <div
                          className="absolute inset-0 flex items-center"
                          style={{ borderColor: "#E8E8E8" }}
                        >
                          <div
                            className="w-full border-t"
                            style={{ borderColor: "#E8E8E8" }}
                          />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span
                            className="px-2 bg-white"
                            style={{ color: "#787878" }}
                          >
                            Or continue with email
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#2F3C96" }}
                      >
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "#2F3C96" }}
                      >
                        Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "#E8E8E8",
                          color: "#2F3C96",
                          "--tw-ring-color": "#D0C4E2",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
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
                        className="w-full py-2 px-3 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
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
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#DC2626",
                        }}
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="flex gap-2.5">
                      <Button
                        onClick={() => setStep(3)}
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
                        onClick={handleComplete}
                        disabled={
                          loading || !email || !password || !confirmPassword
                        }
                        className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                          backgroundColor: "#2F3C96",
                          color: "#FFFFFF",
                        }}
                      >
                        {loading ? "Creating..." : "Complete →"}
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
