"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSearch,
  Globe2,
  Search,
  Zap,
} from "lucide-react";

const capabilities = [
  {
    number: "01",
    icon: Search,
    title: "Find information",
    description:
      "Search across websites and find the exact information you need without doing the repetitive browsing yourself.",
    example: "Find all available bags on Jumia.",
    motion: "bounce",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Fill out forms",
    description:
      "Let Scrapify handle repetitive form-filling tasks using the information you provide.",
    example: "Fill out this application form with my details.",
    motion: "roll",
  },
  {
    number: "03",
    icon: Download,
    title: "Download files",
    description:
      "Navigate websites, locate the files you need, and download them automatically.",
    example: "Download this month's sales report.",
    motion: "bounce",
  },
  {
    number: "04",
    icon: Globe2,
    title: "Collect data",
    description:
      "Gather useful information from websites and turn repetitive browsing into a reusable workflow.",
    example: "Collect the prices of these products.",
    motion: "roll",
  },
  {
    number: "05",
    icon: FileSearch,
    title: "Monitor websites",
    description:
      "Keep an eye on websites for changes, new information, listings, or anything else that matters to you.",
    example: "Check this website for new listings every morning.",
    motion: "bounce",
  },
  {
    number: "06",
    icon: CheckCircle2,
    title: "Repeat tasks",
    description:
      "Save an automation once and run the same workflow again whenever you need it.",
    example: "Run my weekly reporting workflow.",
    motion: "roll",
  },
  {
    number: "07",
    icon: CalendarClock,
    title: "Schedule automations",
    description:
      "Set your workflows to run automatically at the time and frequency you choose.",
    example: "Run this every Monday at 9 AM.",
    motion: "bounce",
  },
  {
    number: "08",
    icon: Zap,
    title: "Automate workflows",
    description:
      "Turn multi-step browser tasks into simple automations that Scrapify can replay for you.",
    example: "Sign in, find the report, download it, and save the result.",
    motion: "roll",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Looping hover animations for the icon itself
const iconHoverMotion = {
  bounce: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut" as const,
      repeat: Infinity,
    },
  },
  roll: {
    x: [0, 5, -5, 0],
    rotate: [0, 180, 360],
    transition: {
      duration: 0.9,
      ease: "easeInOut" as const,
      repeat: Infinity,
    },
  },
};

export default function CapabilitiesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-secondary">
      {/* Hero */}
      <section className="px-6 pb-24 pt-24 sm:px-10 sm:pt-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <p className="mb-6 text-sm font-medium uppercase tracking-[0.22em] text-[#b70569]">
              What you can do
            </p>

            <h1 className="font-playfair text-3xl font-semibold leading-[1.05] tracking-tight sm:text-3xl md:text-5xl ">
              Let Scrapify handle
              <span className="md:block text-[#b70569] ml-2 md:ml-14">
                the repetitive stuff.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
              From finding information to downloading reports, Scrapify turns
              the browser tasks you repeat every day into simple, reusable
              automations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t border-neutral-200 px-6 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.08 }}
            className="grid grid-cols-1 divide-y divide-neutral-200 md:grid-cols-4 md:divide-x md:divide-y-0"
          >
            {capabilities.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.number}
                  variants={itemVariants}
                  className={`group relative px-0 py-10 md:px-10 justify-between ${
                    index >= 2 ? "md:border-t md:border-neutral-200" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <motion.div
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors duration-300 group-hover:border-[#b70569] group-hover:bg-[#b70569] group-hover:text-white"
                      whileHover={iconHoverMotion[item.motion as "bounce" | "roll"]}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </motion.div>

                    <span className="text-sm font-medium text-neutral-300">
                      {item.number}
                    </span>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {item.title}
                    </h2>

                    <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-start gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#b70569]" />

                    <p className="text-xs text-neutral-600">
                      <span className="font-medium text-black">Try:</span>{" "}
                      {item.example}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>



    </main>
  );
}