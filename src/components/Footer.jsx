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
        <span className="text-4xl font-bold  text-indigo-700 hover:text-indigo-600 lobster-two-regular tracking-tight">
          Collabiora
        </span>
      </div>

      

      {/* Social Media Icons */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <a
          href="#"
          className="text-slate-700 hover:text-indigo-600 transition-colors"
          aria-label="GitHub"
        >
          <Github className="w-5 h-5" />
        </a>
        <a
          href="#"
          className="text-slate-700 hover:text-indigo-600 transition-colors"
          aria-label="Instagram"
        >
          <Instagram className="w-5 h-5" />
        </a>
        <a
          href="#"
          className="text-slate-700 hover:text-indigo-600 transition-colors"
          aria-label="Twitter"
        >
          <Twitter className="w-5 h-5" />
        </a>
        <a
          href="#"
          className="text-slate-700 hover:text-indigo-600 transition-colors"
          aria-label="Email"
        >
          <Mail className="w-5 h-5" />
        </a>
      </div>

      {/* Copyright */}
      <div className="text-sm text-slate-600">
        © {new Date().getFullYear()}{" "}
        <span className="lobster-two-regular tracking-tight">Collabiora</span>,
        Inc.
      </div>
    </footer>
  );
}
