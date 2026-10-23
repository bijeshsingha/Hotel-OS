// The deadline covers receiving and reading the response, including a stalled body.
export const AUTH_REQUEST_TIMEOUT_MS = 15_000;

export class ClientRequestError extends Error {}

export async function authRequest<T = any>(
  url: string,
  options: Omit<RequestInit, "signal"> = {},
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
): Promise<{ response: Response; data: T }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ClientRequestError("Hotel OS took too long to respond. Please try again."));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...options, credentials: "same-origin", signal: controller.signal });
        const data = await response.json();
        return { response, data: data as T };
      })(),
      deadline,
    ]);
  } catch (error) {
    if (error instanceof ClientRequestError) throw error;
    throw new ClientRequestError("Cannot connect to Hotel OS. Check the connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}
