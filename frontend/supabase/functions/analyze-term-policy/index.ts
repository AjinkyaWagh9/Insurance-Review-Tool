import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("policy_pdf") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No policy PDF provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate PDF analysis — replace with real extraction logic later
    const extracted_sum_assured = 5000000; // ₹50L
    const policy_term_end_age = 65;
    const riders_present = ["Accidental Death Benefit"];
    const insurer_name = "HDFC Life";

    // Policy score calculation
    let policy_score = 0;

    // SA scoring (max 40)
    if (extracted_sum_assured >= 10000000) policy_score += 40;
    else if (extracted_sum_assured >= 5000000) policy_score += 30;
    else if (extracted_sum_assured >= 2500000) policy_score += 20;
    else policy_score += 10;

    // Term duration scoring (max 30)
    if (policy_term_end_age >= 75) policy_score += 30;
    else if (policy_term_end_age >= 65) policy_score += 20;
    else if (policy_term_end_age >= 60) policy_score += 15;
    else policy_score += 5;

    // Riders scoring (max 30)
    const riderScore = Math.min(30, riders_present.length * 10);
    policy_score += riderScore;

    policy_score = Math.min(100, policy_score);

    const result = {
      extracted_sum_assured,
      policy_term_end_age,
      riders_present,
      insurer_name,
      policy_score,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error analyzing term policy:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
