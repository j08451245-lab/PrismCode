"use client";

import { motion } from "framer-motion";
import { Terminal, Search, Rocket } from "lucide-react";

const steps = [
  {
    icon: Terminal,
    title: "Install",
    subtitle: "01",
    desc: "Clone the repo and install with Bun. Bring your own model keys — no account needed.",
    code: "bun install",
  },
  {
    icon: Search,
    title: "Describe",
    subtitle: "02",
    desc: "Tell it what you want. PrismCode scans your codebase and proposes a plan.",
    code: "> add error handling to the API routes",
  },
  {
    icon: Rocket,
    title: "Ship",
    subtitle: "03",
    desc: "Approve the plan. PrismCode edits files and runs tools directly in your project.",
    code: "[Tab] BUILD mode — 3 files edited",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-white/10 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-2 text-xs text-neutral-500 uppercase tracking-[0]"
          >
            How it works
          </motion.p>
          <h2 className="text-3xl font-semibold tracking-[0] sm:text-4xl text-neutral-50">
            Three commands to ship
          </h2>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connector */}
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px md:block">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] as const }}
              className="relative flex flex-col rounded-xl border border-white/10 bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="relative z-10 mb-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black shadow-[0_0_36px_rgba(34,211,238,0.08)]">
                  <step.icon size={20} className="text-neutral-300" />
                </div>
                <span className="font-mono text-2xl font-light text-neutral-700">{step.subtitle}</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-neutral-50">{step.title}</h3>
              <p className="mb-5 max-w-xs text-sm leading-relaxed text-neutral-500">{step.desc}</p>
              <div className="mt-auto w-full rounded-lg border border-white/10 bg-[#050505] px-3.5 py-2.5 font-mono text-xs text-neutral-500">
                <span className="text-neutral-600">$</span>{" "}
                <span className="text-neutral-300">{step.code}</span>
                <span className="ml-0.5 h-3 w-1 animate-blink bg-neutral-400 inline-block align-middle" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
