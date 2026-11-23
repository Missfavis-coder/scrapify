"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";

const privacyPoints = [
  {
    number: "01",
    icon: UserRound,
    title: "What we collect",
    content:
      "We only collect the information needed to provide Scrapify and keep your account secure. This includes basic account information such as your name, email address, and authentication information.",
  },
  {
    number: "02",
    icon: LockKeyhole,
    title: "Why you need an account",
    content:
      "Your account lets us know who is using Scrapify and, more importantly, which automations, generations, runs, and history belong to you. This prevents other users from accessing your work.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "We don't need your passwords",
    content:
      "You do not need to give Scrapify your passwords just to create an automation. You tell us what you want to accomplish and which website you want to work with. Scrapify then builds and runs the browser workflow.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Responsible website automation",
    content:
      "Scrapify is designed to automate legitimate browser tasks. We aim to interact with websites responsibly and respect applicable laws, access controls, website rules, and reasonable usage limits.",
  },
  {
    number: "05",
    icon: LockKeyhole,
    title: "Your generation history",
    content:
      "When you create or run an automation, Scrapify may store the information required to show you that activity later. This can include your task description, workflow details, run status, results, and related activity. It is associated with your account so it is not openly available to other users.",
  },
  {
    number: "06",
    icon: UserRound,
    title: "What we don't need",
    content:
      "We do not need unnecessary personal information to provide Scrapify. We only ask for information that is relevant to authentication, operating your automations, maintaining your history, securing the service, or improving the product.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* Hero */}
      <section className="px-6 pb-20 pt-24 sm:px-10 md:pb-24 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="max-w-3xl mx-auto text-center mt-16"
          >
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#b70569]">
              Privacy
            </p>

            <h1 className="mt-5 md:text-4xl text-2xl font-semibold leading-tight tracking-tight">
              We keep it simple,
              
              You keep control.
            </h1>


          </motion.div>
        </div>
      </section>

      {/* Main privacy points */}
      <section className="border-t border-neutral-200 px-6 sm:px-10">
        <div className="mx-auto max-w-6xl">
          {privacyPoints.map((point, index) => {
            const Icon = point.icon;

            return (
              <motion.article
                key={point.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.03,
                }}
                className="grid gap-8 border-b border-neutral-200 py-14 md:grid-cols-[100px_28px_1fr] md:gap-10 md:py-16"
              >
                <span className="font-mono text-sm text-neutral-400">
                  {point.number}
                </span>

                <Icon className="h-5 w-5 text-[#b70569]" />

                <div className="max-w-3xl">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {point.title}
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-neutral-500 sm:text-base">
                    {point.content}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>


    </main>
  );
}