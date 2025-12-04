import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  MessageSquare,
  Calendar,
  Download,
  Share2,
  Zap,
  Users,
  Beaker,
  BookOpen,
  Send,
} from "lucide-react";
import { InfiniteMovingCards } from "./infinite-moving-cards";
import { Highlighter } from "@/components/ui/highlighter";

export default function HowItWorks() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const features = [
    {
      icon: LayoutDashboard,
      title: "Unified Dashboard",
      description:
        "Manage trials, publications, experts, and reports from one personalized dashboard — all synced and accessible at a glance.",
      color: "indigo",
      visual: "dashboard",
    },
    {
      icon: FileText,
      title: "Smart Reports",
      description:
        "Auto-generate structured reports from selected trials and publications. Perfect for sharing with doctors or keeping records.",
      color: "indigo",
      visual: "reports",
    },
    {
      icon: Sparkles,
      title: "AI Summaries",
      description:
        "Get instant AI-powered summaries across trials, publications, and expert profiles — making complex medical info simple and actionable.",
      color: "indigo",
      visual: "ai",
    },
    {
      icon: MessageSquare,
      title: "Collaborate & Schedule",
      description:
        "Patients can request meetings with experts. Researchers can chat with peers and collaborate directly within Collabiora.",
      color: "indigo",
      visual: "collaboration",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      indigo: {
        gradient: "from-indigo-500 to-blue-600",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
        light: "bg-indigo-100",
        darkGradient: "from-indigo-400 to-blue-500",
        darkBg: "bg-indigo-950/40",
        darkBorder: "border-indigo-800/50",
        darkText: "text-indigo-300",
      },
    };
    return colors[color] || colors.indigo;
  };

  const renderVisual = (visual, colorClasses) => {
    switch (visual) {
      case "dashboard":
        return (
          <div className="grid grid-cols-2 gap-2 w-full">
            {[
              { icon: Beaker, label: "Trials", value: "12" },
              { icon: BookOpen, label: "Papers", value: "8" },
              { icon: Users, label: "Experts", value: "5" },
              { icon: FileText, label: "Reports", value: "3" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-2 border border-gray-200/50 dark:border-gray-700/50"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3 text-indigo-500 dark:text-indigo-300" />
                    <span className="text-[9px] font-semibold text-gray-900 dark:text-gray-100">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {item.value}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "reports":
        return (
          <div className="space-y-2 w-full">
            <button
              className={`w-full py-1.5 px-3 bg-linear-to-r ${colorClasses.gradient} text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md`}
            >
              <Zap className="w-3 h-3" />
              Generate
            </button>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  Summary
                </div>
                <div className="flex gap-1">
                  <Download className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  <Share2 className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full bg-linear-to-r ${colorClasses.gradient} w-3/4`}
                />
              </div>
              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                3 trials, 5 papers
              </div>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-2 w-full">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colorClasses.bg} dark:${colorClasses.darkBg} border ${colorClasses.border} dark:${colorClasses.darkBorder} w-full justify-center`}
            >
              <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-300" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-200">
                AI Summary
              </span>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1.5">
                Findings
              </div>
              <div className="text-[10px] text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                78% response rate in advanced trials...
              </div>
              <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-300 text-[10px] font-semibold">
                <Zap className="w-2.5 h-2.5" />
                <span>2s</span>
              </div>
            </div>
          </div>
        );

      case "collaboration":
        return (
          <div className="space-y-2 w-full">
            <button
              className={`w-full py-1.5 px-3 bg-linear-to-r ${colorClasses.gradient} text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md`}
            >
              <Calendar className="w-3 h-3" />
              Schedule
            </button>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Dr. Chen
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    Online
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200/50 dark:border-gray-700/50">
                <MessageSquare className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-1">
                  Message...
                </span>
                <Send className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const cardItems = features.map((feature) => {
    const Icon = feature.icon;
    const colorClasses = getColorClasses(feature.color);

    return {
      quote: (
        <motion.div
          whileHover={{ y: -6 }}
          className="relative h-[340px] rounded-2xl p-4 flex flex-col group overflow-hidden bg-transparent"
        >
          {/* Inner colored card - appears floating */}
          <div className="relative h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <div
              className={`absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r ${colorClasses.gradient} opacity-60 group-hover:opacity-100 transition-opacity rounded-t-xl`}
            />

            <motion.div
              whileHover={{ rotate: 8, scale: 1.05 }}
              className={`inline-flex p-2 rounded-lg bg-linear-to-br ${colorClasses.gradient} shadow-md mb-3 w-fit`}
            >
              <Icon className="w-4 h-4 text-white" />
            </motion.div>

            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight line-clamp-2">
              {feature.title}
            </h3>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">
              {feature.description}
            </p>

            <div
              className={`${colorClasses.bg} dark:${colorClasses.darkBg} rounded-lg p-3 border ${colorClasses.border} dark:${colorClasses.darkBorder} min-h-[140px] flex items-center backdrop-blur-sm transition-all flex-1`}
            >
              {renderVisual(feature.visual, colorClasses)}
            </div>
          </div>
        </motion.div>
      ),
      name: "",
      title: "",
    };
  });

  return (
    <section className="relative px-5  overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96  rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96  rounded-full blur-3xl"></div>
      </div>

      <div className="relative mt-5 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center "
        >
          <p className="text-xl md:text-2xl font-bold mb-4 text-black dark:text-indigo-100 leading-tight">
            Everything{" "}
            {isMobile ? (
              <span className="text-indigo-600 dark:text-indigo-400">
                You Need for
              </span>
            ) : (
              <Highlighter
                action="underline"
                color="#4f46e5"
                strokeWidth={2}
                animationDuration={600}
                iterations={2}
                padding={3}
                multiline={true}
                isView={false}
              >
                You Need for
              </Highlighter>
            )}{" "}
            Smarter Healthcare{" "}
            {isMobile ? (
              <span className="px-1 rounded">All in One Place</span>
            ) : (
              <Highlighter
                action="highlight"
                color="#a5b4fc"
                strokeWidth={1}
                animationDuration={1000}
                iterations={2}
                padding={3}
                multiline={true}
                isView={false}
              >
                All in One Place
              </Highlighter>
            )}
          </p>
        </motion.div>

        {/* Infinite Moving Cards */}
        <div className="relative">
          <InfiniteMovingCards
            items={cardItems}
            direction="left"
            speed="normal"
            pauseOnHover={true}
            className="[&_li]:w-[280px] md:[&_li]:w-[320px] [&_li]:h-auto [&_li]:bg-transparent [&_li]:border-0 [&_li]:px-0"
          />
        </div>
      </div>
    </section>
  );
}
