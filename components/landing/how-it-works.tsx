
"use client";

import { motion } from "framer-motion";
import {
  Globe,
  MousePointer2,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

const steps = [
  {
    number: "01",
    icon: Sparkles,
    title: "Describe your task",
    description:
      "Tell Scrapify what you want to do on any website using simple natural language.",
  },
  {
    number: "02",
    icon: Globe,
    title: "Scrapify explores",
    description:
      "Our AI agent understands the website and figures out the actions needed to complete your task.",
  },
  {
    number: "03",
    icon: MousePointer2,
    title: "Watch it work",
    description:
      "The browser agent navigates, clicks, searches, scrolls, and extracts the information you need.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Get your results",
    description:
      "Review the extracted data, screenshots, activity logs, and save the process as a reusable workflow.",
  },
];

export default function HowItWorks() {
  const router = useRouter();

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center md:gap-6 gap-10 lg:grid-cols-[1.1fr_0.85fr]">
          {/* Left — Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:pl-6"
          >
            <p className="mb-4 text-sm font-medium text-primary">
              HOW IT WORKS
            </p>

            <h2 className="text-2xl font-semibold tracking-wide  md:text-4xl text-secondary">
              Turn a simple instruction into a working automation.
            </h2>

            <p className="mt-5 max-w-lg text-[15px] leading-7 text-neutral-600">
              Scrapify lets you describe what you want done on the web.
              Its AI agent figures out the steps, operates the browser,
              extracts the information, and gives you a clear result you
              can use or run again.
            </p>

            <Button
              onClick={() => router.push("/login")}
              className="mt-8 cursor-pointer rounded-full bg-primary px-7 py-6 font-semibold text-white"
            >
              Get Started
            </Button>
          </motion.div>

          {/* Right — Heading */}
          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  viewport={{ once: true }}
                  className="group relative min-h-55 overflow-hidden rounded-2xl border border-[#fef29e] bg-[#fef29e]/10 p-6 transition-colors duration-300 "
                >
                  {/* Number */}
                  <span className="absolute right-5 top-5 text-xs font-medium text-neutral-600">
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl  bg-[#fef29e] transition-colors duration-300 text-white">
                    <Icon className="h-5 w-5 " />
                  </div>

                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-secondary">
                      {step.title}
                    </h3>

                    <p className="mt-2 max-w-65 text-sm leading-6 text-neutral-600">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
