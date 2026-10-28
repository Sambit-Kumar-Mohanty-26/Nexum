import { describe, it, expect } from "vitest";
import {
  centsToDecimalString,
  decimalStringToCents,
  formatCentsToDisplay,
  validateMilestoneAllocation,
} from "../src/lib/payments/money";

describe("Money Handling Utilities (Zero Floating-Point Error Guarantee)", () => {
  describe("centsToDecimalString", () => {
    it("converts integer cents to PayPal decimal strings", () => {
      expect(centsToDecimalString(0)).toBe("0.00");
      expect(centsToDecimalString(1)).toBe("0.01");
      expect(centsToDecimalString(99)).toBe("0.99");
      expect(centsToDecimalString(100)).toBe("1.00");
      expect(centsToDecimalString(15000)).toBe("150.00");
      expect(centsToDecimalString(450000)).toBe("4500.00");
    });

    it("throws when given invalid, negative, or floating point cents", () => {
      expect(() => centsToDecimalString(-10)).toThrow();
      expect(() => centsToDecimalString(15.5)).toThrow();
      expect(() => centsToDecimalString(NaN)).toThrow();
    });
  });

  describe("decimalStringToCents", () => {
    it("converts valid decimal strings to exact integer cents without float drift", () => {
      expect(decimalStringToCents("0.00")).toBe(0);
      expect(decimalStringToCents("0.01")).toBe(1);
      expect(decimalStringToCents("19.99")).toBe(1999);
      expect(decimalStringToCents("150")).toBe(15000);
      expect(decimalStringToCents("150.5")).toBe(15050);
      expect(decimalStringToCents("150.00")).toBe(15000);
      expect(decimalStringToCents("12345.67")).toBe(1234567);
    });

    it("rejects non-numeric or malformed string inputs", () => {
      expect(() => decimalStringToCents("abc")).toThrow();
      expect(() => decimalStringToCents("-50.00")).toThrow();
      expect(() => decimalStringToCents("10.999")).toThrow();
    });
  });

  describe("formatCentsToDisplay", () => {
    it("formats cents with currency symbol and code", () => {
      expect(formatCentsToDisplay(15000)).toBe("$150.00 USD");
      expect(formatCentsToDisplay(450000)).toBe("$4500.00 USD");
    });
  });

  describe("validateMilestoneAllocation", () => {
    it("returns valid=true when milestones sum exactly to agreement total", () => {
      const milestones = [
        { amountCents: 10000 },
        { amountCents: 20000 },
        { amountCents: 15000 },
      ];
      const result = validateMilestoneAllocation(milestones, 45000);
      expect(result.valid).toBe(true);
      expect(result.sumCents).toBe(45000);
      expect(result.deltaCents).toBe(0);
    });

    it("returns valid=false with delta when milestones do not sum to total", () => {
      const milestones = [
        { amountCents: 10000 },
        { amountCents: 20000 },
      ];
      const result = validateMilestoneAllocation(milestones, 35000);
      expect(result.valid).toBe(false);
      expect(result.sumCents).toBe(30000);
      expect(result.deltaCents).toBe(5000);
    });
  });
});

