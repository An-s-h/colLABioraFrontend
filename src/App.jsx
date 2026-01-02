import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Landing from "./Pages/Landing.jsx";
import Explore from "./Pages/Explore.jsx";
import SignIn from "./Pages/SignIn.jsx";
import OnboardPatient from "./Pages/OnboardPatient.jsx";
import OnboardResearcher from "./Pages/OnboardResearcher.jsx";
import DashboardPatient from "./Pages/DashboardPatient.jsx";
import DashboardResearcher from "./Pages/DashboardResearcher.jsx";
import Trials from "./Pages/Trials.jsx";
import Publications from "./Pages/Publications.jsx";
import Experts from "./Pages/Experts.jsx";
import ExpertProfile from "./Pages/ExpertProfile.jsx";
import CollabioraExpertProfile from "./Pages/CuraLinkExpertProfile.jsx";
import Forums from "./Pages/Forums.jsx";
import Favorites from "./Pages/Favorites.jsx";
import ManageTrials from "./Pages/ManageTrials.jsx";
import Insights from "./Pages/Insights.jsx";
import EditProfile from "./Pages/EditProfile.jsx";
import AdminLogin from "./Pages/AdminLogin.jsx";
import AdminDashboard from "./Pages/AdminDashboard.jsx";
import Auth0Callback from "./Pages/Auth0Callback.jsx";
import CompleteProfile from "./Pages/CompleteProfile.jsx";
import AboutUs from "./Pages/AboutUs.jsx";
import TrialDetails from "./Pages/TrialDetails.jsx";
import "./App.css";
import Navbar from "./components/Navbar.jsx";
import { ProfileProvider } from "./contexts/ProfileContext.jsx";
import Auth0ProviderWithNavigate from "./contexts/Auth0ProviderWithNavigate.jsx";

const AppContent = () => {
  return (
    <div>
      <Navbar />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#92400e",
            border: "1px solid #fbbf24",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* <Route path="/about" element={<AboutUs />} /> */}
        <Route path="/explore" element={<Explore />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/onboard/patient" element={<OnboardPatient />} />
        <Route path="/onboard/researcher" element={<OnboardResearcher />} />
        <Route path="/dashboard/patient" element={<DashboardPatient />} />
        <Route path="/dashboard/researcher" element={<DashboardResearcher />} />
        <Route path="/trials" element={<Trials />} />
        <Route path="/trial/:nctId" element={<TrialDetails />} />
        <Route path="/publications" element={<Publications />} />
        <Route path="/experts" element={<Experts />} />
        <Route path="/expert/profile" element={<ExpertProfile />} />
        <Route
          path="/curalink-expert/profile/:userId"
          element={<CollabioraExpertProfile />}
        />
        <Route path="/forums" element={<Forums />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/manage-trials" element={<ManageTrials />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/profile" element={<EditProfile />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        {/* Auth0 routes */}
        <Route path="/auth/callback" element={<Auth0Callback />} />
        <Route path="/auth/complete-profile" element={<CompleteProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Nav is provided by Navbar in Layout */}
    </div>
  );
};

const App = () => {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Auth0ProviderWithNavigate>
          <AppContent />
        </Auth0ProviderWithNavigate>
      </BrowserRouter>
    </ProfileProvider>
  );
};

export default App;
