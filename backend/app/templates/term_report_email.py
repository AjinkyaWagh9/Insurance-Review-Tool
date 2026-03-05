from app.templates.logo_utils import logo_img_tag

def build_term_report_html(data: dict) -> str:
    """
    Builds the HTML email body for the Term Insurance Audit Report.
    All values come from the request body sent by the frontend.
    """

    # Helper: format rupee values
    def fmt(val):
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

    # Pull values with safe defaults
    customer_name   = data.get("customer_name", "there")
    score           = data.get("score", 0)
    ideal_cover     = fmt(data.get("ideal_cover", 0))
    your_cover      = fmt(data.get("your_cover", 0))
    shortfall       = fmt(data.get("shortfall", 0))
    coverage_status = data.get("coverage_status", "")
    insurer_name    = data.get("insurer_name", "Unknown")
    riders_present  = data.get("riders_present", [])
    missing_riders  = data.get("missing_riders", [])
    score_reasons   = data.get("score_reasons", [])
    term_end_age    = data.get("policy_term_end_age")
    reliability_score = data.get("insurer_reliability_score", "N/A")
    mode            = data.get("mode", "estimated")

    # Score color
    if score >= 70:
        score_color = "#10b981"   # green
        score_label = "Strong"
    elif score >= 40:
        score_color = "#f59e0b"   # amber
        score_label = "Needs Attention"
    else:
        score_color = "#ef4444"   # red
        score_label = "Critical Gaps"

    # Riders HTML
    riders_html = ""
    if riders_present:
        riders_html += "<p style='margin:4px 0; color:#6b7280; font-size:13px;'>✅ Present:</p>"
        for r in riders_present:
            riders_html += f"<span style='display:inline-block; background:#d1fae5; color:#065f46; padding:3px 10px; border-radius:20px; font-size:12px; margin:3px 3px 0 0;'>{r}</span>"
    if missing_riders:
        riders_html += "<p style='margin:10px 0; color:#6b7280; font-size:13px;'>⚠️ Suggested:</p>"
        for r in missing_riders:
            riders_html += f"<span style='display:inline-block; background:#ede9fe; color:#5b21b6; padding:3px 10px; border-radius:20px; font-size:12px; margin:3px 3px 0 0;'>{r}</span>"

    # Score reasons HTML
    reasons_html = ""
    for reason in score_reasons:
        reasons_html += f"<li style='margin:4px 0; color:#374151; font-size:13px;'>{reason}</li>"

    # Mode badge
    mode_badge = ""
    if mode == "verified":
        mode_badge = "<span style='background:#d1fae5; color:#065f46; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;'>✓ Verified Mode</span>"

    # Term end row
    term_row = ""
    if term_end_age:
        term_row = f"""
        <tr>
          <td style='padding:10px 12px; color:#6b7280; font-size:13px; border-bottom:1px solid #f3f4f6;'>Term Ends At</td>
          <td style='padding:10px 12px; font-weight:600; font-size:13px; border-bottom:1px solid #f3f4f6;'>Age {term_end_age}</td>
        </tr>"""

    # Structural Health Section (only if insurer is known)
    structural_health_html = ""
    if insurer_name and insurer_name != "Unknown":
        structural_health_html = f"""
    <div style='padding:24px 32px; border-bottom:1px solid #f3f4f6;'>
      <h2 style='margin:0 0 16px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#374151;'>🏦 Structural Policy Health</h2>
      <table style='width:100%; border-collapse:collapse; background:#f9fafb; border-radius:10px; overflow:hidden;'>
        <tr>
          <td style='padding:10px 12px; color:#6b7280; font-size:13px; border-bottom:1px solid #f3f4f6;'>Insurer</td>
          <td style='padding:10px 12px; font-weight:600; font-size:13px; border-bottom:1px solid #f3f4f6;'>{insurer_name}</td>
        </tr>
        <tr>
          <td style='padding:10px 12px; color:#6b7280; font-size:13px; border-bottom:1px solid #f3f4f6;'>Insurer Reliability Score</td>
          <td style='padding:10px 12px; font-weight:600; font-size:13px; border-bottom:1px solid #f3f4f6;'>{reliability_score} / 10</td>
        </tr>
        {term_row}
      </table>
      <div style='margin-top:16px;'>{riders_html}</div>
    </div>"""

    # Score Breakdown Section
    score_breakdown_html = ""
    if score_reasons:
        score_breakdown_html = f"""
    <div style='padding:24px 32px; border-bottom:1px solid #f3f4f6;'>
      <h2 style='margin:0 0 12px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#374151;'>📋 Score Breakdown</h2>
      <ul style='margin:0; padding-left:18px;'>{reasons_html}</ul>
    </div>"""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <div style="max-width:560px; margin:4px auto 32px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:#ffffff; padding:8px 32px 16px 32px; text-align:center; border-bottom:2px solid #e2e8f0;">
      {logo_img_tag(200)}
      <h1 style="margin:10px 0 4px; color:#0f172a; font-size:22px; font-weight:700;">🛡 Term Insurance Audit</h1>
      <p style="margin:4px 0 0; color:#475569; font-size:13px;">Prepared for {customer_name}</p>
      {mode_badge}
    </div>

    <!-- Score -->
    <div style="padding:28px 32px; text-align:center; border-bottom:1px solid #f3f4f6;">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
        <tr>
          <td width="88" height="88" align="center" valign="middle"
              style="width:88px; height:88px; border-radius:50%; border:4px solid {score_color};">
            <span style="font-size:32px; font-weight:800; color:{score_color}; line-height:1;">{score}</span>
          </td>
        </tr>
      </table>
      <p style="margin:0; color:#6b7280; font-size:11px; text-transform:uppercase; letter-spacing:0.08em;">Your Policy Score</p>
      <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:{score_color};">{score_label}</p>
    </div>

    <!-- Coverage Gap -->
    <div style="padding:24px 32px; border-bottom:1px solid #f3f4f6;">
      <h2 style="margin:0 0 16px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#374151;">📊 Income Protection Gap</h2>
      <table style="width:100%; border-collapse:collapse; background:#f9fafb; border-radius:10px; overflow:hidden;">
        <tr>
          <td style='padding:10px 12px; color:#6b7280; font-size:13px; border-bottom:1px solid #f3f4f6;'>{mode.capitalize()} Ideal Cover</td>
          <td style='padding:10px 12px; font-weight:700; font-size:13px; white-space:nowrap; color:#0f172a; border-bottom:1px solid #f3f4f6;'>{ideal_cover}</td>
        </tr>
        <tr>
          <td style='padding:10px 12px; color:#6b7280; font-size:13px; border-bottom:1px solid #f3f4f6;'>Your Current Cover</td>
          <td style='padding:10px 12px; font-weight:700; font-size:13px; white-space:nowrap; color:#f59e0b; border-bottom:1px solid #f3f4f6;'>{your_cover}</td>
        </tr>
        <tr>
          <td style='padding:10px 12px; color:#6b7280; font-size:13px; border-bottom:1px solid #f3f4f6;'>Coverage Status</td>
          <td style='padding:10px 12px; font-weight:600; font-size:13px; border-bottom:1px solid #f3f4f6;'>{coverage_status}</td>
        </tr>
        <tr>
          <td style='padding:12px 12px; color:#6b7280; font-size:13px;'>Shortfall</td>
          <td style='padding:12px 12px; font-weight:800; font-size:15px; white-space:nowrap; color:#ef4444;'>{shortfall}</td>
        </tr>
      </table>
    </div>

    {structural_health_html}
    {score_breakdown_html}

    <!-- Footer -->
    <div style="padding:24px 32px; text-align:center; background:#f9fafb;">
      <p style="margin:0 0 8px; color:#6b7280; font-size:12px;">This report was generated by Bajaj Capital's automated term insurance audit tool.</p>
      <p style="margin:0; color:#9ca3af; font-size:11px;">For advice, contact your Bajaj Capital advisor.</p>
    </div>

  </div>
</body>
</html>
"""
