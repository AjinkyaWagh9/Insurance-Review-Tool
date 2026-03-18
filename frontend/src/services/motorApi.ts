const BASE_URL = import.meta.env.VITE_API_URL;

export interface MotorAddOns {
    zero_dep: boolean;
    engine_protect: boolean;
    rti: boolean;
    ncb_protect: boolean;
    consumables: boolean;
    tyre_protect: boolean;
    roadside_assist: boolean;
}

export interface MotorReportPayload {
    customer_name: string;
    phone?: string;
    to_email?: string;
    score: number;
    score_reasons: string[];
    insurer_name?: string;
    policy_type: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_variant: string;
    vehicle_reg_year?: number;
    vehicle_age_years?: number;
    vehicle_type: string;
    policy_idv?: number;
    ideal_idv?: number;
    ncb_percentage: number;
    deductible: number;
    add_ons: MotorAddOns;
}

// ── Email ─────────────────────────────────────────────────────────────────
export async function sendMotorReport(
    toEmail: string,
    data: Omit<MotorReportPayload, 'to_email'>
): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${BASE_URL}/api/motor/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_email: toEmail, ...data }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, error: errorData.error || "Failed to send email" };
    }
    return res.json();
}

// ── PDF S3 Upload ─────────────────────────────────────────────────────────
/** Generates Motor PDF and uploads to S3. Returns { success, url }. Does NOT trigger a browser download. */
export async function generateAndUploadMotorPdf(data: MotorReportPayload): Promise<{ success: boolean; url?: string; message?: string }> {
    const res = await fetch(`${BASE_URL}/api/s3/generate-and-upload-motor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error("Motor PDF S3 generation failed");
    }
    return res.json();
}

// ── PDF Download ──────────────────────────────────────────────────────────
export async function downloadMotorPdf(data: MotorReportPayload): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/motor/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("PDF generation failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Motor_Audit_${data.vehicle_make}_${data.vehicle_model}.pdf`.replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
