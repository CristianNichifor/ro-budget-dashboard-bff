import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app/build-app";
import { loadConfig } from "../../src/infra/config";

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

describe("GET /api/ins/metrics", () => {
  it("returns an INS metric with its unit and series", async () => {
    const instance = await getApp();
    const response = await instance.inject({
      method: "GET",
      url: "/api/ins/metrics?code=infant-mortality",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.code).toBe("infant-mortality");
    expect(body.unit).toBe("la 1.000 locuitori");
    expect(body.label).toBe("Mortalitate infantilă");
    expect(body.data).toHaveLength(6);
    expect(body.data[0]).toEqual({ year: 2021, value: 6.1 });
  });

  it("returns 404 for an unknown metric", async () => {
    const instance = await getApp();
    const response = await instance.inject({
      method: "GET",
      url: "/api/ins/metrics?code=inexistent",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("NOT_FOUND");
  });
});

describe("GET /api/ins/catalog", () => {
  it("returns the available metrics with code, label and unit", async () => {
    const instance = await getApp();
    const response = await instance.inject({
      method: "GET",
      url: "/api/ins/catalog",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.metrics).toHaveLength(3);
    expect(body.metrics[0]).toEqual({
      code: "infant-mortality",
      label: "Mortalitate infantilă",
      unit: "la 1.000 locuitori",
    });
    for (const metric of body.metrics) {
      expect(typeof metric.code).toBe("string");
      expect(typeof metric.label).toBe("string");
      expect(typeof metric.unit).toBe("string");
    }
  });
});
