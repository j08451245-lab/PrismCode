import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-800">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-50">
                <span className="text-xs font-bold text-black">P</span>
              </div>
              <span className="text-sm font-semibold text-neutral-200">PrismCode</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-neutral-500 leading-relaxed">
              Terminal-native AI coding agent. Open source, MIT licensed, self-hostable.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://github.com/j08451245-lab/PrismCode"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-300"
              >
                <svg viewBox="0 0 16 16" width={12} height={12} className="fill-current">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Product</h4>
            <div className="flex flex-col gap-2 text-sm text-neutral-500">
              <Link href="/#features" className="hover:text-neutral-300 transition-colors">Features</Link>
              <Link href="/#pricing" className="hover:text-neutral-300 transition-colors">Pricing</Link>
              <Link href="/docs" className="hover:text-neutral-300 transition-colors">Documentation</Link>
              <a href="https://github.com/j08451245-lab/PrismCode/releases" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">Changelog</a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Developers</h4>
            <div className="flex flex-col gap-2 text-sm text-neutral-500">
              <a href="https://github.com/j08451245-lab/PrismCode/blob/main/desktop/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">Contributing</a>
              <a href="https://github.com/j08451245-lab/PrismCode/issues" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">Issues</a>
              <a href="https://github.com/j08451245-lab/PrismCode/security/policy" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">Security</a>
              <a href="https://github.com/j08451245-lab/PrismCode/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">License (MIT)</a>
            </div>
          </div>

        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-800 pt-6 sm:flex-row">
          <p className="text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} PrismCode. MIT License.
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-600">
            <span>Built with Next.js, Tailwind, and Bun</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
