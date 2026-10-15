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
  const lineTotals = input.items.map((item) =>
    mulDivRound(item.unitPriceMinor, item.qtyMilli, 1000),
  );
  const subtotal = lineTotals.reduce((acc, value) => acc + value, 0);

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

  const net = subtotal - discount;

  if (
    !Number.isInteger(input.taxRateBp) ||
    input.taxRateBp < 0 ||
    input.taxRateBp > 10000
  ) {
    throw new AppError("VALIDATION_FAILED", "Invalid tax rate", {
      taxRateBp: "errors.invalid",
    });
  }

  const tax =
    input.fixedTaxMinor !== undefined
      ? input.fixedTaxMinor
      : percentOfBp(net, input.taxRateBp);
  const total = net + tax;

  assertMinor(subtotal, "subtotal");
  assertMinor(discount, "discount");
  assertMinor(net, "net");
  assertMinor(tax, "tax");
  assertMinor(total, "total");

  return { lineTotals, subtotal, discount, net, tax, total };
}
