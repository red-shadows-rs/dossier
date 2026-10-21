// Dossier - Subscriptions Library Helper Utility
// https://github.com/red-shadows-rs/dossier

import type { SubscriptionFrequency, SubscriptionStatus } from "@/lib/constants";
import { addDays, isValidDateStr } from "@/lib/dates";

export function calculateNextRunDate(
  currentDateStr: string,
  frequency: SubscriptionFrequency,
  intervalCount = 1,
): string {
  if (!isValidDateStr(currentDateStr)) {
    return currentDateStr;
  }

  const [yStr, mStr, dStr] = currentDateStr.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  const count = Math.max(1, intervalCount);

  if (frequency === "weekly") {
    return addDays(currentDateStr, 7 * count);
  }

  if (frequency === "monthly" || frequency === "quarterly" || frequency === "semi_annual") {
    let monthsToAdd = count;
    if (frequency === "quarterly") monthsToAdd = 3 * count;
    if (frequency === "semi_annual") monthsToAdd = 6 * count;

    const targetMonth = month + monthsToAdd;
    const newYear = year + Math.floor((targetMonth - 1) / 12);
    const newMonth = ((targetMonth - 1) % 12) + 1;

    const maxDays = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
    const newDay = Math.min(day, maxDays);

    return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
  }

  if (frequency === "annual") {
    const newYear = year + count;
    const maxDays = new Date(Date.UTC(newYear, month, 0)).getUTCDate();
    const newDay = Math.min(day, maxDays);
    return `${newYear}-${String(month).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
  }

  if (frequency === "custom") {
    return addDays(currentDateStr, count);
  }

  return addDays(currentDateStr, 30);
}

export function subscriptionStatusTone(
  status: SubscriptionStatus,
): "green" | "amber" | "gray" | "red" | "blue" {
  switch (status) {
    case "active":
      return "green";
    case "paused":
      return "amber";
    case "completed":
      return "blue";
    case "canceled":
      return "gray";
    default:
      return "gray";
  }
}
