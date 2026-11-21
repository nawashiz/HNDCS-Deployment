type ApiBody<T> = { data?: T; error?: string };

async function readBody<T>(response: Response): Promise<ApiBody<T>> {
    try {
        return (await response.json()) as ApiBody<T>;
    } catch {
        return {};
    }
}

export async function apiGet<T>(url: string): Promise<T> {
    const response = await fetch(url, { cache: "no-store" });
    const body = await readBody<T>(response);
    if (!response.ok) throw new Error(body.error || "Unable to load data. Please try again.");
    return body.data as T;
}

export async function apiSend<T>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", payload?: unknown): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
        body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const body = await readBody<T>(response);
    if (!response.ok) throw new Error(body.error || "The request failed. Please try again.");
    return body.data as T;
}
