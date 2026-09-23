"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const problems = [
  {
    number: "01",
    title: "Too much searching.",
    description:
      "People jump between job boards, company websites, and social platforms just to find new opportunities.",
  },
  {
    number: "02",
    title: "Repetitive browser work.",
    description:
      "Searching, clicking, filling forms, downloading files, and copying information takes time when repeated every day.",
  },
  {
    number: "03",
    title: "Important things get missed.",
    description:
      "New listings, price changes, reports, and updates can appear while you're busy doing something else.",
  },
  {
    number: "04",
    title: "Time spent on things that repeat.",
    description:
      "Many online tasks follow the same steps every time, yet people still have to manually do them from start to finish.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const item = {
  hidden: {
    opacity: 0,
    y: 25,
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

export default function ProblemPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <section className="px-6 pb-20 pt-24 sm:px-10 md:pb-24 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#b70569]">
              The problem
            </p>

            <h1 className="mt-5 font-playfair text-4xl font-semibold leading-tight tracking-tight">
              Too much work still happens manually.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-500">
              Everyday browser tasks are taking more time than they should.
              Scrapify is built to change that.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Problems */}
      <section className="border-t border-neutral-200 px-6 sm:px-10">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mx-auto max-w-6xl"
        >
          {problems.map((problem) => (
            <motion.div
              key={problem.number}
              variants={item}
              className="grid gap-6 border-b border-neutral-200 py-10 md:grid-cols-2 md:gap-10 md:py-14"
            >
              <span className="font-mono text-sm text-neutral-400">
                {problem.number}
              </span>

              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {problem.title}
                </h2>

                <p className="mt-3 text-sm leading-7 text-neutral-500">
                  {problem.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Closing */}
      <section className="px-6 py-24 sm:px-10 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl"
        >
          <div className="flex flex-col gap-6 border-t border-neutral-200 pt-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#b70569]">
                Our answer
              </p>

              <h2 className="mt-4 font-playfair text-3xl font-semibold tracking-tight sm:text-4xl">
                Let Scrapify handle the repetitive stuff.
              </h2>
            </div>

            <Link
              href="/create"
              className="inline-flex w-fit items-center gap-2 text-sm font-medium transition-colors hover:text-[#b70569]"
            >
              Create an automation
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}