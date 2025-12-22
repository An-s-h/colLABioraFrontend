"use client";
import { motion } from "framer-motion";
import { Users, Heart, Lightbulb, Target } from "lucide-react";
import AnimatedBackground from "../components/ui/AnimatedBackgroundDiff";
// import { PixelImage } from "../components/ui/pixel-image";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      {/* Single View Container */}
      <div className="h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative z-10">
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
              <div className="space-y-3">
                <p className="text-base leading-relaxed text-foreground">
                  Founded by{" "}
                  <span className="font-semibold text-primary">
                    Sanskriti Sasikumar (MD, PhD)
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-primary">
                    Esther Feldman (MSc)
                  </span>
                  , Collabiora makes health research transparent, ethical, and
                  accessible to everyone.
                </p>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  With backgrounds in neurology, neuroscience, psychology, and
                  health policy, we saw a clear gap. Valuable research often
                  remains inaccessible or difficult to interpret for the
                  patients, clinicians, and communities it is meant to support.
                </p>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  Innovation stalls when researchers, clinicians, and patients
                  work in isolation. Collabiora breaks down these silos,
                  fostering direct collaboration that accelerates discovery and
                  ensures research addresses the health challenges that matter
                  most.
                </p>

                <p className="text-sm leading-relaxed font-medium text-foreground">
                  We represent a new model for ethical research where knowledge
                  flows openly, collaboration accelerates discovery, and every
                  voice helps shape the future of health.
                </p>
              </div>
            </motion.div>

            {/* Right Column - Founders & Values */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-4"
            >
              {/* Founders Card */}
              <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <img
                      src="/founders.jpeg"
                      alt="Sanskriti Sasikumar and Esther Feldman"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-cover rounded-xl border-2 border-primary/20 shadow-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                      Passionate Founders
                    </h2>
                    <div className="flex flex-col gap-1 text-lg sm:text-xl text-foreground">
                      <p className="font-semibold">Sanskriti</p>
                      <p className="font-semibold">Esther</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Values Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: <Target size={20} />,
                    title: "Transparency",
                    description: "Making research accessible",
                  },
                  {
                    icon: <Heart size={20} />,
                    title: "Ethics",
                    description: "Integrity and care",
                  },
                  {
                    icon: <Users size={20} />,
                    title: "Collaboration",
                    description: "Breaking down silos",
                  },
                ].map((value, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                    whileHover={{ y: -2 }}
                    className="bg-card border border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors"
                  >
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-2">
                      {value.icon}
                    </div>
                    <h3 className="text-xs font-semibold text-foreground mb-1">
                      {value.title}
                    </h3>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      {value.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
