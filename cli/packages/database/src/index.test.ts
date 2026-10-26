import { describe, expect, test } from "bun:test";
import * as db from "./index";

describe("database package", () => {
  test("exports are defined", () => {
    expect(db).toBeDefined();
  });
});
