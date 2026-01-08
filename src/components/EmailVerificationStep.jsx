import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Mail, AlertCircle, Clock } from "lucide-react";
import Button from "./ui/Button.jsx";
import Input from "./ui/Input.jsx";
import toast from "react-hot-toast";
import { broadcastEmailVerified, listenForMessages } from "../utils/crossTabSync.js";

export default function EmailVerificationStep({ email, onVerified, onResend }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState("idle"); // idle, verifying, success, error
  const [message, setMessage] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const inputRefs = [];

  // Get email from prop or localStorage - use useMemo to ensure it's stable
  const userEmail = useMemo(() => {
    if (email) return email;
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    return userData.email || "";
  }, [email]);

  // Log for debugging
  useEffect(() => {
    console.log("EmailVerificationStep mounted with email:", userEmail);
  }, [userEmail]);

  // Update time remaining countdown
  const updateTimeRemaining = (expiry) => {
    if (!expiry) return null;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        setOtpExpiresAt(null);
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  // Auto-send verification email on mount if not already sent
  useEffect(() => {
    const sendInitialVerificationEmail = async () => {
      const token = localStorage.getItem("token");
      if (!token || !userEmail) {
        console.log("Cannot send verification email - missing token or email");
        return;
      }

      // Check if we already sent an email recently
      const lastSentKey = `verification_email_sent_${userEmail}`;
      const lastSent = localStorage.getItem(lastSentKey);
      if (lastSent) {
        const sentTime = parseInt(lastSent);
        const now = Date.now();
        // If sent within last 5 minutes, don't resend
        if (now - sentTime < 5 * 60 * 1000) {
          // But still check for OTP expiry
          const storedOtpExpiry = localStorage.getItem(`otp_expiry_${userEmail}`);
          if (storedOtpExpiry) {
            const expiry = new Date(storedOtpExpiry);
            setOtpExpiresAt(expiry);
            updateTimeRemaining(expiry);
          }
          return;
        }
      }

      try {
        const response = await fetch(`${base}/api/auth/send-verification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Store OTP expiry if provided
          if (data.otpExpiresAt) {
            localStorage.setItem(`otp_expiry_${userEmail}`, data.otpExpiresAt);
            const expiry = new Date(data.otpExpiresAt);
            setOtpExpiresAt(expiry);
            updateTimeRemaining(expiry);
          }
          // Mark as sent
          localStorage.setItem(lastSentKey, Date.now().toString());
          toast.success("Verification email sent! Please check your inbox.");
        }
      } catch (error) {
        console.error("Error sending initial verification email:", error);
        // Don't show error - user can manually resend
      }
    };

    sendInitialVerificationEmail();
  }, [userEmail, base]);

  // Create refs for OTP inputs
  for (let i = 0; i < 6; i++) {
    inputRefs.push(React.createRef());
  }

  // Helper function to handle successful verification
  const handleVerificationSuccess = useCallback((userData) => {
    setStatus("success");
    setMessage("Email verified successfully!");

    // Update user in localStorage
    if (userData && (userData._id || userData.id)) {
      userData.emailVerified = true;
      localStorage.setItem("user", JSON.stringify(userData));

      // Dispatch login event to update navbar (only after verification)
      window.dispatchEvent(new Event("login"));

      // Broadcast to all tabs (cross-tab sync)
      broadcastEmailVerified(userData);

      // Clear OTP expiry
      localStorage.removeItem(`otp_expiry_${userEmail}`);
    }

    // Call onVerified callback after a short delay
    if (onVerified) {
      setTimeout(() => {
        onVerified();
      }, 1500);
    }
  }, [userEmail, onVerified]);

  // Polling: Check email verification status periodically
  useEffect(() => {
    // Don't poll if already verified or verifying
    if (status === "success" || status === "verifying") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const checkEmailVerificationStatus = async () => {
      try {
        const response = await fetch(`${base}/api/auth/check-email-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Check if email is verified
          if (data.emailVerified) {
            // Get updated user data
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            handleVerificationSuccess(userData);
            return; // Stop polling
          }

          // If we have OTP expiry info, set it
          const storedOtpExpiry = localStorage.getItem(`otp_expiry_${userEmail}`);
          if (storedOtpExpiry) {
            const expiry = new Date(storedOtpExpiry);
            setOtpExpiresAt(expiry);
            updateTimeRemaining(expiry);
          }
        }
      } catch (error) {
        // Silently fail - don't show errors for background checks
        console.error("Error checking email verification status:", error);
      }
    };

    // Check immediately
    checkEmailVerificationStatus();

    // Then check every 3 seconds (polling interval)
    const pollInterval = setInterval(() => {
      // Stop polling if verified
      if (status === "success") {
        clearInterval(pollInterval);
        return;
      }
      checkEmailVerificationStatus();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [userEmail, base, status, handleVerificationSuccess]);

  // Cross-tab sync: Listen for email verification from other tabs/devices
  useEffect(() => {
    // Don't listen if already verified
    if (status === "success") return;

    const cleanup = listenForMessages((type, data) => {
      if (type === "email-verified" && data.user) {
        // Email was verified in another tab/device
        console.log("Email verified in another tab/device, updating...");
        handleVerificationSuccess(data.user);
      }
    });

    return cleanup;
  }, [status, handleVerificationSuccess]);

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newOtp.every((digit) => digit !== "")) {
      handleVerifyOTP(newOtp.join(""));
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);

    if (digits.length === 6) {
      const newOtp = digits.split("");
      setOtp(newOtp);
      // Focus last input
      inputRefs[5].current?.focus();
      // Auto-verify
      setTimeout(() => handleVerifyOTP(digits), 100);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (otpCode) => {
    if (!otpCode || otpCode.length !== 6) {
      setMessage("Please enter a valid 6-digit code");
      return;
    }

    setVerifying(true);
    setStatus("verifying");
    setMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("error");
      setMessage("Please sign in to verify your email");
      setVerifying(false);
      return;
    }

    try {
      const response = await fetch(`${base}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: otpCode }),
      });

      const data = await response.json();

      if (response.ok) {
        // Get updated user data
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        if (data.user) {
          Object.assign(userData, data.user);
        }
        handleVerificationSuccess(userData);
      } else {
        setStatus("error");
        if (data.code === "EXPIRED_OTP") {
          setMessage("This OTP code has expired. Please request a new one.");
          setOtpExpiresAt(null);
          setTimeRemaining(null);
        } else if (data.code === "INVALID_OTP") {
          setMessage("Invalid OTP code. Please try again.");
          // Clear OTP inputs
          setOtp(["", "", "", "", "", ""]);
          inputRefs[0].current?.focus();
        } else {
          setMessage(data.error || "Failed to verify OTP. Please try again.");
        }
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setStatus("error");
      setMessage("An error occurred while verifying your OTP");
    } finally {
      setVerifying(false);
    }
  };

  // Resend verification email
  const handleResend = async () => {
    setResending(true);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please sign in to verify your email");
      setResending(false);
      return;
    }

    try {
      const response = await fetch(`${base}/api/auth/send-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Verification email sent! Please check your inbox.");
        // Store OTP expiry
        if (data.otpExpiresAt) {
          const expiry = new Date(data.otpExpiresAt);
            localStorage.setItem(`otp_expiry_${userEmail}`, expiry.toISOString());
          setOtpExpiresAt(expiry);
          updateTimeRemaining(expiry);
        }
        // Clear OTP inputs
        setOtp(["", "", "", "", "", ""]);
        setStatus("idle");
        setMessage("");
        inputRefs[0].current?.focus();
      } else if (response.status === 429) {
        toast.error(data.error || "Please wait before requesting another verification email.");
        setMessage(data.error || "Please wait before requesting another verification email.");
      } else {
        toast.error(data.error || "Failed to send verification email");
        setMessage(data.error || "Failed to send verification email");
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email. Please try again.");
      setMessage("Failed to send verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Check for verification link in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      // Handle link verification
      handleVerifyLink(token);
    }
  }, []);

  const handleVerifyLink = async (token) => {
    setVerifying(true);
    setStatus("verifying");
    setMessage("");

    try {
      const decodedToken = decodeURIComponent(token);
      const response = await fetch(`${base}/api/auth/verify-email?token=${decodedToken}`);
      const data = await response.json();

      if (response.ok) {
        // Get updated user data
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        if (data.user) {
          Object.assign(userData, data.user);
        }
        
        // Clear token from URL
        window.history.replaceState({}, "", window.location.pathname);
        
        handleVerificationSuccess(userData);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to verify email. The link may be invalid or expired.");
      }
    } catch (error) {
      console.error("Link verification error:", error);
      setStatus("error");
      setMessage("An error occurred while verifying your email");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(47, 60, 150, 0.1)" }}
          >
            <Mail className="w-8 h-8" style={{ color: "#2F3C96" }} />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
          Just before you get started, verify yourself
        </h3>
        <p className="text-sm mb-4" style={{ color: "#787878" }}>
          We've sent a verification code to
        </p>
        <p className="text-base font-semibold mb-6" style={{ color: "#2F3C96" }}>
          {userEmail}
        </p>
      </div>

      {/* Success State */}
      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
            >
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
            Email Verified!
          </h3>
          <p className="text-sm" style={{ color: "#787878" }}>
            {message}
          </p>
        </motion.div>
      )}

      {/* Verifying State */}
      {status === "verifying" && (
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-16 h-16 text-[#2F3C96] animate-spin" />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#2F3C96" }}>
            Verifying Your Email
          </h3>
          <p className="text-sm" style={{ color: "#787878" }}>
            Please wait while we verify your email address...
          </p>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-lg border mb-4"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.3)",
          }}
        >
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{message}</p>
          </div>
        </motion.div>
      )}

      {/* OTP Input (only show if not verifying/success) */}
      {status !== "verifying" && status !== "success" && (
        <>
          <div>
            <label
              className="block text-xs font-semibold mb-2 text-center"
              style={{ color: "#2F3C96" }}
            >
              Enter Verification Code
            </label>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-bold border-2 rounded-lg transition-all focus:outline-none focus:ring-2"
                  style={{
                    borderColor: digit ? "#2F3C96" : "#E8E8E8",
                    color: "#2F3C96",
                    "--tw-ring-color": "#D0C4E2",
                  }}
                  disabled={verifying || resending}
                />
              ))}
            </div>
            {timeRemaining && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Clock className="w-4 h-4" style={{ color: "#787878" }} />
                <p className="text-xs" style={{ color: "#787878" }}>
                  Code expires in {timeRemaining}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handleVerifyOTP(otp.join(""))}
              disabled={verifying || resending || otp.some((d) => !d)}
              className="w-full py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                backgroundColor: "#2F3C96",
                color: "#FFFFFF",
              }}
            >
              {verifying ? "Verifying..." : "Verify Email"}
            </Button>

            <div className="text-center">
              <p className="text-xs mb-2" style={{ color: "#787878" }}>
                Didn't receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resending || verifying}
                className="text-sm font-semibold underline hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: "#2F3C96" }}
              >
                {resending ? "Sending..." : "Resend Code"}
              </button>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: "#E8E8E8" }}>
              <p className="text-xs text-center mb-2" style={{ color: "#787878" }}>
                Or verify by clicking the link in your email
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

