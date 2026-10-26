"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { motion } from "framer-motion";

const installOptions = [
  { id: "clone", label: "clone", command: "git clone https://github.com/j08451245-lab/PrismCode" },
  { id: "run", label: "run", command: "cd PrismCode/cli && bun install && bun run dev:cli" },
];

export function InstallTabs() {
  const [active, setActive] = useState("clone");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(false);

  const current = installOptions.find((o) => o.id === active)!;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.command);
    } catch {
      const el = document.createElement("textarea");
      el.value = current.command;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setToast(true);
    setTimeout(() => {
      setCopied(false);
      setTimeout(() => setToast(false), 300);
    }, 2000);
  };

  return (
    <section id="install" className="border-t border-neutral-800 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl text-neutral-50">
            Install
          </h2>
          <p className="mx-auto mt-3 text-neutral-500">
            Clone, install, run. No account required.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
          className="mx-auto max-w-md"
        >
          <div className="flex gap-1 rounded-lg bg-neutral-900 p-1">
            {installOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setActive(opt.id); setCopied(false); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  active === opt.id
                    ? "bg-neutral-800 text-neutral-200 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-neutral-800 bg-[#050505] px-4 py-3 font-mono text-sm">
            <span>
              <span className="text-neutral-600">$</span>{" "}
              <span className="text-neutral-200">{current.command}</span>
              <span className="ml-0.5 h-3.5 w-1 animate-blink bg-neutral-400 inline-block align-middle" />
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
            >
              {copied ? <Check size={13} className="text-neutral-400" /> : <Copy size={13} />}
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-neutral-600">
            Requires Git and Bun 1.3+.{" "}
            <a href="/docs" className="text-neutral-400 underline underline-offset-2 hover:text-neutral-200">
              Read the docs
            </a>
          </p>
        </motion.div>
      </div>

      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 shadow-lg">
          <Check size={14} className="text-neutral-400" />
          Copied
        </div>
      </div>
    </section>
  );
}
