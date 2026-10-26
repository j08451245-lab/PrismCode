"use client";

import { motion } from "framer-motion";
import { ExternalLink, Star, GitFork, Code2, Users } from "lucide-react";

const communityLinks = [
  {
    icon: Star,
    label: "Star the project",
    value: "GitHub",
    href: "https://github.com/j08451245-lab/PrismCode",
    color: "text-amber-200",
  },
  {
    icon: GitFork,
    label: "Fork it",
    value: "MIT License",
    href: "https://github.com/j08451245-lab/PrismCode/blob/main/LICENSE",
    color: "text-cyan-200",
  },
  {
    icon: Code2,
    label: "Read the source",
    value: "Open source",
    href: "https://github.com/j08451245-lab/PrismCode",
    color: "text-emerald-200",
  },
  {
    icon: Users,
    label: "Issues & ideas",
    value: "GitHub Issues",
    href: "https://github.com/j08451245-lab/PrismCode/issues",
    color: "text-violet-200",
  },
];

export function Testimonials() {
  return (
    <section className="border-t border-neutral-800 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-14"
        >
          <p className="mb-2 text-xs text-neutral-500 uppercase tracking-[0.15em]">Community</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl text-neutral-50">
            Built in the open
          </h2>
          <p className="mt-3 max-w-lg text-neutral-500">
            Every line of code is on GitHub. Issues, ideas, and contributions from the community shape every release.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {communityLinks.map((link, i) => (
            <motion.a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const }}
              className="group rounded-lg border border-neutral-800 bg-neutral-950/30 p-5 transition-all hover:border-neutral-700 hover:bg-neutral-900/50"
            >
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <link.icon size={14} className={link.color} />
                {link.label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-neutral-50">{link.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-neutral-600 group-hover:text-neutral-400 transition-colors">
                Open link
                <ExternalLink size={10} />
              </div>
            </motion.a>
          ))}
        </div>

      </div>
    </section>
  );
}
