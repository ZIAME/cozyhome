import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { nameFrom, placeFromTimeZone } from "./Welcome";

describe("a fresh room for a signed-in account", () => {
  it("takes a first name from Google, or from the email", () => {
    expect(nameFrom("Ziana Saif", "x@y.com")).toBe("Ziana");
    expect(nameFrom(null, "zianasaif05@gmail.com")).toBe("Zianasaif");
    expect(nameFrom(null, "afra.khan@x.com")).toBe("Afra");
    expect(nameFrom(null, "12345@x.com")).toBe("Friend");
  });
  it("guesses the place from the device's time zone", () => {
    expect(placeFromTimeZone("Asia/Kolkata").name).toBe("Kolkata");
    expect(placeFromTimeZone("Asia/Calcutta").name).toBe("Kolkata");
    expect(placeFromTimeZone("America/New_York")).toMatchObject({ name: "New York", country: "US" });
    expect(placeFromTimeZone("Pacific/Nowhere").name).toBe("Lucknow");
  });
});
