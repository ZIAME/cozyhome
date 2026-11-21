import { describe, expect, it } from "vitest";
import { baseUrl } from "./supabase";

describe("Supabase address", () => {
  it("keeps only the project's base address", () => {
    for (const u of ["https://abc.supabase.co", "https://abc.supabase.co/", " https://abc.supabase.co/rest/v1/ ", "https://abc.supabase.co/rest/v1", "https://abc.supabase.co/auth/v1/otp"])
      expect(baseUrl(u)).toBe("https://abc.supabase.co");
  });
});
