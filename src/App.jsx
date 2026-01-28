import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
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
import EditProfile from "./Pages/EditProfile.jsx";
import AdminLogin from "./Pages/AdminLogin.jsx";
import AdminDashboard from "./Pages/AdminDashboard.jsx";
import Auth0Callback from "./Pages/Auth0Callback.jsx";
import CompleteProfile from "./Pages/CompleteProfile.jsx";
import AboutUs from "./Pages/AboutUs.jsx";
import TrialDetails from "./Pages/TrialDetails.jsx";
import PublicationDetails from "./Pages/PublicationDetails.jsx";
import VerifyEmail from "./Pages/VerifyEmail.jsx";
import "./App.css";
import Navbar from "./components/Navbar.jsx";
import { ProfileProvider } from "./contexts/ProfileContext.jsx";
import Auth0ProviderWithNavigate from "./contexts/Auth0ProviderWithNavigate.jsx";
import Discovery from "./Pages/Discovery.jsx";
import Notifications from "./Pages/Notifications.jsx";

const AppContent = () => {
  const location = useLocation();
  const isVerifyEmailPage = location.pathname === "/verify-email";

  return (
    <div>
      {!isVerifyEmailPage && <Navbar />}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options
          className: "toast-notification",
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#2F3C96",
            padding: "16px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(47, 60, 150, 0.1)",
            fontSize: "14px",
            fontWeight: "500",
            maxWidth: "420px",
            minWidth: "300px",
          },
          // Success toast
          success: {
            duration: 4000,
            iconTheme: {
              primary: "#10b981",
              secondary: "#ffffff",
            },
            style: {
              background: "#ffffff",
              color: "#065f46",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.15), 0 8px 10px -6px rgba(16, 185, 129, 0.1)",
            },
            className: "toast-success",
          },
          // Error toast
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
            style: {
              background: "#ffffff",
              color: "#991b1b",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 8px 10px -6px rgba(239, 68, 68, 0.1)",
            },
            className: "toast-error",
          },
          // Loading toast
          loading: {
            iconTheme: {
              primary: "#2F3C96",
              secondary: "#ffffff",
            },
            style: {
              background: "#ffffff",
              color: "#2F3C96",
              border: "1px solid rgba(47, 60, 150, 0.2)",
            },
            className: "toast-loading",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* <Route path="/about" element={<AboutUs />} />  */}
        <Route path="/explore" element={<Explore />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/onboard/patient" element={<OnboardPatient />} />
        <Route path="/onboard/researcher" element={<OnboardResearcher />} />
        <Route path="/dashboard/patient" element={<DashboardPatient />} />
        <Route path="/dashboard/researcher" element={<DashboardResearcher />} />
        <Route path="/discovery" element={<Trials />} />
        <Route path="/trials" element={<Trials />} />
        <Route path="/trial/:nctId" element={<TrialDetails />} />
        <Route path="/publications" element={<Publications />} />
        <Route path="/publication/:pmid" element={<PublicationDetails />} />
        <Route path="/experts" element={<Experts />} />
        <Route path="/expert/profile" element={<ExpertProfile />} />
        <Route
          path="/curalink-expert/profile/:userId"
          element={<CollabioraExpertProfile />}
        />
        <Route path="/forums" element={<Forums />} />
        <Route path="/posts" element={<Discovery />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/manage-trials" element={<ManageTrials />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<EditProfile />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        {/* Auth0 routes */}
        <Route path="/auth/callback" element={<Auth0Callback />} />
        <Route path="/auth/complete-profile" element={<CompleteProfile />} />
        {/* Email verification */}
        <Route path="/verify-email" element={<VerifyEmail />} />
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
