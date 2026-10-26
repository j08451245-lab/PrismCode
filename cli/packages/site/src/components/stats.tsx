"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  { value: "MIT", suffix: "", label: "License", detail: "fork it, ship it" },
  { value: 20, suffix: "+", label: "AI models", detail: "one terminal interface" },
  { value: 12, suffix: "", label: "Local tools", detail: "read, write, edit, grep, git" },
  { value: 0, suffix: "", label: "Accounts required", detail: "bring your own keys" },
];

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          let start = 0;
          const duration = 1500;
          const step = Math.ceil(target / (duration / 16));
          const interval = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(interval);
            } else {
              setCount(start);
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-3xl font-semibold tracking-[0] sm:text-4xl">
      <span className="text-neutral-50">
        {count}
        {suffix}
      </span>
    </div>
  );
}

export function Stats() {
  return (
    <section className="border-t border-white/10 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-black/35 p-5">
              {stat.value === 0 ? (
                <div className="text-3xl font-semibold tracking-[0] sm:text-4xl text-neutral-50">Zero</div>
              ) : stat.value === "MIT" ? (
                <div className="text-3xl font-semibold tracking-[0] sm:text-4xl text-neutral-50">MIT</div>
              ) : (
                <CountUp target={stat.value as number} suffix={stat.suffix} />
              )}
              <div className="mt-2 text-sm font-medium text-neutral-300">{stat.label}</div>
              <div className="mt-1 text-xs text-neutral-600">{stat.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
