const BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/term`;

export interface ScoreRequest {
    customer_name?: string;
    age: number;
    income: number;
    child_count: number;
    extracted_sum_assured: number;
    loans: number;
    monthly_expenses: number;
    retirement_age: number;
    family_secure_years: number;
    savings: number;
    detected_riders: string[];
    insurer_name: string;
}

export interface ScoreResponse {
    score: number;
    score_reasons: string[];
    ideal_cover: number;
    ideal_cover_breakdown?: {
        income_protection: number;
        loans: number;
        dependent_buffer: number;   // canonical field — matches backend
        expense_buffer: number;
        savings_deducted: number;
        multiplier_used: number;
        child_buffer?: never;       // poison pill — TypeScript will error if referenced
    };
    coverage_ratio: number;
    coverage_status?: string;
    insurer_reliability_score: number;
    insurer_reliability_data: Record<string, number>;
}

export interface ExtractedPolicy {
    extracted_sum_assured: number;
    insurer_name: string;
    policy_term_end_age: number;
    riders_present: string[];
    premium_amount?: number;
    policy_term?: number;
}

export interface UploadResponse {
    success: boolean;
    extracted: ExtractedPolicy | null;
    score_result: ScoreResponse | null;
    error?: string;
}

export async function fetchTermScore(data: ScoreRequest): Promise<ScoreResponse> {
    const res = await fetch(`${BASE_URL}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Score API failed");
    return res.json();
}

export async function uploadTermPolicy(
    file: File,
    userData: Omit<ScoreRequest, "detected_riders" | "insurer_name">
): Promise<UploadResponse> {
    const form = new FormData();
    form.append("file", file);
    Object.entries(userData).forEach(([k, v]) => {
        if (v !== undefined) {
            form.append(k, String(v));
        }
    });

    const res = await fetch(`${BASE_URL}/upload-policy`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) throw new Error("Upload API failed");
    return res.json();
}

export interface SendReportRequest {
    to_email: string;
    customer_name: string;
    score: number;
    ideal_cover: number;
    your_cover: number;
    shortfall: number;
    coverage_status: string;
    mode: string;
    // Optional verified fields
    insurer_name?: string;
    insurer_reliability_score?: number;
    policy_term_end_age?: number;
    riders_present: string[];
    missing_riders: string[];
    score_reasons: string[];
}

export async function sendTermReport(data: SendReportRequest): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${BASE_URL}/send-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json();
        return { success: false, error: errorData.error || "Failed to send report" };
    }
    return res.json();
}
export interface PdfReportRequest {
    customer_name: string;
    score: number;
    ideal_cover: number;
    your_cover: number;
    shortfall: number;
    coverage_status: string;
    mode: string;
    insurer_name?: string;
    insurer_reliability_score?: number;
    policy_term_end_age?: number;
    riders_present: string[];
    missing_riders: string[];
    score_reasons: string[];
}

export async function downloadTermPdf(data: PdfReportRequest): Promise<void> {
    const res = await fetch(`${BASE_URL}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        throw new Error("PDF generation failed");
    }

    // Stream the blob and trigger browser download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Term_Audit_${data.customer_name || "Report"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

import { TERM_SCORING_CONSTANTS, STORAGE_VERSION } from "@/constants/termScoringConstants";

/**
 * Validates frontend constants against backend rules in development mode.
 * Logs an error to console if synchronization is lost.
 */
export async function validateScoringConstants(): Promise<void> {
    if (import.meta.env.MODE !== "development") return;

    try {
        const res = await fetch(`${BASE_URL}/rules`);
        if (!res.ok) return;
        
        const rules = await res.json();
        const backendMultiplier: number = rules?.dime?.multiplier;
        const backendDepBuffer: number = rules?.dime?.dependent_buffer;

        const { INCOME_MULTIPLIER, DEPENDENT_BUFFER } = TERM_SCORING_CONSTANTS;

        if (backendMultiplier && backendMultiplier !== INCOME_MULTIPLIER) {
            console.error(
                `[SYNC ERROR] Backend multiplier (${backendMultiplier}) ≠ Frontend constant (${INCOME_MULTIPLIER}). ` +
                `Update src/constants/termScoringConstants.ts → INCOME_MULTIPLIER.`
            );
        }
        if (backendDepBuffer && backendDepBuffer !== DEPENDENT_BUFFER) {
            console.error(
                `[SYNC ERROR] Backend dependent_buffer (${backendDepBuffer}) ≠ Frontend constant (${DEPENDENT_BUFFER}). ` +
                `Update src/constants/termScoringConstants.ts → DEPENDENT_BUFFER.`
            );
        }
    } catch {
        // Silently ignore — backend may not be reachable
    }
}

/**
 * DEV ONLY — Prints the current localStorage state for TermProtection.
 * Call from browser console: import('@/services/termApi').then(m => m.inspectStoredState())
 * Or call from main.tsx in DEV mode.
 */
export function inspectStoredState(): void {
    if (import.meta.env.MODE !== "development") return;

    const STORAGE_KEY = "termProtectionData";
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        console.info("[StorageInspector] No stored state found. Fresh session.");
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        const storedVersion = parsed._version ?? "MISSING";
        const currentVersion = STORAGE_VERSION;
        const isMatch = storedVersion === currentVersion;

        console.group("[StorageInspector] TermProtection State");
        console.info(`Version stored  : "${storedVersion}"`);
        console.info(`Version current : "${currentVersion}"`);
        console.info(`Version match   : ${isMatch ? "✅ YES" : "❌ NO — stale data will be cleared on next load"}`);
        console.info("--- Key Scoring Fields ---");
        console.info(`annualIncome          : ₹${(parsed.annualIncome ?? 0).toLocaleString("en-IN")}`);
        console.info(`idealCoverEstimated   : ₹${(parsed.idealCoverEstimated ?? 0).toLocaleString("en-IN")}`);
        console.info(`idealCoverVerified    : ₹${(parsed.idealCoverVerified ?? 0).toLocaleString("en-IN")}`);
        console.info(`policyScore           : ${parsed.policyScore ?? 0}`);
        console.info(`mode                  : ${parsed.mode ?? "unknown"}`);
        console.info("--- Full Stored State ---");
        console.table(parsed);
        console.groupEnd();
    } catch (e) {
        console.error("[StorageInspector] Failed to parse stored state:", e);
    }
}

/**
 * DEV ONLY — Clears stored TermProtection state and reloads the page.
 * Use when testing version migrations or resetting a stale session.
 */
export function clearStoredState(): void {
    if (import.meta.env.MODE !== "development") {
        console.warn("[clearStoredState] This function is for development use only.");
        return;
    }
    localStorage.removeItem("termProtectionData");
    console.info("[clearStoredState] Stored state cleared. Reloading...");
    window.location.reload();
}
