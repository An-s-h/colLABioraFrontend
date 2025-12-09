"use client";

import { motion } from "framer-motion";
import { InfiniteMovingCards } from "./ui/infinite-moving-cards";

const TrustedNetworksMarquee = () => {
  const networks = [
    {
      name: "ClinicalTrials.gov",
      linkUrl: "#", // Update with actual ClinicalTrials.gov link URL
      imageUrl:
        "https://crir.ca/wp-content/uploads/2020/05/nihclinicaltrials.png", // Update with ClinicalTrials.gov logo image URL
    },
    {
      name: "PubMed",
      linkUrl: "#", // Update with actual PubMed link URL
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/US-NLM-PubMed-Logo.svg/1280px-US-NLM-PubMed-Logo.svg.png", // Update with PubMed logo image URL
    },
    {
      name: "ORCID",
      linkUrl: "#", // Update with actual ORCID link URL
      imageUrl:
        "https://imgs.search.brave.com/vO_4RcuHKKD9is8uZvS7MKw9GCklUbT5d4BgRnSd2vs/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy90/aHVtYi8xLzE0L09S/Q0lEX2xvZ28uc3Zn/LzI1MHB4LU9SQ0lE/X2xvZ28uc3ZnLnBu/Zw",
    },
    {
      name: "EU Clinical Trials Register",
      linkUrl: "#", // Update with actual EU Clinical Trials Register link URL
      imageUrl:
        "https://3d-hub-organoids.com/wp-content/uploads/2020/12/EU_CT-300x300.jpg", // Update with EU Clinical Trials Register logo image URL
    },
  ];

  const cardItems = networks.map((network) => ({
    quote: (
      <a
        href={network.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center transition-all hover:scale-105"
        style={{
          textDecoration: "none",
        }}
      >
        <img
          src={network.imageUrl}
          alt={network.name}
          className="h-12 w-auto object-contain"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </a>
    ),
    name: "",
    title: "",
  }));

  return (
    <section
      className="relative   sm:py-12 overflow-hidden "
      style={{ borderColor: "#D0C4E2", backgroundColor: "transparent" }}
    >
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mb-6"
        >
          <p
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "#787878" }}
          >
            Built on Trusted Research Networks
          </p>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          <InfiniteMovingCards
            items={cardItems}
            direction="left"
            speed="normal"
            pauseOnHover={true}
            className="[&_li]:w-[200px] md:[&_li]:w-[250px] [&_li]:h-auto [&_li]:bg-transparent [&_li]:border-0 [&_li]:px-0 [&_li]:py-4"
          />
        </div>
      </div>
    </section>
  );
};

export default TrustedNetworksMarquee;
