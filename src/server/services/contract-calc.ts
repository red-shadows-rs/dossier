// Dossier - Contract Calc Service
// https://github.com/red-shadows-rs/dossier

import { MAX_MINOR } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { mulDivRound, percentOfBp } from "@/lib/money";

export type DiscountType = "none" | "percent" | "fixed";

export type CalcInput = {
  items: { unitPriceMinor: number; qtyMilli: number }[];
  discount: { type: DiscountType; value: number }; 
  taxRateBp: number; 
  fixedTaxMinor?: number; 
};

export type CalcOutput = {
  lineTotals: number[];
  subtotal: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
};

function assertMinor(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MINOR) {
    throw new AppError("VALIDATION_FAILED", "Amount out of range", {
      [field]: "errors.invalid",
    });
  }
}

export function calcTotals(input: CalcInput): CalcOutput {
  const hasFractionalUnit = input.items.some(
    (item) => !Number.isInteger(item.unitPriceMinor),
  );
  const rawLineAmounts = input.items.map(
    (item) => (item.unitPriceMinor * item.qtyMilli) / 1000,
  );
  const rawSubtotal = rawLineAmounts.reduce((acc, value) => acc + value, 0);

  const lineTotals = input.items.map((item) =>
    mulDivRound(item.unitPriceMinor, item.qtyMilli, 1000),
  );
  let subtotal = lineTotals.reduce((acc, value) => acc + value, 0);

  let discount: number;
  switch (input.discount.type) {
    case "none":
      discount = 0;
      break;
    case "percent": {
      if (
        !Number.isInteger(input.discount.value) ||
        input.discount.value < 0 ||
        input.discount.value > 10000
      ) {
        throw new AppError("VALIDATION_FAILED", "Invalid discount", {
          discountValue: "errors.invalid",
        });
      }
      discount = percentOfBp(subtotal, input.discount.value);
      break;
    }
    case "fixed": {
      if (!Number.isInteger(input.discount.value) || input.discount.value < 0) {
        throw new AppError("VALIDATION_FAILED", "Invalid discount", {
          discountValue: "errors.invalid",
        });
      }
      if (input.discount.value > subtotal) {
        throw new AppError("VALIDATION_FAILED", "Discount exceeds subtotal", {
          discountValue: "errors.discountExceedsSubtotal",
        });
      }
      discount = input.discount.value;
      break;
    }
  }

  let net = subtotal - discount;

  if (
    !Number.isInteger(input.taxRateBp) ||
    input.taxRateBp < 0 ||
    input.taxRateBp > 10000
  ) {
    throw new AppError("VALIDATION_FAILED", "Invalid tax rate", {
      taxRateBp: "errors.invalid",
    });
  }

  let tax: number;
  let total: number;

  if (hasFractionalUnit && input.fixedTaxMinor === undefined) {
    const rawNet = Math.max(0, rawSubtotal - discount);
    tax = Math.round((rawNet * input.taxRateBp) / 10000);
    total = Math.round(rawNet * (1 + input.taxRateBp / 10000));
    net = total - tax;
    subtotal = net + discount;
    if (lineTotals.length === 1) {
      lineTotals[0] = subtotal;
    } else if (lineTotals.length > 1) {
      const diff = subtotal - lineTotals.reduce((a, b) => a + b, 0);
      lineTotals[lineTotals.length - 1] += diff;
    }
  } else {
    tax =
      input.fixedTaxMinor !== undefined
        ? input.fixedTaxMinor
        : percentOfBp(net, input.taxRateBp);
    total = net + tax;
  }

  assertMinor(subtotal, "subtotal");
  assertMinor(discount, "discount");
  assertMinor(net, "net");
  assertMinor(tax, "tax");
  assertMinor(total, "total");

  return { lineTotals, subtotal, discount, net, tax, total };
}
