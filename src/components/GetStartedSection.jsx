"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Stethoscope,
  Award,
  User,
  Search,
  FlaskConical,
  FileText,
  Calendar,
  BookOpen,
  Users,
  DollarSign,
  CheckCircle2,
} from "lucide-react";

const GetStartedSection = () => {
  const patientSteps = [
    {
      title: "Create your profile",
      description: "Set up your health profile and get matched with research",
      icon: User,
      features: [
        { text: "Document condition & symptoms", icon: FileText },
        { text: "Track your complete medical history", icon: Calendar },
        { text: "Get matched with relevant research", icon: Search },
      ],
    },
    {
      title: "Explore & Participate",
      description: "Find treatments, trials, and connect with experts",
      icon: Search,
      features: [
        { text: "Browse peer-reviewed publications", icon: BookOpen },
        {
          text: "Discover active clinical trials & studies",
          icon: FlaskConical,
        },
        { text: "Connect with medical experts & peers", icon: Users },
      ],
    },
  ];

  const researcherSteps = [
    {
      title: "Set up your profile",
      description: "Showcase your expertise and build your portfolio",
      icon: User,
      features: [
        { text: "Highlight credentials & publications", icon: FileText },
        { text: "List research areas & specialties", icon: Search },
        { text: "Build your professional portfolio", icon: Award },
      ],
    },
    {
      title: "Publish & Monetize",
      description: "Share your findings and connect with peers",
      icon: FlaskConical,
      features: [
        { text: "Publish research papers & citations", icon: BookOpen },
        { text: "Connect with peer researchers globally", icon: Users },
        { text: "Earn from consultations & licensing", icon: DollarSign },
      ],
    },
  ];

  const PatientCard = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative"
    >
      <div
        className="rounded-xl p-6 border-2 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#D0C4E2",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="p-2.5 rounded-lg"
            style={{
              backgroundColor: "#F5F2F8",
            }}
          >
            <Stethoscope className="w-5 h-5" style={{ color: "#2F3C96" }} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: "#2F3C96" }}>
            For Patients & Caregivers
          </h3>
        </div>

        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: "#787878" }}
        >
          Access world-class medical expertise and participate in cutting-edge
          research
        </p>

        <div className="mb-6 flex-1">
          <div className="grid grid-cols-2 gap-4 items-stretch">
            {patientSteps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-lg border transition-all duration-200 flex flex-col h-full min-h-[200px]"
                  style={{
                    backgroundColor: "#F5F2F8",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold mb-1.5"
                        style={{ color: "#2F3C96" }}
                      >
                        {item.title}
                      </p>
                      <p
                        className="text-xs leading-relaxed mb-3 min-h-[2.5rem]"
                        style={{ color: "#787878" }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {item.features.map((feature, fIdx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <li
                          key={fIdx}
                          className="flex items-center gap-2 text-xs"
                          style={{ color: "#2F3C96" }}
                        >
                          <CheckCircle2
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: "#D0C4E2" }}
                          />
                          <span>{feature.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 px-5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 mt-auto text-white"
          style={{
            background: `linear-gradient(to right, #2F3C96, #474F97)`,
          }}
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );

  const ResearcherCard = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative"
    >
      <div
        className="rounded-xl p-6 border-2 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#D0C4E2",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="p-2.5 rounded-lg"
            style={{
              backgroundColor: "#F5F2F8",
            }}
          >
            <Award className="w-5 h-5" style={{ color: "#2F3C96" }} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: "#2F3C96" }}>
            For Researchers
          </h3>
        </div>

        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: "#787878" }}
        >
          Amplify your research impact, connect with peers, and monetize your
          expertise
        </p>

        <div className="mb-6 flex-1">
          <div className="grid grid-cols-2 gap-4 items-stretch">
            {researcherSteps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-lg border transition-all duration-200 flex flex-col h-full min-h-[200px]"
                  style={{
                    backgroundColor: "#F5F2F8",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: "#2F3C96" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold mb-1.5"
                        style={{ color: "#2F3C96" }}
                      >
                        {item.title}
                      </p>
                      <p
                        className="text-xs leading-relaxed mb-3 min-h-[2.5rem]"
                        style={{ color: "#787878" }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {item.features.map((feature, fIdx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <li
                          key={fIdx}
                          className="flex items-center gap-2 text-xs"
                          style={{ color: "#2F3C96" }}
                        >
                          <CheckCircle2
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: "#D0C4E2" }}
                          />
                          <span>{feature.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => (window.location.href = "/onboard/researcher")}
          className="w-full py-3 px-5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 mt-auto text-white"
          style={{
            background: `linear-gradient(to right, #2F3C96, #474F97)`,
          }}
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <section className="relative pb-12 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight"
            style={{ color: "#2F3C96" }}
          >
            Get Started Today
          </h2>
          <p className="text-sm sm:text-base" style={{ color: "#787878" }}>
            Join a community of patients and researchers working together to
            advance healthcare
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          <PatientCard />
          <ResearcherCard />
        </div>
      </div>
    </section>
  );
};

export default GetStartedSection;
