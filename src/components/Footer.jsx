import React from "react";
import {
  Link2,
  Github,
  Instagram,
  Twitter,
  Mail,
  FileText,
  Shield,
  BookOpen,
  Activity,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative w-full pb-10 pt-4 text-center bg-transparent">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          className="text-4xl font-bold lobster-two-regular tracking-tight transition-colors"
          style={{ color: "#2F3C96" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#2F3C96")}
        >
          Collabiora
        </span>
      </div>

      {/* Social Media Icons */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <a
          href="#"
          className="transition-colors"
          style={{ color: "#787878" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#787878")}
          aria-label="GitHub"
        >
          <Github className="w-5 h-5" />
        </a>
        <a
          href="#"
          className="transition-colors"
          style={{ color: "#787878" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#787878")}
          aria-label="Instagram"
        >
          <Instagram className="w-5 h-5" />
        </a>
        <a
          href="#"
          className="transition-colors"
          style={{ color: "#787878" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#787878")}
          aria-label="Twitter"
        >
          <Twitter className="w-5 h-5" />
        </a>
        <a
          href="#"
          className="transition-colors"
          style={{ color: "#787878" }}
          onMouseEnter={(e) => (e.target.style.color = "#D0C4E2")}
          onMouseLeave={(e) => (e.target.style.color = "#787878")}
          aria-label="Email"
        >
          <Mail className="w-5 h-5" />
        </a>
      </div>

      {/* Copyright */}
      <div className="text-sm" style={{ color: "#787878" }}>
        © {new Date().getFullYear()}{" "}
        <span
          className="lobster-two-regular tracking-tight"
          style={{ color: "#2F3C96" }}
        >
          Collabiora
        </span>
        , Inc.
      </div>
    </footer>
  );
}
