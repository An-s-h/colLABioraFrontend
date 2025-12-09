import React from "react";
import {
  Github,
  Instagram,
  Twitter,
  Mail,
  Linkedin,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative w-full pb-10 pt-4 text-center bg-transparent">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <img
          src="/logo1.png"
          alt="Collabiora Logo"
          className="h-6 w-auto"
        />
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: "#2F3C96" }}
        >
          Collabiora
        </span>
      </div>

      {/* Social Media Icons */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <a
          href="https://www.linkedin.com/company/collabiora"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors"
          style={{ color: "#787878" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#787878")}
          aria-label="LinkedIn"
        >
          <Linkedin className="w-5 h-5" />
        </a>
        <a
          href="https://www.instagram.com/drscollaborate/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors"
          style={{ color: "#787878" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#787878")}
          aria-label="Instagram"
        >
          <Instagram className="w-5 h-5" />
        </a>
        <a
          href="https://www.tiktok.com/@collabiora"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors"
          style={{ color: "#787878" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#787878")}
          aria-label="TikTok"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        </a>
      </div>

      {/* Copyright */}
      <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "#787878" }}>
        © {new Date().getFullYear()}{" "}
        <div className="flex items-center gap-1.5">
          <span
            className="tracking-tight font-semibold"
            style={{ color: "#2F3C96" }}
          >
            Collabiora
          </span>
        </div>
        , Inc.
      </div>
    </footer>
  );
}
