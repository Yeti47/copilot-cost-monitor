export interface UsageItem {
    product: string;
    sku: string;
    grossQuantity: number;
    discountQuantity: number;
    netQuantity: number;
    grossAmount: number;
    discountAmount: number;
    netAmount: number;
    pricePerUnit: number;
    unitType: string;
}

export interface CopilotUsageResponse {
    timePeriod: {
        year: number;
        month: number;
    };
    user: string;
    usageItems: UsageItem[];
}

export interface FetchResult {
    cost: number | null;
    etag: string | null;
}

export async function fetchCopilotCost(username: string, token: string, lastETag?: string | null): Promise<FetchResult> {
    if (!username || !token) {
        throw new Error("GitHub Username or Token not configured.");
    }

    const url = `https://api.github.com/users/${username}/settings/billing/usage/summary?product=Copilot`;

    const headers: Record<string, string> = {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28"
    };

    if (lastETag) {
        headers["If-None-Match"] = lastETag;
    }

    try {
        const response = await fetch(url, { headers });

        if (response.status === 304) {
            console.log("304 Not Modified: Using cached data");
            return { cost: null, etag: lastETag || null };
        }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Authentication failed. Check your Token, scopes, or expiration.");
            }
            if (response.status === 404) {
                throw new Error("User not found or endpoint not available.");
            }
            throw new Error(`API request failed with status ${response.status}`);
        }

        const newETag = response.headers.get("etag");
        const data = await response.json() as CopilotUsageResponse;

        // Since we filter server-side, we just sum up everything returned.
        const cost = (data.usageItems || [])
            .reduce((total, item) => total + item.netAmount, 0);

        return { cost, etag: newETag };

    } catch (error) {
        console.error("Error fetching Copilot cost:", error);
        throw error;
    }
}
