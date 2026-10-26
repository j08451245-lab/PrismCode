import { describe, it, expect } from "vitest";
import { Mode, modeSchema, toolInputSchemas, getToolContracts } from "../schemas";

describe("Mode", () => {
  it("has BUILD and PLAN", () => {
    expect(Mode).toEqual({ BUILD: "BUILD", PLAN: "PLAN" });
  });
});

describe("modeSchema", () => {
  it("accepts BUILD", () => {
    expect(modeSchema.parse("BUILD")).toBe("BUILD");
  });

  it("accepts PLAN", () => {
    expect(modeSchema.parse("PLAN")).toBe("PLAN");
  });

  it("rejects invalid mode", () => {
    expect(() => modeSchema.parse("INVALID")).toThrow();
  });
});

describe("toolInputSchemas", () => {
  it("defines readFile with path", () => {
    const result = toolInputSchemas.readFile.parse({ path: "foo.ts" });
    expect(result.path).toBe("foo.ts");
  });

  it("defines bash with command", () => {
    const result = toolInputSchemas.bash.parse({
      command: "ls",
      description: "list files",
    });
    expect(result.command).toBe("ls");
    expect(result.description).toBe("list files");
  });

  it("writeFile requires path and content", () => {
    const result = toolInputSchemas.writeFile.parse({
      path: "out.txt",
      content: "hello",
    });
    expect(result.path).toBe("out.txt");
    expect(result.content).toBe("hello");
  });

  it("webSearch defaults numResults to 5", () => {
    const result = toolInputSchemas.webSearch.parse({ query: "test" });
    expect(result.numResults).toBe(5);
  });

  it("rejects bash without command", () => {
    expect(() => toolInputSchemas.bash.parse({})).toThrow();
  });
});

describe("getToolContracts", () => {
  it("returns readonly contracts for PLAN mode", () => {
    const contracts = getToolContracts(Mode.PLAN);
    expect(contracts.readFile).toBeDefined();
    expect(contracts.writeFile).toBeUndefined();
    expect(contracts.editFile).toBeUndefined();
    expect(contracts.bash).toBeUndefined();
    expect(contracts.gitCommit).toBeUndefined();
  });

  it("returns full contracts for BUILD mode", () => {
    const contracts = getToolContracts(Mode.BUILD);
    expect(contracts.readFile).toBeDefined();
    expect(contracts.writeFile).toBeDefined();
    expect(contracts.editFile).toBeDefined();
    expect(contracts.bash).toBeDefined();
    expect(contracts.gitCommit).toBeDefined();
  });

  it("includes readonly tools in both modes", () => {
    const plan = getToolContracts(Mode.PLAN);
    const build = getToolContracts(Mode.BUILD);
    ["readFile", "listDirectory", "glob", "grep", "webSearch", "gitStatus", "gitLog", "gitDiff"].forEach(
      (toolName) => {
        expect(plan[toolName as keyof typeof plan]).toBeDefined();
        expect(build[toolName as keyof typeof build]).toBeDefined();
      }
    );
  });
});
