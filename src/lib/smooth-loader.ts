export async function smoothLoading(delayMs = 250): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

