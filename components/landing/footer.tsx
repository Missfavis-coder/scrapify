"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpRight,
  Mail,
} from "lucide-react";
import { PiGithubLogoBold, PiLinkedinLogo, PiTwitterLogo } from "react-icons/pi";

const footerLinks = {
  Product: [
    { label: "How it works", href: "/" },
    { label: "What you can do", href: "/" },
    { label: "Automations", href: "/" },
    { label: "Use cases", href: "/use-cases" },
  ],
  Resources: [
    { label: "FAQ", href: "/" },
    { label: "Contact", href: "/" },
  ],
  Company: [
    { label: "Privacy", href: "/privacy" },
  ],
};

const socials = [
  { href: "#", label: "X", icon: PiTwitterLogo },
  { href: "#", label: "GitHub", icon: PiGithubLogoBold },
  { href: "#", label: "LinkedIn", icon: PiLinkedinLogo },
  { href: "#", label: "Email", icon: Mail },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-black w-full text-white">
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        {/* Main Footer */}
        <div className="grid gap-14 py-16 md:grid-cols-[1.5fr_2fr] md:py-20">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/"
              className="inline-block text-3xl font-bold tracking-tight"
            >
              Scrapify<span className="text-[#b70569]">.</span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-neutral-500">
              Turn everyday browser tasks into simple automations. Scrapify
              handles the repetitive stuff so you can focus on what matters.
            </p>

            {/* Socials — idle floating wave, like Tekcify's icon row */}
            <div className="mt-8 flex items-center gap-3">
              {socials.map((social, index) => (
                <SocialLink
                  key={social.label}
                  href={social.href}
                  label={social.label}
                  index={index}
                >
                  <social.icon className="h-4 w-4" />
                </SocialLink>
              ))}
            </div>
          </motion.div>

          {/* Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 gap-10 sm:grid-cols-3"
          >
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-white">
                  {category}
                </h3>

                <ul className="mt-5 space-y-4">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-white"
                      >
                        {link.label}

                        <ArrowUpRight className="h-3 w-3 -translate-x-1 translate-y-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-xs text-[#ebe083] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Scrapify. All rights reserved.</span>

          <span className="text-[#ebe083]">
            Built to make repetitive work disappear.
          </span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  index,
  children,
}: {
  href: string;
  label: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      // continuous idle float, staggered per icon so they bob out of sync (the wave effect)
      animate={{ y: [0, -6, 0] }}
      transition={{
        duration: 1.8,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
        delay: index * 0.18,
      }}
      whileHover={{ y: -10, scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link
        href={href}
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-neutral-500 transition-all hover:border-[#b70569 bg-[#b70569] text-white"
      >
        {children}
      </Link>
    </motion.div>
  );
}