import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProfilePictureUpload from "../components/ProfilePictureUpload.jsx";
import Layout from "../components/Layout.jsx";
import { AuroraText } from "@/components/ui/aurora-text";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import SmartSearchInput from "../components/SmartSearchInput.jsx";
import { SMART_SUGGESTION_KEYWORDS } from "../utils/smartSuggestions.js";
import icd11Dataset from "../data/icd11Dataset.json";
import { Sparkles, Info, X, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { generateUniqueUsernames } from "../utils/usernameSuggestions.js";
import { capitalizeCommaSeparated, capitalizeText } from "../utils/textCorrection.js";

export default function EditProfile() {
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // User fields
  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [nameHidden, setNameHidden] = useState(false);

  // Profile fields
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("");
  const [conditionInput, setConditionInput] = useState(""); // For patients - input field
  const [selectedConditions, setSelectedConditions] = useState([]); // For patients - selected conditions
  const [identifiedConditions, setIdentifiedConditions] = useState([]); // Track auto-identified conditions
  const [isExtracting, setIsExtracting] = useState(false); // For condition extraction
  const [bio, setBio] = useState(""); // For researchers
  const [orcid, setOrcid] = useState(""); // For researchers
  const [specialties, setSpecialties] = useState(""); // For researchers
  const [interests, setInterests] = useState(""); // For researchers
  const [available, setAvailable] = useState(false); // For researchers
  const [gender, setGender] = useState(""); // Optional for both
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showUsernameSuggestions, setShowUsernameSuggestions] = useState(false);
  
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

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (!userData?._id && !userData?.id) {
      navigate("/signin");
      return;
    }

    // Set username and handle from userData
    if (userData?.username) {
      setUsername(userData.username);
    }
    // Handle can be empty string, so check for undefined/null specifically
    if (userData?.handle !== undefined && userData?.handle !== null) {
      setHandle(userData.handle);
    } else {
      setHandle(""); // Initialize as empty string if not set
    }
    if (userData?.nameHidden !== undefined) {
      setNameHidden(userData.nameHidden);
    } else {
      setNameHidden(false); // Default to false
    }

    loadProfile(userData._id || userData.id);
  }, [navigate]);

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

  // Extract terms from ICD11 dataset for suggestions
  const icd11Suggestions = useMemo(() => {
    const termsSet = new Set();

    if (Array.isArray(icd11Dataset)) {
      icd11Dataset.forEach((item) => {
        // Add display_name
        if (item.display_name && typeof item.display_name === "string") {
          const displayName = item.display_name.trim();
          if (displayName) {
            termsSet.add(displayName);
          }
        }

        // Add patient_terms, but filter out ICD code patterns
        if (Array.isArray(item.patient_terms)) {
          item.patient_terms.forEach((term) => {
            if (typeof term === "string") {
              const trimmedTerm = term.trim();
              if (!trimmedTerm) return;

              // Filter out terms containing ICD code patterns
              const lowerTerm = trimmedTerm.toLowerCase();
              const hasIcdPattern =
                lowerTerm.includes("icd11 code") ||
                lowerTerm.includes("icd code") ||
                /icd11\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm) ||
                /icd\s+[a-z]{2}[0-9]{2}/i.test(trimmedTerm);

              if (!hasIcdPattern) {
                termsSet.add(trimmedTerm);
              }
            }
          });
        }
      });
    }

    return Array.from(termsSet);
  }, []);

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
        toast.success(`Identified ${capitalizedConditions.length} condition(s)`);
      } else {
        toast.error("Could not identify conditions from your description");
      }
    } catch (e) {
      console.error("Condition extraction failed", e);
      toast.error("Failed to extract conditions. Please try again.");
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
    if (value && value.trim()) {
      const trimmed = value.trim();
      // Check if it's a direct condition match
      const exactMatch = commonConditions.find(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      );
      if (exactMatch) {
        const capitalized = capitalizeMedicalCondition(exactMatch);
        if (capitalized && !selectedConditions.includes(capitalized)) {
          setSelectedConditions((prev) => [...prev, capitalized]);
          setConditionInput("");
          setIdentifiedConditions((prev) => prev.filter((c) => c !== capitalized));
        }
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
          const capitalized = capitalizeMedicalCondition(trimmed);
          if (capitalized && !selectedConditions.includes(capitalized)) {
            setSelectedConditions((prev) => [...prev, capitalized]);
            setConditionInput("");
            setIdentifiedConditions((prev) => prev.filter((c) => c !== capitalized));
          }
        }
      }
    }
  }

  async function loadProfile(userId) {
    try {
      // Fetch user profile
      const profileResponse = await fetch(`${base}/api/profile/${userId}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData.profile || null);

        const profileObj = profileData.profile || {};

        if (profileObj.patient) {
          // Patient fields
          setCity(profileObj.patient.location?.city || "");
          setCountry(profileObj.patient.location?.country || "");
          setSelectedConditions(profileObj.patient.conditions || []);
          setGender(profileObj.patient.gender || "");
          setAge(profileObj.patient.age?.toString() || "");
        } else if (profileObj.researcher) {
          // Researcher fields
          setCity(profileObj.researcher.location?.city || "");
          setCountry(profileObj.researcher.location?.country || "");
          setBio(profileObj.researcher.bio || "");
          setOrcid(profileObj.researcher.orcid || "");
          setSpecialties((profileObj.researcher.specialties || []).join(", "));
          setInterests((profileObj.researcher.interests || []).join(", "));
          setAvailable(profileObj.researcher.available || false);
          setGender(profileObj.researcher.gender || "");
          setAge(profileObj.researcher.age?.toString() || "");
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handlePictureUpload(file) {
    if (!file) return;
    
    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "profile-picture");

      const token = localStorage.getItem("token");
      const response = await fetch(`${base}/api/upload/profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload picture");
      }

      const data = await response.json();
      
      // Update user picture
      const userId = user._id || user.id;
      const userUpdateResponse = await fetch(
        `${base}/api/auth/update-user/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picture: data.url }),
        }
      );

      if (userUpdateResponse.ok) {
        const userData = await userUpdateResponse.json();
        const updatedUser = { ...user, ...userData.user, picture: data.url };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event("login"));
        toast.success("Profile picture updated!");
      } else {
        throw new Error("Failed to update user with new picture");
      }
    } catch (error) {
      console.error("Error uploading picture:", error);
      toast.error(error.message || "Failed to upload picture");
      throw error; // Re-throw so component knows upload failed
    } finally {
      setUploadingPicture(false);
    }
  }

  async function handleSave() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in");
      return;
    }

    // Validation: Name and conditions are mandatory
    if (!username.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (user.role === "patient" && selectedConditions.length === 0) {
      toast.error("At least one medical condition is required");
      return;
    }

    setSaving(true);
    const userId = user._id || user.id;

    try {
      // Track if there are any changes
      let hasUserChanges = false;
      let hasProfileChanges = false;

      // Check for user field changes
      const userUpdateData = {};
      if (username && username !== user.username) {
        userUpdateData.username = username;
        hasUserChanges = true;
      }
      // Handle comparison: treat empty string and undefined as the same
      const currentHandle = user.handle || "";
      const newHandle = handle.trim();
      if (newHandle !== currentHandle) {
        userUpdateData.handle = newHandle || undefined;
        hasUserChanges = true;
      }
      if (nameHidden !== (user.nameHidden || false)) {
        userUpdateData.nameHidden = nameHidden;
        hasUserChanges = true;
      }

      // Check for profile field changes
      const profileObj = profile || {};
      let profileData = { role: user.role };

      if (user.role === "patient") {
        const conditionsArray = [...selectedConditions];
        
        const originalConditions = profileObj.patient?.conditions || [];
        const originalCity = profileObj.patient?.location?.city || "";
        const originalCountry = profileObj.patient?.location?.country || "";
        const originalGender = profileObj.patient?.gender || "";
        const originalAge = profileObj.patient?.age?.toString() || "";

        const newCity = city.trim();
        const newCountry = country.trim();
        const newGender = gender.trim();
        const newAge = age ? parseInt(age).toString() : "";

        // Check if conditions changed (compare arrays)
        const conditionsChanged = 
          conditionsArray.length !== originalConditions.length ||
          conditionsArray.some((c, i) => c !== originalConditions[i]);

        // Check if any profile fields changed
        if (
          conditionsChanged ||
          newCity !== originalCity ||
          newCountry !== originalCountry ||
          newGender !== originalGender ||
          newAge !== originalAge
        ) {
          hasProfileChanges = true;
        }

        profileData.patient = {
          conditions: conditionsArray,
          location: {
            city: newCity || undefined,
            country: newCountry || undefined,
          },
          gender: newGender || undefined,
          age: age ? parseInt(age) : undefined,
        };
      } else if (user.role === "researcher") {
        const specialtiesArray = specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const interestsArray = interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const originalSpecialties = (profileObj.researcher?.specialties || []).join(", ");
        const originalInterests = (profileObj.researcher?.interests || []).join(", ");
        const originalOrcid = profileObj.researcher?.orcid || "";
        const originalBio = profileObj.researcher?.bio || "";
        const originalAvailable = profileObj.researcher?.available || false;
        const originalCity = profileObj.researcher?.location?.city || "";
        const originalCountry = profileObj.researcher?.location?.country || "";
        const originalGender = profileObj.researcher?.gender || "";
        const originalAge = profileObj.researcher?.age?.toString() || "";

        const newCity = city.trim();
        const newCountry = country.trim();
        const newGender = gender.trim();
        const newAge = age ? parseInt(age).toString() : "";

        // Check if any profile fields changed
        if (
          specialties !== originalSpecialties ||
          interests !== originalInterests ||
          orcid.trim() !== originalOrcid ||
          bio.trim() !== originalBio ||
          available !== originalAvailable ||
          newCity !== originalCity ||
          newCountry !== originalCountry ||
          newGender !== originalGender ||
          newAge !== originalAge
        ) {
          hasProfileChanges = true;
        }

        profileData.researcher = {
          specialties: specialtiesArray,
          interests: interestsArray,
          orcid: orcid.trim() || undefined,
          bio: bio.trim() || undefined,
          available,
          location: {
            city: newCity || undefined,
            country: newCountry || undefined,
          },
          gender: newGender || undefined,
          age: age ? parseInt(age) : undefined,
        };
      }

      // If no changes detected, show message and return
      if (!hasUserChanges && !hasProfileChanges) {
        toast.success("All changes are up to date!");
        setSaving(false);
        return;
      }

      // Update user fields if there are changes
      if (hasUserChanges && Object.keys(userUpdateData).length > 0) {
        const userUpdateResponse = await fetch(
          `${base}/api/auth/update-user/${userId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userUpdateData),
          }
        );

        if (!userUpdateResponse.ok) {
          const errorData = await userUpdateResponse.json();
          throw new Error(errorData.error || "Failed to update user information");
        }

        const userData = await userUpdateResponse.json();
        // Update local storage with all user fields including handle
        const updatedUser = { ...user, ...userData.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        // Update form state with the saved handle - handle can be empty string
        if (userData.user.handle !== undefined && userData.user.handle !== null) {
          setHandle(userData.user.handle);
        } else {
          setHandle(""); // Clear handle if it was removed
        }
        // Update nameHidden in form state
        if (userData.user.nameHidden !== undefined) {
          setNameHidden(userData.user.nameHidden);
        }
        window.dispatchEvent(new Event("login")); // Update navbar
      }

      // Update profile if there are changes
      if (hasProfileChanges) {
        if (user.role === "patient") {
          const conditionsArray = [...selectedConditions];

          // Also update medicalInterests in User model
          if (conditionsArray.length > 0) {
            await fetch(`${base}/api/auth/update-profile`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                medicalInterests: conditionsArray,
              }),
            });
          }
        } else if (user.role === "researcher") {
          const specialtiesArray = specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const interestsArray = interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          // Also update medicalInterests in User model (combined specialties + interests)
          const medicalInterests = [...specialtiesArray, ...interestsArray];
          if (medicalInterests.length > 0) {
            await fetch(`${base}/api/auth/update-profile`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                medicalInterests,
              }),
            });
          }
        }

        // Update profile in database
        const profileResponse = await fetch(`${base}/api/profile/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(profileData),
        });

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(errorData.error || "Failed to update profile");
        }

        // Update user object in localStorage with new medicalInterests
        const updatedUserData = {
          ...user,
          medicalInterests: user.role === "patient" 
            ? [...selectedConditions]
            : [...specialties.split(",").map((s) => s.trim()).filter(Boolean), ...interests.split(",").map((s) => s.trim()).filter(Boolean)],
        };
        localStorage.setItem("user", JSON.stringify(updatedUserData));
        setUser(updatedUserData);
      }

      // Trigger login event to update Navbar and other components
      window.dispatchEvent(new Event("login"));

      toast.success("Profile updated successfully!");
      // Don't redirect - stay on edit page
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-700">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentPicture = user?.picture || user?.profilePicture || null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 relative overflow-hidden">
        <AnimatedBackground />
        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-8 animate-fade-in pt-15">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#2F3C96] via-[#474F97] to-[#D0C4E2] bg-clip-text text-transparent mb-1">
            <AuroraText
              speed={2.5}
              colors={["#2F3C96", "#474F97", "#757BB1", "#B8A5D5", "#D0C4E2"]}
            >
              Edit Profile
            </AuroraText>
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Profile Picture Upload */}
          <ProfilePictureUpload
            currentPicture={currentPicture}
            onUpload={handlePictureUpload}
            uploading={uploadingPicture}
          />

          {/* Full Name - Mandatory */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Handle/Username */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Handle / Username
            </label>
            <div className="relative" data-username-suggestions>
              <input
                type="text"
                value={handle}
                onChange={(e) => {
                  let value = e.target.value.replace(/^@+/, "");
                  setHandle(value);
                  setShowUsernameSuggestions(value.length === 0);
                }}
                onFocus={() => setShowUsernameSuggestions(true)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., @username or choose from suggestions below"
              />
              {showUsernameSuggestions && usernameSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-600">Suggested usernames:</p>
                      <button
                        type="button"
                        onClick={refreshUsernameSuggestions}
                        className="flex items-center gap-1 text-xs text-[#2F3C96] hover:text-[#253075] transition-colors"
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
                          className="px-3 py-1.5 text-xs font-medium bg-[#2F3C96]/10 text-[#2F3C96] rounded-lg hover:bg-[#2F3C96]/20 transition-all"
                        >
                          @{suggestion}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUsernameSuggestions(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hide suggestions
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Your unique handle (optional) - Choose from suggestions or type your own
            </p>
          </div>

          {/* Hide Name Option */}
          <div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="nameHidden"
                checked={nameHidden}
                onChange={(e) => setNameHidden(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="nameHidden" className="text-sm text-slate-700">
                Hide my name from others
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-1 ml-6">
              Only the username will be visible
            </p>
          </div>

          {/* Age - Optional */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Age
              <span className="ml-2 text-xs font-normal text-slate-500">
                (Optional - helps improve search results for trials and publications)
              </span>
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="0"
              max="120"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your age"
            />
          </div>

          {/* Gender/Sex - Optional */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Gender / Sex
              <span className="ml-2 text-xs font-normal text-slate-500">
                (Optional - helps improve search results for trials and publications)
              </span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          {/* Location - Optional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                City
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (Optional - helps improve search results)
                </span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={(e) => {
                  const corrected = capitalizeText(e.target.value);
                  setCity(corrected);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Country
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (Optional - helps improve search results)
                </span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                onBlur={(e) => {
                  const corrected = capitalizeText(e.target.value);
                  setCountry(corrected);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter country"
              />
            </div>
          </div>

          {/* Role-specific fields */}
          {user?.role === "patient" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Your medical conditions/Symptoms <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <Info
                    size={16}
                    className="text-slate-400 hover:text-slate-600 cursor-help transition-colors"
                    onMouseEnter={() => setShowInfoTooltip(true)}
                    onMouseLeave={() => setShowInfoTooltip(false)}
                  />
                  {showInfoTooltip && (
                    <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-white border border-slate-200 rounded-lg shadow-xl text-xs text-slate-700 pointer-events-none">
                      <p className="font-semibold mb-2 text-slate-900">Enter symptoms in your own words</p>
                      <p className="leading-relaxed">
                        You can describe symptoms naturally, like <span className="font-medium">"I have high BP"</span> or <span className="font-medium">"chest pain"</span>. Our system will automatically identify the medical condition (e.g., <span className="font-medium">"Hypertension"</span> or <span className="font-medium">"Cardiac issues"</span>) and add it to your profile.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Search Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SmartSearchInput
                    value={conditionInput}
                    onChange={setConditionInput}
                    onSubmit={handleConditionSubmit}
                    placeholder="Search or describe symptoms..."
                    extraTerms={[
                      ...commonConditions,
                      ...SMART_SUGGESTION_KEYWORDS,
                      ...icd11Suggestions,
                    ]}
                    maxSuggestions={8}
                    autoSubmitOnSelect={true}
                    inputClassName="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {isExtracting && (
                    <div className="absolute right-3 top-2.5 flex items-center gap-1">
                      <Sparkles
                        size={14}
                        className="animate-pulse text-blue-600"
                      />
                    </div>
                  )}
                </div>
                {conditionInput && conditionInput.trim().length >= 1 && (
                  <button
                    type="button"
                    onClick={() => handleConditionSubmit(conditionInput)}
                    disabled={isExtracting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Add
                  </button>
                )}
              </div>

              {/* Selected Conditions Chips */}
              {selectedConditions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedConditions.map((condition, idx) => {
                    const isIdentified = identifiedConditions.includes(condition);
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {isIdentified && (
                          <Sparkles
                            size={12}
                            className="text-blue-600"
                          />
                        )}
                        {condition}
                        <button
                          type="button"
                          onClick={() => toggleCondition(condition)}
                          className="ml-1 hover:opacity-70 transition-opacity text-blue-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Helper text */}
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Sparkles size={10} className="text-slate-400" />
                You can describe symptoms if you're unsure of the condition...
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Specialties <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (Comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  onBlur={(e) => {
                    const corrected = capitalizeCommaSeparated(e.target.value);
                    setSpecialties(corrected);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Cardiology, Neurology"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Research Interests <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (Comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  onBlur={(e) => {
                    const corrected = capitalizeCommaSeparated(e.target.value);
                    setInterests(corrected);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Clinical Trials, Drug Development"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ORCID ID
                </label>
                <input
                  type="text"
                  value={orcid}
                  onChange={(e) => setOrcid(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0000-0000-0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="available" className="text-sm text-slate-700">
                  Available for collaboration
                </label>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
}
