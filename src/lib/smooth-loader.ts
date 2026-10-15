/**
 * Ensures a minimum smooth loading threshold (~250ms) so Next.js App Router
 * streaming and loading skeleton states are perceptible and smooth,
 * preventing jarring sub-millisecond flashes.
 *
 * In test environment (Vitest), it resolves immediately (0ms) to keep tests fast.
 */
export async function smoothLoading(delayMs = 250): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

