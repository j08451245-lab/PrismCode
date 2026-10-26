import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, cpSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename, extname } from "node:path";
import {
  skillManifestSchema,
  SKILL_DIR_NAME,
  SKILL_MANIFEST_FILE,
  SKILL_INSTRUCTIONS_FILE,
  SKILL_TOOLS_DIR,
  SKILL_TEMPLATES_DIR,
  type SkillManifest,
  type SkillDefinition,
  type SkillTool,
  type SkillID,
} from "@prismcode543/shared";

const SKILLS_DIR = join(homedir(), ".prismcode", SKILL_DIR_NAME);

function ensureSkillsDir() {
  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true, mode: 0o700 });
  }
}

function skillPath(name: string): string {
  return join(SKILLS_DIR, name);
}

export function getInstalledSkills(): SkillDefinition[] {
  ensureSkillsDir();
  const skills: SkillDefinition[] = [];
  for (const entry of readdirSync(SKILLS_DIR)) {
    const sp = skillPath(entry);
    const manifestPath = join(sp, SKILL_MANIFEST_FILE);
    if (!existsSync(manifestPath)) continue;
    try {
      const skill = loadSkill(entry, sp);
      if (skill) skills.push(skill);
    } catch (err) {
      console.error(`Failed to load skill "${entry}":`, err);
    }
  }
  return skills;
}

export function getActiveSkills(): SkillDefinition[] {
  return getInstalledSkills().filter((s) => s.manifest.enabled !== false);
}

export function getSkill(name: string): SkillDefinition | null {
  const sp = skillPath(name);
  if (!existsSync(join(sp, SKILL_MANIFEST_FILE))) return null;
  return loadSkill(name, sp);
}

function loadSkill(name: string, sp: string): SkillDefinition | null {
  const manifestRaw = readFileSync(join(sp, SKILL_MANIFEST_FILE), "utf-8");
  const manifestParsed = JSON.parse(manifestRaw);
  const parsed = skillManifestSchema.safeParse(manifestParsed);
  if (!parsed.success) {
    console.error(`Skill "${name}" has invalid manifest:`, parsed.error.message);
    return null;
  }
  const manifest = parsed.data;

  const instructionsPath = join(sp, manifest.instructions);
  const instructions = existsSync(instructionsPath)
    ? readFileSync(instructionsPath, "utf-8")
    : "";

  const templates = new Map<string, string>();
  const templatesDir = join(sp, SKILL_TEMPLATES_DIR);
  if (existsSync(templatesDir)) {
    for (const tplFile of readdirSync(templatesDir)) {
      const content = readFileSync(join(templatesDir, tplFile), "utf-8");
      templates.set(tplFile, content);
    }
  }

  return {
    manifest,
    instructions,
    templates,
    installPath: sp,
  };
}

export async function installSkill(source: string): Promise<SkillDefinition> {
  ensureSkillsDir();

  if (source.startsWith("http://") || source.startsWith("https://")) {
    return installFromUrl(source);
  }

  if (existsSync(source)) {
    return installFromPath(source);
  }

  throw new Error(`Skill source not found: ${source}. Use a local path or URL.`);
}

async function installFromPath(sourcePath: string): Promise<SkillDefinition> {
  const manifestPath = join(sourcePath, SKILL_MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    throw new Error(`Invalid skill: no ${SKILL_MANIFEST_FILE} found at ${sourcePath}`);
  }

  const manifestRaw = readFileSync(manifestPath, "utf-8");
  const manifestParsed = JSON.parse(manifestRaw);
  const parsed = skillManifestSchema.safeParse(manifestParsed);
  if (!parsed.success) {
    throw new Error(`Invalid skill manifest: ${parsed.error.message}`);
  }
  const manifest = parsed.data;
  const targetDir = skillPath(manifest.name);

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true });
  }

  cpSync(sourcePath, targetDir, { recursive: true });
  return loadSkill(manifest.name, targetDir)!;
}

async function installFromUrl(url: string): Promise<SkillDefinition> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download skill: ${res.statusText}`);
  const data = await res.json() as { manifest: SkillManifest; instructions: string; templates?: Record<string, string> };

  const parsed = skillManifestSchema.safeParse(data.manifest);
  if (!parsed.success) throw new Error(`Invalid skill manifest from the downloaded file: ${parsed.error.message}`);

  const manifest = parsed.data;
  const targetDir = skillPath(manifest.name);

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true });
  }
  mkdirSync(targetDir, { recursive: true });

  writeFileSync(join(targetDir, SKILL_MANIFEST_FILE), JSON.stringify(manifest, null, 2));
  writeFileSync(join(targetDir, SKILL_INSTRUCTIONS_FILE), data.instructions);

  if (data.templates) {
    const tplDir = join(targetDir, SKILL_TEMPLATES_DIR);
    mkdirSync(tplDir, { recursive: true });
    for (const [name, content] of Object.entries(data.templates)) {
      writeFileSync(join(tplDir, name), content);
    }
  }

  if (manifest.tools && manifest.tools.length > 0) {
    const toolsDir = join(targetDir, SKILL_TOOLS_DIR);
    mkdirSync(toolsDir, { recursive: true });
  }

  return loadSkill(manifest.name, targetDir)!;
}

export function removeSkill(name: string): boolean {
  const sp = skillPath(name);
  if (!existsSync(sp)) return false;
  rmSync(sp, { recursive: true });
  return true;
}

export function toggleSkill(name: string, enabled: boolean): SkillDefinition | null {
  const sp = skillPath(name);
  const manifestPath = join(sp, SKILL_MANIFEST_FILE);
  if (!existsSync(manifestPath)) return null;

  const manifestRaw = readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw) as SkillManifest;
  manifest.enabled = enabled;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return loadSkill(name, sp);
}

export function getCombinedInstructions(skills: SkillDefinition[]): string {
  return skills
    .filter((s) => s.manifest.enabled !== false)
    .map((s) => `## Skill: ${s.manifest.displayName}\n${s.instructions}`)
    .join("\n\n");
}

export function getToolHandlers(skills: SkillDefinition[]): { tool: SkillTool; execute: (input: unknown) => Promise<unknown>; skillName: string }[] {
  const handlers: { tool: SkillTool; execute: (input: unknown) => Promise<unknown>; skillName: string }[] = [];

  for (const skill of skills) {
    if (skill.manifest.enabled === false) continue;
    for (const tool of (skill.manifest.tools ?? [])) {
      handlers.push({
        tool,
        skillName: skill.manifest.name,
        execute: async (input: unknown) => {
          if (tool.implementation) {
            const implPath = join(skill.installPath, tool.implementation);
            if (existsSync(implPath)) {
              try {
                const mod = await import(implPath);
                if (typeof mod.default === "function") {
                  return mod.default(input);
                }
                if (typeof mod.execute === "function") {
                  return mod.execute(input);
                }
              } catch (err) {
                throw new Error(`Skill tool "${tool.name}" execution failed: ${err}`);
              }
            }
          }
          return { success: true, note: `Tool "${tool.name}" declared by skill "${skill.manifest.name}". No implementation provided — AI should handle this via instructions.` };
        },
      });
    }
  }

  return handlers;
}

export function resolveTriggerKeywords(skills: SkillDefinition[]): Map<SkillID, string[]> {
  const map = new Map<SkillID, string[]>();
  for (const skill of skills) {
    if (skill.manifest.enabled === false) continue;
    const keywords = skill.manifest.triggers?.keywords ?? [];
    if (keywords.length > 0) {
      map.set(skill.manifest.name, keywords);
    }
  }
  return map;
}
