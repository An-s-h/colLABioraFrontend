import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackgroundDiff from "../components/ui/AnimatedBackgroundDiff.jsx";

export default function OnboardPatient() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [conditions, setConditions] = useState("");
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Common medical conditions
  const commonConditions = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Cancer",
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

  // Function to properly capitalize medical condition names
  function capitalizeMedicalCondition(condition) {
    if (!condition || typeof condition !== "string") return condition;

    // Trim whitespace
    condition = condition.trim();
    if (!condition) return condition;

    // Split by spaces and process each word
    const words = condition.split(/\s+/);
    const capitalizedWords = words.map((word, index) => {
      // Handle empty words
      if (!word) return word;

      // Handle words with apostrophes (e.g., "Parkinson's", "Alzheimer's")
      if (word.includes("'")) {
        const parts = word.split("'");
        return parts
          .map((part, partIndex) => {
            if (!part) return part;
            // Capitalize first letter of each part
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("'");
      }

      // Handle acronyms (all caps, like "COPD", "IBD")
      if (word.length <= 4 && word === word.toUpperCase()) {
        return word;
      }

      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return capitalizedWords.join(" ");
  }

  async function extractConditions(text) {
    if (!text || text.length < 5) return;
    setIsExtracting(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${base}/api/ai/extract-conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json());
      if (res.conditions?.length > 0) {
        // Capitalize each extracted condition
        const capitalizedConditions = res.conditions.map(
          capitalizeMedicalCondition
        );
        setConditions(capitalizedConditions.join(", "));
      }
    } catch (e) {
      console.error("AI extraction failed", e);
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
  }

  function getCombinedConditions() {
    const manualConditions = conditions
      .split(",")
      .map((s) => capitalizeMedicalCondition(s.trim()))
      .filter(Boolean);
    return [...new Set([...selectedConditions, ...manualConditions])];
  }

  async function handleStart() {
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (password.length < 6)
      return setError("Password must be at least 6 characters");

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const conditionsArray = getCombinedConditions();

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
          location: { city, country },
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

  const progress = [
    { id: 1, label: "Email & Password" },
    { id: 2, label: "Your Name" },
    { id: 3, label: "Medical Condition" },
    { id: 4, label: "Location" },
  ];

  return (
    <Layout>
      <div className="relative min-h-screen ">
        <AnimatedBackgroundDiff />

        <div className="flex justify-center items-center min-h-screen px-4 py-6 relative z-10">
          <div className="w-full max-w-md bg-white/20 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(99,102,241,0.2)] border border-indigo-100 p-6 sm:p-7 space-y-6 transition-all duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-indigo-700 tracking-tight">
                Patient Registration
              </h1>
              <p className="text-xs text-indigo-600 font-medium">
                Step {step} of 4
              </p>
              <div className="flex justify-center gap-1 mt-3">
                {progress.map((p) => (
                  <div
                    key={p.id}
                    className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                      p.id <= step
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600"
                        : "bg-indigo-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        email &&
                        password &&
                        confirmPassword &&
                        setStep(2)
                      }
                      className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
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
                        setStep(2)
                      }
                      className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                    />
                  </div>
                  {error && (
                    <div className="text-xs text-red-600 py-1.5 px-3 bg-red-50 rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}
                  <Button
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg py-2.5 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={() => {
                      if (email && password && confirmPassword) {
                        if (password !== confirmPassword)
                          return setError("Passwords do not match");
                        if (password.length < 6)
                          return setError(
                            "Password must be at least 6 characters"
                          );
                        setError("");
                        setStep(2);
                      }
                    }}
                  >
                    Continue →
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Your Name
                    </label>
                    <Input
                      placeholder="Enter your full name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && username && setStep(3)
                      }
                      className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setStep(1)}
                      className="flex-1 text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 transition-colors"
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg px-3 py-2 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      onClick={() => username && setStep(3)}
                      disabled={!username}
                    >
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Medical Conditions
                    </label>

                    {/* Selectable Common Conditions */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-2 font-medium">
                        Select from common conditions:
                      </p>
                      <div
                        className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200 condition-selector"
                        style={{
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        }}
                      >
                        {commonConditions.map((condition) => {
                          const isSelected =
                            selectedConditions.includes(condition);
                          return (
                            <button
                              key={condition}
                              type="button"
                              onClick={() => toggleCondition(condition)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                              }`}
                            >
                              {condition}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Manual Input */}
                    <div className="relative">
                      <Input
                        placeholder="Or type your conditions (e.g. chest pain, breathing issues...)"
                        value={conditions}
                        onChange={(e) => {
                          // Format conditions as user types (on comma or blur)
                          const inputValue = e.target.value;
                          setConditions(inputValue);
                        }}
                        onBlur={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue) {
                            // Capitalize each condition when user leaves the field
                            const formattedConditions = inputValue
                              .split(",")
                              .map((condition) =>
                                capitalizeMedicalCondition(condition.trim())
                              )
                              .join(", ");
                            setConditions(formattedConditions);

                            // Extract conditions if text is long enough
                            if (inputValue.length >= 5) {
                              extractConditions(formattedConditions);
                            }
                          }
                        }}
                        className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                      />
                      {isExtracting && (
                        <span className="absolute right-3 top-2 text-xs text-indigo-600 font-medium animate-pulse">
                          Extracting…
                        </span>
                      )}
                    </div>

                    {/* Selected Conditions Display */}
                    {getCombinedConditions().length > 0 && (
                      <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-xs font-semibold text-indigo-700 mb-1.5">
                          Selected Conditions:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {getCombinedConditions().map((condition, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium border border-indigo-200"
                            >
                              {condition}
                              {selectedConditions.includes(condition) && (
                                <button
                                  type="button"
                                  onClick={() => toggleCondition(condition)}
                                  className="ml-0.5 hover:text-indigo-900"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-indigo-600 mt-1.5">
                      Select conditions above or type your own. AI will
                      automatically identify conditions from text.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                    >
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Non-binary</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setStep(2)}
                      className="flex-1 text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 transition-colors"
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg px-3 py-2 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01]"
                      onClick={() => setStep(4)}
                    >
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Location
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && !loading && handleStart()
                        }
                        className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                      />
                      <Input
                        placeholder="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && !loading && handleStart()
                        }
                        className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="text-xs text-red-600 py-1.5 px-3 bg-red-50 rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setStep(3)}
                      className="flex-1 text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 transition-colors"
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg px-3 py-2 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      onClick={handleStart}
                      disabled={loading}
                    >
                      {loading ? "Creating…" : "Complete →"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
