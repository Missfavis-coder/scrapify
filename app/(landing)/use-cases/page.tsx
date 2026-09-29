"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  BriefcaseBusiness,
  Download,
  FileSearch,
  Globe2,
  Search,
  ShoppingBag,
  Workflow,
} from "lucide-react";
import Link from "next/link";

const useCases = [
  {
    number: "01",
    icon: Search,
    category: "Job hunting",
    title: "Find opportunities without checking every website yourself.",
    problem:
      "Job openings can appear across company career pages, job boards, and professional platforms. Checking each one manually every day takes time and makes it easy to miss something new.",
    solution:
      "Tell Scrapify where to look and what you are searching for. It can navigate through the websites, look for relevant openings, and bring the information back to you.",
    prompt:
      "Check these job websites for new frontend developer openings in Lagos.",
  },
  {
    number: "02",
    icon: ShoppingBag,
    category: "Price research",
    title: "Compare products without opening dozens of tabs.",
    problem:
      "Finding the right product often means visiting different stores, searching for the same item repeatedly, and manually comparing prices, availability, and other details.",
    solution:
      "Give Scrapify the websites and the product you are interested in. It can visit them, find the relevant results, and collect the information for you.",
    prompt:
      "Find this laptop on these three websites and compare their prices.",
  },
  {
    number: "03",
    icon: Download,
    category: "Reports & files",
    title: "Stop repeating the same download every month.",
    problem:
      "Reports, invoices, statements, and other files are often buried behind several clicks. Doing the same process every week or month becomes unnecessary busywork.",
    solution:
      "Create the workflow once. Scrapify can repeat the same browser steps to find and download the file whenever you need it.",
    prompt:
      "Log in and download this month's sales report.",
  },
  {
    number: "04",
    icon: FileSearch,
    category: "Data collection",
    title: "Turn repetitive research into an automated workflow.",
    problem:
      "Collecting information from multiple pages can involve hours of searching, copying, pasting, and organizing information that follows a predictable pattern.",
    solution:
      "Describe the information you need and where to find it. Scrapify can navigate the websites and collect the relevant information as part of a reusable workflow.",
    prompt:
      "Collect the names and prices of all laptops under ₦500,000.",
  },
  {
    number: "05",
    icon: Globe2,
    category: "Website monitoring",
    title: "Know when something changes without checking constantly.",
    problem:
      "Some information changes frequently — new listings, available products, application openings, or updates — but checking a website repeatedly is tedious.",
    solution:
      "Create an automation that checks the website for you. Schedule it to run when you want and let Scrapify handle the repeated checking.",
    prompt:
      "Check this website every morning for new internship openings.",
  },
  {
    number: "06",
    icon: BriefcaseBusiness,
    category: "Repetitive tasks",
    title: "Give your everyday browser work a repeat button.",
    problem:
      "Many online tasks involve the same sequence of actions every time: open a website, sign in, find something, click through a few pages, and complete an action.",
    solution:
      "Instead of starting from scratch every time, describe the task once and save it as an automation you can run again whenever you need it.",
    prompt:
      "Sign in, find the pending invoices, and download them.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
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
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function UseCasesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-black">
      {/* Hero */}
      <section className="px-6 pb-24 pt-24 sm:px-10 md:pb-28 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col items-center mt-16"
          >


            <h1 className="mt-5 md:text-4xl text-2xl font-semibold leading-tight tracking-tight">
              What would you automate?
            </h1>

            <p className="mt-5 max-w-2xl text-sm text-center text-neutral-600 sm:text-base">
              Scrapify is built for the browser tasks you keep doing over and
              over. Tell it what needs to happen and turn the process into a
              reusable automation.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="mt-16 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-neutral-00"
          >
            <ArrowDown className="h-4 w-4" />
            Explore use cases
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-neutral-200 px-6 sm:px-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.08 }}
          className="mx-auto max-w-6xl"
        >
          {useCases.map((useCase) => {
            const Icon = useCase.icon;

            return (
              <motion.article
                key={useCase.number}
                variants={itemVariants}
                className="border-b border-neutral-200 py-16 md:py-10"
              >
                <div className="grid gap-10 md:grid-cols-[100px_1fr] md:gap-12">
                  {/* Number */}
                  <div className="flex items-start justify-between md:block">
                    <span className="font-mono text-sm text-neutral-400">
                      {useCase.number}
                    </span>

                    <Icon className="h-5 w-5 text-[#b70569] md:mt-8" />
                  </div>

                  {/* Content */}
                  <div className="max-w-4xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#b70569]">
                      {useCase.category}
                    </p>

                    <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                      {useCase.title}
                    </h2>

                    {/* Problem */}
                    <div className="mt-8">
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-400">
                        The problem
                      </p>

                      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600 sm:text-base">
                        {useCase.problem}
                      </p>
                    </div>

                    {/* Solution */}
                    <div className="mt-8">
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-400">
                        How Scrapify helps
                      </p>

                      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-700 sm:text-base">
                        {useCase.solution}
                      </p>
                    </div>

                    {/* Example prompt */}
                    <div className="mt-8 max-w-3xl border-l-2 border-[#b70569] pl-5">
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-400">
                        Try saying
                      </p>

                      <p className="mt-2 text-sm font-medium leading-6 text-black sm:text-base">
                        &quot;{useCase.prompt}&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-24 sm:px-10 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-6xl border-t border-neutral-200 pt-12"
        >
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#b70569]">
                Your turn
              </p>

              <h2 className="mt-4 font-playfair text-3xl font-semibold tracking-tight sm:text-4xl">
                If you repeat it, automate it.
              </h2>

              <p className="mt-4 text-sm leading-7 text-neutral-500">
                Start with a task you already do manually and let Scrapify
                turn it into a workflow.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 text-sm font-medium transition-colors hover:text-[#fef29e]"
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