import { Decimal } from "decimal.js";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app/build-app";
import { loadConfig } from "../../src/infra/config";
import { SEED_COUNTY_INVESTMENTS } from "../../src/common/seed-data";

let app: FastifyInstance | undefined;

async function getApp(): Promise<FastifyInstance> {
  if (app === undefined) {
    app = buildApp({
      config: loadConfig({ NODE_ENV: "test", PORT: "3000" }),
    });
    await app.ready();
  }
  return app;
}

afterEach(async () => {
  if (app !== undefined) {
    await app.close();
    app = undefined;
  }
});

describe("GET /api/investments/by-county", () => {
  it("returns all counties with string amounts", async () => {
    const response = await (
      await getApp()
    ).inject({
      method: "GET",
      url: "/api/investments/by-county",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.year).toBe(2026);
    expect(body.counties).toHaveLength(SEED_COUNTY_INVESTMENTS.length);
    expect(typeof body.total).toBe("string");
    for (const county of body.counties) {
      expect(typeof county.county).toBe("string");
      expect(typeof county.region).toBe("string");
      expect(typeof county.amount).toBe("string");
    }
  });

  it("returns a total consistent with the sum of counties", async () => {
    const response = await (
      await getApp()
    ).inject({
      method: "GET",
      url: "/api/investments/by-county",
    });

    const body = response.json();
    const sum = body.counties.reduce(
      (acc: Decimal, county: { amount: string }) => acc.plus(county.amount),
      new Decimal(0)
    );
    expect(new Decimal(body.total).eq(sum)).toBe(true);
  });

  it("includes every development region at least once", async () => {
    const response = await (
      await getApp()
    ).inject({
      method: "GET",
      url: "/api/investments/by-county",
    });

    const regions = new Set(
      response
        .json()
        .counties.map((county: { region: string }) => county.region)
    );
    expect(regions).toEqual(
      new Set([
        "Nord-Vest",
        "Centru",
        "Nord-Est",
        "Sud-Est",
        "Sud-Muntenia",
        "Sud-Vest Oltenia",
        "Vest",
        "București-Ilfov",
      ])
    );
  });
});
