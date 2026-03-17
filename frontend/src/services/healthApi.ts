const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface HealthPdfRequest {
    customer_name: string;
    insurer_name: string;
    plan_name: string;
    policy_number: string;
    sum_insured: number;
    premium: number;
    policy_tenure: string;
    is_family_floater: boolean;
    members_covered: number;
    room_rent_limit: string;
    copay_percentage: number;
    deductible: number;
    sub_limits: string[];
    waiting_periods: {
        initial_days: number;
        ped_months: number;
        specific_months: number;
    };
    restoration_present: boolean;
    restoration_type: string;
    ncb_percentage: number;
    ncb_max_percentage: number;
    zone_of_cover: string;
    has_zonal_copay: boolean;
    global_health_coverage: boolean;
    score: number;
    ideal_cover: number;
    comparison_rows: Array<{
        dimension: string;
        status: string;
        summary: string;
        your_need: string;
        your_policy: string;
        why_matters: string;
        recommended_action: string;
    }>;
    recommendations: Array<{
        priority: string;
        title: string;
        description: string;
    }>;
}

export interface HealthEmailRequest extends HealthPdfRequest {
    to_email: string;
}

export async function downloadHealthPdf(data: HealthPdfRequest): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/health/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        throw new Error("PDF generation failed");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Health_Audit_${data.customer_name || "Report"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

export async function sendHealthReport(data: HealthEmailRequest): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/health/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send email report");
    }
}
