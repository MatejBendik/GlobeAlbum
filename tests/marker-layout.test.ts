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
    );
    expect([...selected]).toEqual(["venice", "kyoto"]);
  });
  it("caps postcard count even when no markers overlap", () => {
    const markers = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      x: i * 100,
      y: 0,
      selected: false,
    }));
    expect(choosePostcards(markers, 5).size).toBe(5);
  });
});
