import { describe, expect, it } from "vitest";
import { parseExpenseMessage } from "@/lib/parser/expense-parser";

describe("parseExpenseMessage", () => {
  it("parses k unit and food tag", () => {
    const out = parseExpenseMessage("#food an trua 65k", new Date("2026-02-23"));
    expect(out.amount).toBe(65000);
    expect(out.tags).toEqual(["food"]);
    expect(out.detectedCategorySlug).toBe("food");
    expect(out.status).toBe("CONFIRMED");
  });

  it("parses explicit date and cafe text", () => {
    const out = parseExpenseMessage("2026-02-23 cafe 45k", new Date("2026-02-24"));
    expect(out.amount).toBe(45000);
    expect(out.expenseDate?.toISOString().slice(0, 10)).toBe("2026-02-23");
    expect(out.detectedCategorySlug).toBe("cafe");
  });

  it("marks unparsed when no amount", () => {
    const out = parseExpenseMessage("an sang");
    expect(out.amount).toBeNull();
    expect(out.status).toBe("UNPARSED");
  });

  it("parses tr unit", () => {
    const out = parseExpenseMessage("mua do 1.2tr");
    expect(out.amount).toBe(1200000);
  });
});
