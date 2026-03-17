const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface LeadPayload {
    name: string;
    phone: string;
    email?: string;
    tool_type: "health" | "motor" | "term";
}

export const captureLead = async (leadData: LeadPayload) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/leads/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(leadData),
        });
        return await response.json();
    } catch (error) {
        console.error("Lead capture failed:", error);
        return { status: "error", message: String(error) };
    }
};
