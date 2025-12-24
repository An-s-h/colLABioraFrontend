"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Heart, Lightbulb, Target } from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackground";

export default function AboutUs() {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Animated Background */}
      <AnimatedBackground isMobile={isMobile} />

      {/* Single View Container - Centered Content */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:pt-20 pb-12 sm:pb-16 z-10">
        <div className="max-w-7xl w-full">
          {/* Grid Layout - All content visible at once */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column - Main Story */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
                  About Us
                </h1>
                <div className="w-16 h-1 bg-primary rounded-full" />
              </div>

              {/* Story Text */}
              <div className="space-y-3 max-w-2xl">
                <p className="text-base leading-relaxed text-foreground">
                  Collaboria is reimagining how health research is done — making
                  it transparent, ethical, and accessible to everyone.
                </p>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  Coming from neurology, neuroscience, psychology, and health
                  policy, we saw the same problem everywhere: valuable research
                  that patients and clinicians couldn't easily access or
                  understand.
                </p>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  Innovation slows when researchers, clinicians, and patients
                  work in silos. Collaboria brings them together — enabling
                  direct collaboration that accelerates discovery and keeps
                  research focused on real health needs.
                </p>

                <p className="text-sm leading-relaxed font-medium text-foreground">
                  We're building a new model for health research — one where
                  knowledge flows openly, collaboration drives discovery, and
                  every voice helps shape the future of health.
                </p>
              </div>
            </motion.div>

            {/* Right Column - Founders & Values */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Founders Card */}
              <div className="rounded-2xl p-3 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-0">
                  {/* Compact Image */}
                  <div className="shrink-0">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      whileHover={{ scale: 1.05, rotate: 2 }}
                      transition={{
                        opacity: { duration: 0.6, delay: 0.2 },
                        scale: {
                          duration: 0.5,
                          delay: 0.2,
                          type: "spring",
                          stiffness: 200,
                        },
                        rotate: { duration: 0.5, delay: 0.2 },
                      }}
                      className="overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64"
                    >
                      <img
                        src="/founders.jpeg"
                        alt="Founders - Sanskriti Sasikumar and Esther Feldman"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </div>

                  {/* Founders Info */}
                  <div className="flex-1 space-y-2 pl-5">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                      Our Founders
                    </h2>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-foreground">
                        Sanskriti Sasikumar
                      </p>
                      <p className="text-xs text-muted-foreground">MD, PhD</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-foreground">
                        Esther Feldman
                      </p>
                      <p className="text-xs text-muted-foreground">MSc</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Values Grid */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium">
                  What We Stand For
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: <Target size={20} />,
                      title: "Transparency",
                      description: "Open, understandable research for everyone",
                    },
                    {
                      icon: <Heart size={20} />,
                      title: "Ethics",
                      description: "Integrity at every step",
                    },
                    {
                      icon: <Users size={20} />,
                      title: "Collaboration",
                      description:
                        "Bringing researchers, clinicians, and patients together",
                    },
                  ].map((value, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-gradient-to-br from-card to-card/50 border border-border rounded-xl p-3 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-2">
                        {value.icon}
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1">
                        {value.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {value.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
