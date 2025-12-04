import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Save,
  MapPin,
  User,
  FileText,
  Link as LinkIcon,
  Briefcase,
  CheckCircle,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import AnimatedBackground from "../components/ui/AnimatedBackground.jsx";
import { useProfile } from "../contexts/ProfileContext.jsx";

export default function EditProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const { updateProfileSignature, generateProfileSignature } = useProfile();

  // Form state
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [conditions, setConditions] = useState(""); // For patients - diseases of interest
  const [bio, setBio] = useState(""); // For researchers
  const [orcid, setOrcid] = useState(""); // For researchers
  const [specialties, setSpecialties] = useState(""); // For researchers
  const [interests, setInterests] = useState(""); // For researchers
  const [available, setAvailable] = useState(false); // For researchers
  const [gender, setGender] = useState(""); // Optional for both

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (!userData?._id && !userData?.id) {
      navigate("/signin");
      return;
    }

    // Set username from userData
    if (userData?.username) {
      setUsername(userData.username);
    }

    loadProfile(userData._id || userData.id);
  }, [navigate]);

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
          setConditions((profileObj.patient.conditions || []).join(", "));
          setGender(profileObj.patient.gender || "");
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
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user?._id && !user?.id) {
      toast.error("Please sign in");
      return;
    }

    setSaving(true);
    const userId = user._id || user.id;

    // Store old profile signature before saving
    const oldSignature = profile 
      ? generateProfileSignature(
          profile.patient?.conditions || profile.researcher?.interests || [],
          profile.patient?.location || profile.researcher?.location
        )
      : '';

    try {
      // Update username if changed
      if (username && username !== user.username) {
        const userUpdateResponse = await fetch(
          `${base}/api/auth/update-user/${userId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          }
        );

        if (!userUpdateResponse.ok) {
          const errorData = await userUpdateResponse.json();
          throw new Error(errorData.error || "Failed to update username");
        }

        const userData = await userUpdateResponse.json();
        // Update local storage
        const updatedUser = { ...user, username: userData.user.username };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event("login")); // Update navbar
      }

      // Update profile
      const profileData = {
        role: user.role,
      };

      if (user.role === "patient") {
        const conditionsArray = conditions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        profileData.patient = {
          conditions: conditionsArray,
          location: {
            city: city.trim() || undefined,
            country: country.trim() || undefined,
          },
          gender: gender.trim() || undefined,
        };

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

        profileData.researcher = {
          specialties: specialtiesArray,
          interests: interestsArray,
          orcid: orcid.trim() || undefined,
          bio: bio.trim() || undefined,
          available,
          location: {
            city: city.trim() || undefined,
            country: country.trim() || undefined,
          },
          gender: gender.trim() || undefined,
        };

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

      const profileResponse = await fetch(`${base}/api/profile/${userId}`, {
        method: "POST",
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

      // Calculate new profile signature
      let newConditions = [];
      let newLocation = null;

      if (user.role === "patient") {
        newConditions = conditions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        newLocation = {
          city: city.trim() || undefined,
          country: country.trim() || undefined,
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
        newConditions = [...specialtiesArray, ...interestsArray];
        newLocation = {
          city: city.trim() || undefined,
          country: country.trim() || undefined,
        };
      }

      const newSignature = generateProfileSignature(newConditions, newLocation);

      // Update profile context with new signature
      updateProfileSignature(newConditions, newLocation);

      // Update user object in localStorage with new medicalInterests
      const updatedUserData = {
        ...user,
        medicalInterests: newConditions,
      };
      localStorage.setItem("user", JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      
      // Trigger login event to update Navbar and other components
      window.dispatchEvent(new Event("login"));

      // Only clear cache if profile actually changed
      if (oldSignature !== newSignature) {
        // Clear the backend cache so new recommendations are fetched
        try {
          await fetch(`${base}/api/recommendations/cache/${userId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          console.log("Backend cache cleared due to profile change");
        } catch (cacheError) {
          console.error("Error clearing cache:", cacheError);
          // Don't fail the save if cache clear fails
        }
      }

      toast.success("Profile updated successfully!");
      navigate(`/dashboard/${user.role}`);
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
        <div className="relative min-h-screen">
          <AnimatedBackground />
          <div className="flex justify-center items-center min-h-screen relative z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="mt-6 text-indigo-700 font-medium">
                Loading profile...
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/${user?.role || "patient"}`)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Edit Profile</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Update your profile information
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-4">
          {/* Basic Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Basic Information
              </h2>
            </div>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                />
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Location
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  />
                  <Input
                    placeholder="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Gender{" "}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                >
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Patient-specific Section */}
          {user?.role === "patient" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  Health Profile
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Diseases/Conditions of Interest
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Diabetes, Heart Disease, Cancer"
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Separate multiple conditions with commas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Researcher-specific Section */}
          {user?.role === "researcher" && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Research Profile
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* ORCID */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <LinkIcon className="w-3.5 h-3.5" />
                      ORCID ID{" "}
                      <span className="text-slate-400 text-xs font-normal">
                        (Optional)
                      </span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., 0000-0000-0000-0000"
                      value={orcid}
                      onChange={(e) => setOrcid(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                    />
                  </div>

                  {/* Specialties */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      Specialties
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Oncology, Neurology, Cardiology"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Separate multiple specialties with commas
                    </p>
                  </div>

                  {/* Research Interests */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Research Interests
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Immunotherapy, Clinical AI, Drug Discovery"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Separate multiple interests with commas
                    </p>
                  </div>
                </div>
              </div>

              {/* Biography & Availability */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  Additional Information
                </h2>

                <div className="space-y-3">
                  {/* Biography */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Biography{" "}
                      <span className="text-slate-400 text-xs font-normal">
                        (Optional)
                      </span>
                    </label>
                    <textarea
                      placeholder="Tell us about your research background and expertise..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 resize-none"
                    />
                  </div>

                  {/* Availability */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="available"
                      checked={available}
                      onChange={(e) => setAvailable(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label
                      htmlFor="available"
                      className="text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      Available for research meetings and collaboration
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => navigate(`/dashboard/${user?.role || "patient"}`)}
              className="flex-1 text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
