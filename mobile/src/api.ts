declare const process: { env: Record<string, string | undefined> };

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000";
const USER_ID = process.env.EXPO_PUBLIC_DEV_USER_ID ?? "user-alice";

export async function getApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${USER_ID}`,
    },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export { API_URL };
