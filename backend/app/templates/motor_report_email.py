from app.templates.logo_utils import logo_img_tag

def build_motor_report_html(data: dict) -> str:
    """
    Builds the HTML email/PDF body for the Motor Insurance Audit Report.
    All values come from the request body. Same pattern as term report.
    Uses table-based layout only — no flexbox (Gmail-safe).
    """

    def fmt_inr(val):
        if val is None:
            return "N/A"
        try:
            val = float(val)
        except (ValueError, TypeError):
            return "N/A"
            
        if val >= 10_000_000:
            return f"₹{val / 10_000_000:.1f} Cr"
        if val >= 100_000:
            return f"₹{val / 100_000:.1f} Lakh"
        return f"₹{val:,.0f}"

    # ── Core fields ──────────────────────────────────────────────────────────
    customer_name     = data.get("customer_name", "there")
    score             = data.get("score", 0)
    score_reasons     = data.get("score_reasons", [])
    insurer_name      = data.get("insurer_name", "Unknown")
    policy_type       = data.get("policy_type", "Comprehensive")

    # Vehicle
    vehicle_make      = data.get("vehicle_make", "")
    vehicle_model     = data.get("vehicle_model", "")
    vehicle_variant   = data.get("vehicle_variant", "")
    vehicle_reg_year  = data.get("vehicle_reg_year", "")
    vehicle_age       = data.get("vehicle_age_years", "")
    vehicle_type      = data.get("vehicle_type", "").capitalize()

    # IDV
    policy_idv        = data.get("policy_idv", 0)
    ideal_idv         = data.get("ideal_idv", 0)
    
    try:
        idv_gap = float(policy_idv or 0) - float(ideal_idv or 0)
    except (ValueError, TypeError):
        idv_gap = 0

    # NCB / deductible
    ncb_percentage    = data.get("ncb_percentage", 0)
    deductible        = data.get("deductible", 0)

    # Add-ons (all 7)
    add_ons           = data.get("add_ons", {})
    zero_dep          = add_ons.get("zero_dep", False)
    engine_protect    = add_ons.get("engine_protect", False)
    rti               = add_ons.get("rti", False)
    ncb_protect       = add_ons.get("ncb_protect", False)
    consumables       = add_ons.get("consumables", False)
    tyre_protect      = add_ons.get("tyre_protect", False)
    roadside_assist   = add_ons.get("roadside_assist", False)

    # ── Score color ──────────────────────────────────────────────────────────
    if score >= 75:
        score_color = "#10b981"
        score_label = "Well Protected"
    elif score >= 50:
        score_color = "#f59e0b"
        score_label = "Needs Attention"
    else:
        score_color = "#ef4444"
        score_label = "Critical Gaps"

    # ── Policy type badge ─────────────────────────────────────────────────────
    if str(policy_type).lower() == "comprehensive":
        badge_bg, badge_color = "#d1fae5", "#065f46"
    else:
        badge_bg, badge_color = "#fee2e2", "#991b1b"

    # ── IDV status ────────────────────────────────────────────────────────────
    # Gap = Ideal (Need) - Policy (Have)
    # Positive Gap = Under-insured (Need > Have)
    # Negative Gap = Over-insured (Need < Have)
    try:
        raw_gap = float(ideal_idv or 0) - float(policy_idv or 0)
    except (ValueError, TypeError):
        raw_gap = 0

    if ideal_idv and policy_idv:
        gap_percent = (raw_gap / float(ideal_idv)) * 100
        
        if gap_percent > 5:
            idv_status = f"Under-insured by {fmt_inr(abs(raw_gap))}"
            idv_status_color = "#f59e0b"  # Yellow for Warning
        elif gap_percent < -5:
            idv_status = f"Over-insured by {fmt_inr(abs(raw_gap))}"
            idv_status_color = "#10b981"  # Green for OK (Financial leak but no coverage risk)
        else:
            idv_status = "Optimal IDV"
            idv_status_color = "#10b981"  # Green
    else:
        idv_status = "N/A"
        idv_status_color = "#6b7280"

    # Add hidden debug info for IDV investigation if needed
    debug_idv = f"<!-- IDV DEBUG: Policy={policy_idv}, Ideal={ideal_idv}, Gap={raw_gap} -->"

    # ── Add-on row builder ───────────────────────────────────────────────────
    def addon_row(label, present, note=""):
        tick    = "✅"  if present else "❌"
        color   = "#065f46" if present else "#991b1b"
        bg      = "#f0fdf4" if present else "#fef2f2"
        status  = "Active" if present else f"Missing{' — ' + note if note else ''}"
        return f"""
        <tr style="background:{bg};">
          <td style="padding:10px 14px; font-size:13px; color:#374151;">{tick} {label}</td>
          <td style="padding:10px 14px; font-size:13px; font-weight:600; color:{color};
                     text-align:right;">{status}</td>
        </tr>"""

    addons_html = (
        addon_row("Zero Depreciation",  zero_dep,       "Full claim deductions apply") +
        addon_row("Engine Protection",  engine_protect, "Engine damage not covered") +
        addon_row("Return to Invoice",  rti,            "Gap between claim & purchase price") +
        addon_row("NCB Protection",     ncb_protect,    "NCB lost after a claim") +
        addon_row("Consumables Cover",  consumables,    "Nuts, bolts, oil not covered") +
        addon_row("Tyre Protection",    tyre_protect,   "Tyre damage claims rejected") +
        addon_row("Roadside Assistance", roadside_assist, "No breakdown support")
    )

    # ── Score reasons ─────────────────────────────────────────────────────────
    reasons_html = "".join(
        f"<li style='margin:5px 0; color:#374151; font-size:13px;'>{r}</li>"
        for r in score_reasons
    ) or "<li style='color:#6b7280; font-size:13px;'>No penalties applied</li>"

    # ── Full HTML ─────────────────────────────────────────────────────────────
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f9fafb;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<div style="max-width:580px; margin:4px auto 32px auto; background:#ffffff;
            border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">

  <!-- ═══ HEADER ═══ -->
  <div style="background:#ffffff; padding:8px 32px 16px 32px; text-align:center; border-bottom:2px solid #e2e8f0;">
    {logo_img_tag(200)}
    <h1 style="margin:4px 0 4px; color:#0f172a; font-size:22px; font-weight:700;">
      🚗 Motor Insurance Audit
    </h1>
    <p style="margin:4px 0 6px; color:#475569; font-size:13px;">
      Prepared for {customer_name}
    </p>
    <span style="background:{badge_bg}; color:{badge_color}; padding:3px 12px;
                 border-radius:20px; font-size:11px; font-weight:600;
                 text-transform:uppercase; letter-spacing:0.05em;">
      {policy_type}
    </span>
  </div>

  <!-- ═══ SCORE RING (table-based — Gmail safe) ═══ -->
  <div style="padding:28px 32px; text-align:center; border-bottom:1px solid #f3f4f6;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
      <tr>
        <td width="88" height="88" align="center" valign="middle"
            style="width:88px; height:88px; border-radius:50%;
                   border:4px solid {score_color};">
          <span style="font-size:32px; font-weight:800;
                       color:{score_color}; line-height:1;">{score}</span>
        </td>
      </tr>
    </table>
    <p style="margin:0; color:#6b7280; font-size:11px;
              text-transform:uppercase; letter-spacing:0.08em;">Your Policy Score</p>
    <p style="margin:4px 0 0; font-size:15px; font-weight:700;
              color:{score_color};">{score_label}</p>
  </div>

  <!-- ═══ VEHICLE SNAPSHOT ═══ -->
  <div style="padding:24px 32px; border-bottom:1px solid #f3f4f6;">
    <h2 style="margin:0 0 14px; font-size:13px; font-weight:700;
               text-transform:uppercase; letter-spacing:0.06em; color:#374151;">
      🚘 Vehicle Snapshot
    </h2>
    <table style="width:100%; border-collapse:collapse; background:#f9fafb;
                  border-radius:10px; overflow:hidden;">
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">Vehicle</td>
        <td style="padding:10px 14px; font-weight:600; font-size:13px;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">
          {vehicle_make} {vehicle_model}
          {"<br><span style='font-size:11px; color:#6b7280;'>" + str(vehicle_variant) + "</span>" if vehicle_variant else ""}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">Type</td>
        <td style="padding:10px 14px; font-weight:600; font-size:13px;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">{vehicle_type}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">Registration Year</td>
        <td style="padding:10px 14px; font-weight:600; font-size:13px;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">{vehicle_reg_year}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">Vehicle Age</td>
        <td style="padding:10px 14px; font-weight:600; font-size:13px;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">{vehicle_age} years</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">Insurer</td>
        <td style="padding:10px 14px; font-weight:600; font-size:13px;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">{insurer_name}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">NCB</td>
        <td style="padding:10px 14px; font-weight:600; font-size:13px;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">{ncb_percentage}%</td>
      </tr>
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;">
          Voluntary Deductible</td>
        <td style="padding:10px 14px; font-weight:600; font-size:13px;
                   color:#0f172a;">
          {("₹" + f"{int(deductible):,}") if deductible else "None"}
        </td>
      </tr>
    </table>
  </div>

  <!-- ═══ IDV ANALYSIS ═══ -->
  <div style="padding:24px 32px; border-bottom:1px solid #f3f4f6;">
    <h2 style="margin:0 0 14px; font-size:13px; font-weight:700;
               text-transform:uppercase; letter-spacing:0.06em; color:#374151;">
      💰 IDV Analysis
    </h2>
    <table style="width:100%; border-collapse:collapse; background:#f9fafb;
                  border-radius:10px; overflow:hidden;">
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">Policy IDV</td>
        <td style="padding:10px 14px; font-weight:700; font-size:13px; white-space:nowrap;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">{fmt_inr(policy_idv)}</td>

      </tr>
      <tr>
        <td style="padding:10px 14px; color:#6b7280; font-size:13px;
                   border-bottom:1px solid #f3f4f6;">Ideal IDV (Market Value)</td>
        <td style="padding:10px 14px; font-weight:700; font-size:13px; white-space:nowrap;
                   border-bottom:1px solid #f3f4f6; color:#0f172a;">{fmt_inr(ideal_idv)}</td>
      </tr>
      <tr>
        <td style="padding:12px 14px; color:#6b7280; font-size:13px;">IDV Status</td>
        <td style="padding:12px 14px; font-weight:700; font-size:14px;
                   color:{idv_status_color};">{idv_status}</td>
      </tr>
    </table>
    <p style="margin:10px 0 0; font-size:11px; color:#9ca3af;">
      Ideal IDV is calculated using standard depreciation rates based on vehicle age.
      Over-insured IDV leads to higher premium; under-insured IDV means lower claim payout.
    </p>
  </div>

  <!-- ═══ ADD-ON HEALTH CHECK ═══ -->
  <div style="padding:24px 32px; border-bottom:1px solid #f3f4f6;">
    <h2 style="margin:0 0 14px; font-size:13px; font-weight:700;
               text-transform:uppercase; letter-spacing:0.06em; color:#374151;">
      🛡 Add-on Health Check
    </h2>
    <table style="width:100%; border-collapse:collapse; border-radius:10px; overflow:hidden;">
      {addons_html}
    </table>
  </div>

  <!-- ═══ SCORE BREAKDOWN ═══ -->
  <div style="padding:24px 32px; border-bottom:1px solid #f3f4f6;">
    <h2 style="margin:0 0 12px; font-size:13px; font-weight:700;
               text-transform:uppercase; letter-spacing:0.06em; color:#374151;">
      📋 Score Breakdown
    </h2>
    <ul style="margin:0; padding-left:18px;">{reasons_html}</ul>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div style="padding:24px 32px; text-align:center; background:#f9fafb;">
    <p style="margin:0 0 6px; color:#6b7280; font-size:12px;">
      This report was generated by Bajaj Capital's automated motor insurance audit tool.
    </p>
    <p style="margin:0; color:#9ca3af; font-size:11px;">
      For advice, contact your Bajaj Capital advisor.
    </p>
  </div>

</div>
</body>
</html>"""
