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
    const marketValueStr = formData.get("market_value") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No policy PDF provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const marketValue = marketValueStr ? parseInt(marketValueStr, 10) : 0;

    // Simulate PDF analysis — replace with real extraction logic later
    // In production, this would use an AI model or PDF parser to extract data
    const vehicleYear = 2021;
    const currentYear = new Date().getFullYear();
    const age = currentYear - vehicleYear;

    // Depreciation schedule
    let depRate = 0.55;
    if (age <= 0.5) depRate = 0.05;
    else if (age <= 1) depRate = 0.05;
    else if (age <= 2) depRate = 0.15;
    else if (age <= 3) depRate = 0.25;
    else if (age <= 4) depRate = 0.35;
    else if (age <= 5) depRate = 0.45;

    const expectedMarketValue = marketValue > 0 ? marketValue : 750000;
    const idealIdv = Math.round(expectedMarketValue * (1 - depRate));
    const policyIdv = 450000; // extracted from PDF

    const idvGap = Math.max(0, idealIdv - policyIdv);

    const addOns = {
      zero_dep: true,
      engine_protect: false,
      rti: false,
      ncb_protect: true,
    };

    // Policy score calculation
    let policyScore = 0;
    const addonCount = [addOns.zero_dep, addOns.engine_protect, addOns.rti, addOns.ncb_protect].filter(Boolean).length;
    policyScore += addonCount * 10; // max 40

    if (idealIdv > 0) {
      const idvRatio = policyIdv / idealIdv;
      policyScore += Math.min(40, Math.round(idvRatio * 40));
    }

    // Deductible scoring
    const deductible = 2500;
    if (deductible <= 1000) policyScore += 20;
    else if (deductible <= 2500) policyScore += 15;
    else if (deductible <= 5000) policyScore += 10;
    else policyScore += 5;

    policyScore = Math.min(100, policyScore);

    const result = {
      vehicle_year: vehicleYear,
      policy_idv: policyIdv,
      expected_market_value: expectedMarketValue,
      ideal_idv: idealIdv,
      idv_gap: idvGap,
      policy_score: policyScore,
      add_ons: addOns,
      deductible,
      insurer_name: "ICICI Lombard",
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error analyzing policy:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
