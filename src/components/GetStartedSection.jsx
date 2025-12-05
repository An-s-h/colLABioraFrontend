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
      step: 1,
      title: "Create your profile",
      description: "Set up your health profile in minutes",
      icon: User,
      features: [
        { text: "Document your condition & symptoms", icon: FileText },
        { text: "Track medical history", icon: Calendar },
        { text: "Get matched with relevant research", icon: Search },
      ],
    },
    {
      step: 2,
      title: "Explore & Participate",
      description: "Find treatments, trials & experts",
      icon: Search,
      features: [
        { text: "Browse peer-reviewed publications", icon: BookOpen },
        { text: "Discover active clinical trials", icon: FlaskConical },
        { text: "Connect with medical experts", icon: Users },
      ],
    },
  ];

  const researcherSteps = [
    {
      step: 1,
      title: "Set up your profile",
      description: "Showcase expertise & research",
      icon: User,
      features: [
        { text: "Highlight credentials & publications", icon: FileText },
        { text: "List research areas & specialties", icon: Search },
        { text: "Build your professional portfolio", icon: Award },
      ],
    },
    {
      step: 2,
      title: "Publish & Monetize",
      description: "Share findings & generate revenue",
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
        className="rounded-xl p-5 border-2 shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col relative overflow-hidden"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#D0C4E2",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-60"
          style={{
            background: `linear-gradient(to right, #2F3C96, #D0C4E2)`,
          }}
        />
        <div className="flex items-center gap-3 mb-4 pt-2">
          <div
            className="p-3 rounded-xl shadow-sm"
            style={{
              backgroundColor: "#F5F2F8",
              border: "1px solid #D0C4E2",
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
                  whileHover={{ y: -2, borderColor: "#B8A5D5" }}
                  className="p-4 rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col h-full"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
                      style={{
                        background: `linear-gradient(to bottom right, #2F3C96, #D0C4E2)`,
                        color: "#FFFFFF",
                      }}
                    >
                      {item.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="p-1.5 rounded-md"
                          style={{
                            backgroundColor: "#F5F2F8",
                            border: "1px solid #D0C4E2",
                          }}
                        >
                          <Icon
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: "#D0C4E2" }}
                          />
                        </div>
                        <p
                          className="text-sm font-bold leading-tight"
                          style={{ color: "#2F3C96" }}
                        >
                          {item.title}
                        </p>
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {item.features.map((feature, fIdx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <li
                          key={fIdx}
                          className="flex items-start gap-2.5 text-xs leading-relaxed"
                          style={{ color: "#2F3C96" }}
                        >
                          <div
                            className="shrink-0 mt-0.5 p-1 rounded-md"
                            style={{
                              backgroundColor: "#F5F2F8",
                              border: "1px solid #D0C4E2",
                            }}
                          >
                            <FeatureIcon
                              className="w-3 h-3"
                              style={{ color: "#D0C4E2" }}
                            />
                          </div>
                          <span className="flex-1">{feature.text}</span>
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
          className="w-full py-2.5 px-5 rounded-lg border-2 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 mt-auto text-white"
          style={{
            background: `linear-gradient(to right, #2F3C96, #D0C4E2)`,
            borderColor: "#D0C4E2",
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
        className="rounded-xl p-5 border-2 shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col relative overflow-hidden"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#D0C4E2",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-60"
          style={{
            background: `linear-gradient(to right, #2F3C96, #D0C4E2)`,
          }}
        />
        <div className="flex items-center gap-3 mb-4 pt-2">
          <div
            className="p-3 rounded-xl shadow-sm"
            style={{
              backgroundColor: "#F5F2F8",
              border: "1px solid #D0C4E2",
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
                  whileHover={{ y: -2, borderColor: "#B8A5D5" }}
                  className="p-4 rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col h-full"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#D0C4E2",
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
                      style={{
                        background: `linear-gradient(to bottom right, #2F3C96, #D0C4E2)`,
                        color: "#FFFFFF",
                      }}
                    >
                      {item.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="p-1.5 rounded-md"
                          style={{
                            backgroundColor: "#F5F2F8",
                            border: "1px solid #D0C4E2",
                          }}
                        >
                          <Icon
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: "#D0C4E2" }}
                          />
                        </div>
                        <p
                          className="text-sm font-bold leading-tight"
                          style={{ color: "#2F3C96" }}
                        >
                          {item.title}
                        </p>
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "#787878" }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {item.features.map((feature, fIdx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <li
                          key={fIdx}
                          className="flex items-start gap-2.5 text-xs leading-relaxed"
                          style={{ color: "#2F3C96" }}
                        >
                          <div
                            className="shrink-0 mt-0.5 p-1 rounded-md"
                            style={{
                              backgroundColor: "#F5F2F8",
                              border: "1px solid #D0C4E2",
                            }}
                          >
                            <FeatureIcon
                              className="w-3 h-3"
                              style={{ color: "#D0C4E2" }}
                            />
                          </div>
                          <span className="flex-1">{feature.text}</span>
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
          className="w-full py-2.5 px-5 rounded-lg border-2 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 mt-auto text-white"
          style={{
            background: `linear-gradient(to right, #2F3C96, #D0C4E2)`,
            borderColor: "#D0C4E2",
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
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight"
            style={{ color: "#2F3C96" }}
          >
            Get started in minutes and join a community{" "}
          </h2>
          <p className="text-sm sm:text-base mt-3" style={{ color: "#787878" }}>
            Whether you're a patient seeking treatment or a researcher expanding
            your impact
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
