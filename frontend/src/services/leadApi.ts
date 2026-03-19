const API_URL = import.meta.env.VITE_API_URL;
const BCL_API_URL = import.meta.env.VITE_BCL_API_URL;

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

export const uploadInsuranceFile = async (mobile: string, file: File) => {
    try {
        const formData = new FormData();
        formData.append("mobile", mobile);
        formData.append("file", file);

        const response = await fetch(`${BCL_API_URL}/insuranceuploadfile`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        if (data.success && data.url) {
            sessionStorage.setItem("mobile", mobile);
            sessionStorage.setItem("policyUrl", data.url);
        }
        return data;
    } catch (error) {
        console.error("Insurance file upload failed:", error);
        return { success: false, message: String(error) };
    }
};

export const createCRMLead = async (payload: CRMLeadPayload) => {
    try {
        const storedMobile = sessionStorage.getItem("mobile");
        const policyUrl = sessionStorage.getItem("policyUrl");

        const enrichedPayload: CRMLeadPayload = {
            ...payload,
            mobile: payload.mobile || storedMobile || "",
            remarks: {
                ...payload.remarks,
                policy_url: payload.remarks.policy_url || policyUrl || "",
            }
        };

        const response = await fetch(`${BCL_API_URL}/insuranceCRMLead`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(enrichedPayload),
        });
        return await response.json();
    } catch (error) {
        console.error("CRM Lead creation failed:", error);
        return { status: "error", message: String(error) };
    }
};
export interface InsuranceReviewLogPayload {
    mobile: string;
    upload_file: string;
    report_file: string;
    api_response: any;
}

export const logInsuranceReview = async (apiResponse: any) => {
    try {
        const mobile = sessionStorage.getItem("mobile") || "";
        const upload_file = sessionStorage.getItem("policyUrl") || "";
        const report_file = sessionStorage.getItem("report_url") || "";

        const logPayload: InsuranceReviewLogPayload = {
            mobile,
            upload_file,
            report_file,
            api_response: apiResponse
        };

        const response = await fetch(`${BCL_API_URL}/insurance-review-logs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(logPayload),
        });
        return await response.json();
    } catch (error) {
        console.error("Insurance review logging failed:", error);
        return { success: false, message: String(error) };
    }
};
