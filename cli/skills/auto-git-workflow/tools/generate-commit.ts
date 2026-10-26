import { $ } from "bun";

type Input = {
  scope?: string;
  breaking?: boolean;
};

export default async function generateCommitMessage(input: Input): Promise<{ message: string; type: string; description: string }> {
  const diff = await $`git diff --cached --stat`.text();
  if (!diff.trim()) {
    const unstaged = await $`git diff --stat`.text();
    if (unstaged.trim()) {
      throw new Error("No staged changes. Run `git add` first.");
    }
    throw new Error("No changes detected.");
  }

  const files = diff.trim().split("\n").filter(Boolean);
  const fileExtensions = files.map((f) => {
    const match = f.match(/\.(\w+)\s/);
    return match?.[1] ?? "";
  }).filter(Boolean);

  let type = "chore";
  if (fileExtensions.some((ext) => ["ts", "tsx", "js", "jsx", "py", "rs", "go"].includes(ext))) {
    type = "feat";
  }
  if (fileExtensions.some((ext) => ["test.ts", "spec.ts", "test.js", "spec.js"].includes(ext))) {
    type = "test";
  }
  if (fileExtensions.some((ext) => ["md", "txt", "mdx"].includes(ext))) {
    type = "docs";
  }

  const changedFiles = files.map((f) => f.trim().split(/\s+/)[0]).filter(Boolean);
  const description = changedFiles.length > 3
    ? `Update ${changedFiles.length} files across the project`
    : `Update ${changedFiles.join(", ")}`;

  const scope = input.scope ? `(${input.scope})` : "";
  const breaking = input.breaking ? "!" : "";
  const message = `${type}${scope}${breaking}: ${description}`;

  return { message, type, description };
}
