const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function createApiClient(token: string) {
  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new ApiError(res.status, err.detail ?? "Request failed");
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async function stream(path: string, body: unknown, onChunk: (text: string) => void): Promise<void> {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new ApiError(res.status, err.detail ?? "Request failed");
    }
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      let delimiterIndex = buffer.indexOf("\n\n");
      while (delimiterIndex !== -1) {
        const event = buffer.slice(0, delimiterIndex);
        buffer = buffer.slice(delimiterIndex + 2);
        const lines = event.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const text = line.slice(6);
          if (text === "[DONE]") return;
          if (text.startsWith("[ERROR]")) {
            throw new ApiError(500, text.replace(/^\[ERROR\]\s*/, "") || "Stream failed");
          }
          onChunk(text);
        }
        delimiterIndex = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
    stream,
  };
}

export { createApiClient, ApiError };
export type ApiClient = ReturnType<typeof createApiClient>;
