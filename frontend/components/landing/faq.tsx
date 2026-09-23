"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Scrapify?",
    answer:
      "Scrapify lets you turn simple instructions into browser automations that can perform repetitive tasks for you.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No. You can describe what you want Scrapify to do in plain language, and Scrapify handles the automation for you.",
  },
  {
    question: "What can I automate with Scrapify?",
    answer:
      "You can automate repetitive browser tasks such as navigating websites, filling forms, finding information, downloading files, and more.",
  },
  {
    question: "Can I run an automation more than once?",
    answer:
      "Yes. Once an automation is created, you can run it whenever you need or schedule it to run automatically.",
  },
  {
    question: "What happens if an automation fails?",
    answer:
      "Scrapify identifies runs that need attention and provides information about what went wrong so you can resolve the issue.",
  },
  {
    question: "Can Scrapify handle changes to websites?",
    answer:
      "Scrapify is designed to detect when parts of a workflow stop working and can attempt to repair affected steps.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <main className="min-h-screen px-6 py-20 ">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-[#b70569]">
            FAQ
          </p>

          <h1 className="font-playfair text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions?
            <br />
            We&apos;ve got answers.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-neutral-600">
            Everything you need to know about creating and running
            automations with Scrapify.
          </p>
        </div>

        {/* FAQ */}
        <div className="divide-y divide-neutral-200 border-y border-neutral-200">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left cursor-pointer"
                >
                  <span className="text-base font-medium sm:text-lg">
                    {faq.question}
                  </span>

                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-neutral-500 sm:text-base">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom text */}
        <div className="mt-14 text-center">
          <p className="text-sm text-neutral-500">
            Still have questions?
          </p>

          <p className="mt-1 text-sm font-medium text-[#b70569]">
            We&apos;re here to help.
          </p>
        </div>
      </div>
    </main>
  );
}