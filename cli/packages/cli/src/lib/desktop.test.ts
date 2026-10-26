import { describe, expect, test } from "bun:test";
import { desktopCandidates, launchSpec, openInDesktop } from "./desktop";

describe("PrismCode Desktop handoff", () => {
  test("the PRISMCODE_DESKTOP override comes first", () => {
    const candidates = desktopCandidates(
      { PRISMCODE_DESKTOP: "C:\\apps\\PrismCode.exe", LOCALAPPDATA: "C:\\Users\\me\\AppData\\Local" },
      "win32",
      "C:\\Users\\me",
    );
    expect(candidates[0]).toBe("C:\\apps\\PrismCode.exe");
    expect(candidates).toContain("C:\\Users\\me\\AppData\\Local\\Programs\\PrismCode\\PrismCode.exe");
  });

  test("each platform only gets its own install locations", () => {
    expect(desktopCandidates({}, "darwin", "/Users/me")).toContain(
      "/Applications/PrismCode.app/Contents/MacOS/PrismCode",
    );
    expect(desktopCandidates({}, "linux", "/home/me")).toContain(
      "/home/me/.local/bin/prismcode-desktop",
    );
    expect(desktopCandidates({}, "linux", "/home/me").some(path => path.endsWith(".exe"))).toBe(false);
  });

  test("a macOS bundle is opened through open(1) with --args", () => {
    expect(launchSpec("/Applications/PrismCode.app", "/work/site")).toEqual({
      program: "open",
      args: ["-a", "/Applications/PrismCode.app", "--args", "/work/site"],
    });
  });

  test("Windows launches through start so the window is not minimized", () => {
    expect(launchSpec("C:\\apps\\PrismCode.exe", "C:\\work\\site", "win32")).toEqual({
      program: "cmd.exe",
      args: ["/c", "start", "", "C:\\apps\\PrismCode.exe", "C:\\work\\site"],
    });
  });

  test("a native executable receives the folder as its only argument", () => {
    expect(launchSpec("/usr/bin/prismcode-desktop", "/work/site", "linux")).toEqual({
      program: "/usr/bin/prismcode-desktop",
      args: ["/work/site"],
    });
  });

  test("a missing app fails loudly instead of silently doing nothing", () => {
    expect(() => openInDesktop("/work/site", null)).toThrow(/PRISMCODE_DESKTOP/);
  });
});
