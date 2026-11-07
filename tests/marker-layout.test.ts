import { describe, expect, it } from "vitest";
import { choosePostcards } from "../src/lib/marker-layout";

describe("dense place markers", () => {
  it("keeps the selected photo and replaces overlapping photos with dots", () => {
    const selected = choosePostcards(
      [
        { id: "paris", x: 100, y: 100, selected: false },
        { id: "venice", x: 110, y: 110, selected: true },
        { id: "kyoto", x: 300, y: 250, selected: false },
      ],
      5,
      1,
    );
    expect([...selected]).toEqual(["venice", "kyoto"]);
  });
  it("caps postcard count even when no markers overlap", () => {
    const markers = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      x: i * 200,
      y: 0,
      selected: false,
    }));
    expect(choosePostcards(markers, 5, 1).size).toBe(5);
  });
  it("shows both covers when their current zoom footprint fits", () => {
    const markers = [
      { id: "kosice", x: 400, y: 260, selected: false },
      { id: "london", x: 285, y: 240, selected: false },
    ];
    expect(choosePostcards(markers, 5, 1).size).toBe(1);
    expect(choosePostcards(markers, 5, 0.69).size).toBe(2);
  });
});
