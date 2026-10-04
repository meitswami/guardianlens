import { describe, it, expect } from "vitest";
import { buildConsensus, editDistance, formatPlate, repairPlate, validatePlate, votePlate } from "./consensus";
import { sampleTimes } from "./frames";

describe("plate handling", () => {
  it("repairs common OCR mix-ups by position", () => {
    expect(repairPlate("rj-14 ab 12O4")).toBe("RJ14AB1204");
    expect(repairPlate("R114CD5B7S")).toBe("RI14CD5875");
    expect(repairPlate("22BH1234AA")).toBe("22BH1234AA");
    expect(repairPlate("AB12")).toBe("AB12");
  });
  it("validates Indian formats", () => {
    expect(validatePlate("RJ14AB1234")).toMatchObject({ valid: true, kind: "standard", stateCode: "RJ" });
    expect(validatePlate("DL1CAA1111").valid).toBe(true);
    expect(validatePlate("22BH1234AA")).toMatchObject({ valid: true, kind: "bharat" });
    expect(validatePlate("XX14AB1234").valid).toBe(false);
    expect(validatePlate("RJ14AB123").valid).toBe(false);
  });
  it("formats for display", () => {
    expect(formatPlate("RJ14AB1234")).toBe("RJ 14 AB 1234");
    expect(formatPlate("22BH1234AA")).toBe("22 BH 1234 AA");
  });
  it("computes edit distance", () => {
    expect(editDistance("RJ14AB1234", "RJ14AB1284")).toBe(1);
    expect(editDistance("", "ABC")).toBe(3);
  });
  it("votes per character", () => {
    const v = votePlate([
      { plate: "RJ14AB1234", confidence: 0.9 },
      { plate: "RJ14AB1284", confidence: 0.6 },
      { plate: "RJ14AB1234", confidence: 0.8 },
    ]);
    expect(v.plate).toBe("RJ14AB1234");
    expect(v.agreement).toBeCloseTo(2 / 3);
  });
});

describe("buildConsensus", () => {
  const bike = (plate: string | null, violations: string[], conf = 0.9) => ({
    vehicle_type: "two_wheeler", plate_number: plate, plate_confidence: conf, vehicle_color: "black", violations,
  });

  it("merges reads of one vehicle and confirms repeated violations", () => {
    const out = buildConsensus([
      { frameIndex: 0, vehicles: [bike("RJ-14-AB-1234", ["helmet"])] },
      { frameIndex: 1, vehicles: [bike("RJ14AB12E4", ["helmet", "mobile_phone"], 0.5)] },
      { frameIndex: 2, vehicles: [bike("RJ 14 AB 1234", ["helmet"])] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].plate).toBe("RJ14AB1234");
    expect(out[0].sightings).toBe(3);
    expect(out[0].violations.find((v) => v.type === "helmet")?.status).toBe("confirmed");
    expect(out[0].violations.find((v) => v.type === "mobile_phone")?.status).toBe("unconfirmed");
    expect(out[0].flags).toContain("Plate read differs between frames");
  });

  it("keeps different vehicles apart", () => {
    const out = buildConsensus([
      { frameIndex: 0, vehicles: [bike("RJ14AB1234", []), bike("TS09XY7788", ["triple_riding"])] },
      { frameIndex: 1, vehicles: [bike("TS09XY7788", ["triple_riding"])] },
    ]);
    expect(out.map((v) => v.plate)).toEqual(["TS09XY7788", "RJ14AB1234"]);
    expect(out[0].violations[0].status).toBe("confirmed");
  });

  it("never reports high confidence from a single frame", () => {
    const out = buildConsensus([{ frameIndex: 0, vehicles: [bike("RJ14AB1234", ["helmet"], 1)] }]);
    expect(out[0].violations[0].status).toBe("single_frame");
    expect(out[0].score).toBeLessThanOrEqual(70);
    expect(out[0].level).not.toBe("high");
  });

  it("handles vehicles with no readable plate and empty input", () => {
    const out = buildConsensus([
      { frameIndex: 0, vehicles: [bike(null, ["helmet"])] },
      { frameIndex: 1, vehicles: [bike(null, ["helmet"])] },
    ]);
    expect(out[0].identified).toBe(false);
    expect(out[0].plate).toBeNull();
    expect(buildConsensus([])).toEqual([]);
    expect(buildConsensus([{ frameIndex: 0, vehicles: [] }])).toEqual([]);
  });
});

describe("sampleTimes", () => {
  it("spreads samples inside the clip", () => {
    expect(sampleTimes(10, 5)).toEqual([1, 3, 5, 7, 9]);
    expect(sampleTimes(Infinity, 5)).toEqual([0]);
    expect(sampleTimes(4, 1)).toEqual([2]);
  });
});
