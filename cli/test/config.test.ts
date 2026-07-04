import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "fuel-test-"));
  process.env.FUEL_CONFIG_DIR = dir;
  delete process.env.FUEL_API_KEY;
  delete process.env.FUEL_BASE_URL;
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.FUEL_CONFIG_DIR;
});

describe("config", () => {
  it("round-trips saved config", async () => {
    const { saveConfig, loadConfig } = await import("../src/config");
    saveConfig({ apiKey: "fuel_sk_abc" });
    expect(loadConfig().apiKey).toBe("fuel_sk_abc");
  });
  it("env var beats file", async () => {
    const { saveConfig, loadConfig } = await import("../src/config");
    saveConfig({ apiKey: "fuel_sk_file" });
    process.env.FUEL_API_KEY = "fuel_sk_env";
    expect(loadConfig().apiKey).toBe("fuel_sk_env");
  });
  it("missing file yields no key and the default base url", async () => {
    const { loadConfig, DEFAULT_BASE_URL } = await import("../src/config");
    const cfg = loadConfig();
    expect(cfg.apiKey).toBeUndefined();
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL);
  });
});
