const API_URL = import.meta.env.VITE_API_URL;

export interface LeadPayload {
    name: string;
    phone: string;
    email?: string;
    tool_type: "health" | "motor" | "term";
}

export interface CRMLeadPayload {
    name: string;
    mobile: string;
    City: string;
    Age: string;
    Campaign_Name: string;
    Product: string;
    Utm_Source: string;
    Utm_Medium: string;
    Utm_Campaign: string;
    remarks: Record<string, string>;
}

export const captureLead = async (leadData: LeadPayload) => {
    console.log('apiUrl', API_URL);
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

export const createCRMLead = async (payload: CRMLeadPayload) => {
    try {
        const response = await fetch("http://localhost:8087/bclcomapp/api/insuranceCRMLead", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        return await response.json();
    } catch (error) {
        console.error("CRM Lead creation failed:", error);
        return { status: "error", message: String(error) };
    }
};

