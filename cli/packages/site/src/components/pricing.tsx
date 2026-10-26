"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    monthly: "$0",
    annual: "$0",
    desc: "Core models, local mode, full tool access",
    features: ["20 messages per day", "Claude Haiku, Gemini Flash, Ollama", "2 simultaneous sessions", "BYOK included", "Support via GitHub Issues"],
  },
  {
    name: "Pro",
    monthly: "$20",
    annual: "$16",
    desc: "Premium models, unlimited usage, priority queue",
    features: ["Unlimited messages", "All models (Opus, GPT-5, Gemini Pro)", "Unlimited sessions", "BYOK included", "Priority queue", "Priority support"],
    popular: true,
  },
  {
    name: "Enterprise",
    monthly: "$100",
    annual: "$80",
    desc: "Team management, compliance, dedicated support",
    features: ["Everything in Pro", "10 team seats", "Workspaces", "SSO / SAML", "Custom models", "Dedicated support"],
  },
];

const comparison = [
  { name: "Open models", f: true, p: true, e: true },
  { name: "All premium models", f: false, p: true, e: true },
  { name: "Messages per day", f: "20", p: "Unlimited", e: "Unlimited" },
  { name: "Simultaneous sessions", f: "2", p: "Unlimited", e: "Unlimited" },
  { name: "Priority support", f: false, p: true, e: true },
  { name: "Team billing & SSO", f: false, p: false, e: true },
  { name: "Workspaces", f: false, p: false, e: true },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section id="pricing" className="border-t border-neutral-800 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl text-neutral-50">
            Pricing
          </h2>
          <p className="mx-auto mt-3 text-neutral-500">
            Start free. Upgrade when you need premium models.
          </p>
        </motion.div>

        <div className="mb-10 flex items-center justify-center gap-3 text-sm">
          <span className={`${!annual ? "text-neutral-200" : "text-neutral-500"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative h-5 w-9 rounded-full border border-neutral-700 bg-neutral-900 transition-colors hover:border-neutral-600"
          >
            <span className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-neutral-300 transition-transform ${annual ? "translate-x-4" : ""}`} />
          </button>
          <span className={`${annual ? "text-neutral-200" : "text-neutral-500"}`}>Annual</span>
          {annual && (
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400">
              Save ~20%
            </span>
          )}
        </div>

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const }}
              className={`relative rounded-lg border p-6 transition-all hover-card ${
                plan.popular
                  ? "border-neutral-700 bg-neutral-900/80"
                  : "border-neutral-800 bg-neutral-900/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-neutral-50 px-2.5 py-0.5 text-[10px] font-medium text-black">
                  Most popular
                </div>
              )}
              <div className="mt-2">
                <h3 className="text-base font-semibold text-neutral-50">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-neutral-50">
                    {annual ? plan.annual : plan.monthly}
                  </span>
                  <span className="text-sm text-neutral-500">/month</span>
                </div>
                <p className="mt-1.5 text-sm text-neutral-500">{plan.desc}</p>
              </div>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check size={14} className="mt-0.5 shrink-0 text-neutral-400" />
                    <span className="text-neutral-400">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.name === "Enterprise" ? "https://github.com/j08451245-lab/PrismCode/issues" : "/docs"}
                className={`mt-6 flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-all active:scale-[0.98] ${
                  plan.popular
                    ? "bg-neutral-50 text-black hover:bg-neutral-200"
                    : "border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {plan.name === "Enterprise" ? "Contact us" : "Get Started"}
              </a>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-300 transition-colors"
          >
            {showComparison ? "Hide" : "Show"} full comparison
          </button>
        </div>

        {showComparison && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 overflow-x-auto"
          >
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-3 text-left font-medium text-neutral-300">Feature</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-300">Free</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-50">Pro</th>
                  <th className="px-4 py-3 text-center font-medium text-neutral-300">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {comparison.map((row) => (
                  <tr key={row.name}>
                    <td className="px-4 py-3 text-neutral-400">{row.name}</td>
                    {(["f", "p", "e"] as const).map((k) => (
                      <td key={k} className="px-4 py-3 text-center">
                        {typeof row[k] === "boolean" ? (
                          row[k] ? <Check size={14} className="inline text-neutral-400" /> : <span className="text-neutral-700">&mdash;</span>
                        ) : (
                          <span className="text-neutral-400">{row[k]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </section>
  );
}
