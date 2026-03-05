from app.templates.logo_utils import logo_img_tag

def build_health_report_html(data: dict) -> str:
    """
    Builds the HTML string for the health insurance audit report.
    Used by BOTH the email endpoint (as body) and the PDF endpoint (rendered via WeasyPrint).

    WeasyPrint notes:
    - Does NOT support display:flex / grid — use tables only
    - border-radius on <td> is NOT supported by WeasyPrint — use CSS class on a <div> wrapper
    - Score circle uses display:table / display:table-cell via CSS class (most reliable in WeasyPrint)
    - Inline border-radius on <td> is ignored by WeasyPrint
    """

    # --- Core fields ---
    customer_name = data.get("customer_name", "there")
    mode_badge = ""
    mode = data.get("mode", "estimated")
    if mode == "verified":
        mode_badge = "<span style='background:#d1fae5; color:#065f46; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;'>&#10003; Verified Mode</span>"

    # --- Score color ---
    score = data.get("score", 0)
    if score >= 75:
        score_color = "#22c55e"
    elif score >= 50:
        score_color = "#f59e0b"
    else:
        score_color = "#ef4444"

    # --- Status badge ---
    def status_badge(status: str) -> str:
        colors = {
            "green": ("#dcfce7", "#16a34a", "✓"),
            "amber": ("#fef9c3", "#b45309", "⚠"),
            "red":   ("#fee2e2", "#dc2626", "✗"),
        }
        bg, fg, icon = colors.get(status, ("#f3f4f6", "#6b7280", "–"))
        return (
            f"<span style='background:{bg}; color:{fg}; font-weight:700; "
            f"padding:3px 12px; border-radius:12px; font-size:12px;'>{icon}</span>"
        )

    # --- Priority pill ---
    def priority_pill(priority: str) -> str:
        colors = {"primary": "#dc2626", "secondary": "#d97706", "tertiary": "#2563eb"}
        bg = colors.get(priority, "#6b7280")
        return (
            f"<span style='background:{bg}; color:#fff; font-size:10px; font-weight:700; "
            f"padding:2px 10px; border-radius:10px; text-transform:uppercase; "
            f"letter-spacing:0.5px;'>{priority}</span>"
        )

    # --- Currency formatter ---
    def fmt_inr(val) -> str:
        if val is None:
            return "N/A"
        try:
            val = float(val)
        except (ValueError, TypeError):
            return "N/A"
            
        if val >= 10_000_000:
            return f"&#8377;{val / 10_000_000:.1f} Cr"
        if val >= 100_000:
            return f"&#8377;{val / 100_000:.1f} Lakh"
        return f"&#8377;{val:,.0f}"

    # --- Waiting periods ---
    wp = data.get("waiting_periods", {})
    waiting_str = (
        f"{wp.get('initial_days', '—')} days initial &nbsp;|&nbsp; "
        f"{wp.get('ped_months', '—')} months PED &nbsp;|&nbsp; "
        f"{wp.get('specific_months', '—')} months specific"
    )

    # --- Sub-limits ---
    sub_limits = data.get("sub_limits", [])
    sub_limits_str = ", ".join(sub_limits) if sub_limits else "None"

    # --- Family label ---
    floater_label = (
        f"Family Floater &mdash; {data.get('members_covered', '?')} members"
        if data.get("is_family_floater") else "Individual"
    )

    # --- Comparison rows ---
    comparison_rows = data.get("comparison_rows", [])
    rows_html = ""
    for i, row in enumerate(comparison_rows):
        row_bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
        status = row.get("status", "")
        action_bg = {"green": "#f0fdf4", "amber": "#fffbeb", "red": "#fef2f2"}.get(status, "#f9fafb")
        action_color = {"green": "#15803d", "amber": "#92400e", "red": "#991b1b"}.get(status, "#374151")

        rows_html += f"""
        <tr style="background:{row_bg};">
          <td style="padding:14px 16px; font-size:13px; color:#111827; font-weight:600;
                     border-bottom:1px solid #e5e7eb; vertical-align:top; width:22%;">
            {row.get('dimension', '')}
          </td>
          <td style="padding:14px 16px; font-size:13px; color:#4b5563;
                     border-bottom:1px solid #e5e7eb; vertical-align:top; width:22%;">
            {row.get('your_need', '')}
          </td>
          <td style="padding:14px 16px; font-size:13px; color:#111827;
                     border-bottom:1px solid #e5e7eb; vertical-align:top; width:34%;">
            {row.get('your_policy', '')}
          </td>
          <td style="padding:14px 16px; text-align:center;
                     border-bottom:1px solid #e5e7eb; vertical-align:top; width:12%;">
            {status_badge(status)}
          </td>
        </tr>
        <tr style="background:{action_bg};">
          <td colspan="4" style="padding:8px 16px 14px 16px; font-size:12px;
                                  color:{action_color}; border-bottom:2px solid #e5e7eb;">
            <strong>Recommendation:</strong> {row.get('recommended_action', '')}
          </td>
        </tr>
        """

    # --- Recommendations ---
    recommendations = data.get("recommendations", [])
    recs_html = ""
    for rec in recommendations:
        priority = rec.get("priority", "tertiary")
        border_colors = {"primary": "#dc2626", "secondary": "#d97706", "tertiary": "#2563eb"}
        border_c = border_colors.get(priority, "#e5e7eb")
        recs_html += f"""
        <tr>
          <td style="padding:16px 18px; border-bottom:1px solid #e5e7eb;
                     border-left:4px solid {border_c};">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding-bottom:6px;">{priority_pill(priority)}</td>
              </tr>
              <tr>
                <td style="font-size:14px; font-weight:700; color:#111827; padding-bottom:4px;">
                  {rec.get('title', '')}
                </td>
              </tr>
              <tr>
                <td style="font-size:13px; color:#6b7280; line-height:1.5;">
                  {rec.get('description', '')}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Health Insurance Audit &mdash; {data.get('customer_name', 'Report')}</title>
<style>
  body {{ background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; }}
</style>
</head>
<body>

<table cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background:#f1f5f9; padding:4px 16px 20px 16px;">
  <tr>
    <td align="center">

      <!-- Outer card -->
      <table cellpadding="0" cellspacing="0" border="0" width="640"
             style="max-width:640px; background:#ffffff; border-radius:16px;
                    overflow:hidden; border:1px solid #e2e8f0;">

        <!-- ── HEADER ── -->
        <tr>
          <td align="center"
              style="background:#ffffff; padding:10px 12px 10px 12px; border-bottom:2px solid #e2e8f0;">
            {logo_img_tag(200)}
            <h1 style="margin:2px 0 4px; color:#0f172a; font-size:20px; font-weight:700;">🏥 Health Insurance Audit</h1>
            <p style="margin:4px 0 0; color:#475569; font-size:13px;">Prepared for {customer_name}</p>
            {mode_badge}
            <p style="margin:4px 0 0; font-size:13px; color:#64748b;">
              {data.get('insurer_name', '')}
            </p>
            <p style="margin:2px 0 0; font-size:12px; color:#94a3b8;">
              {data.get('plan_name', '')}
            </p>
            <p style="margin:4px 0 0; font-size:11px; color:#94a3b8;">
              Policy No: {data.get('policy_number', '—')} &nbsp;&middot;&nbsp;
              Tenure: {data.get('policy_tenure', '—')}
            </p>
          </td>
        </tr>

        <!-- ── SCORE CIRCLE ── -->
        <tr>
          <td align="center" style="padding:40px 32px 12px 32px; background:#ffffff;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
              <tr>
                <td width="104" height="104" align="center" valign="middle"
                    style="width:104px; height:104px; border-radius:50%;
                           border:5px solid {score_color}; text-align:center;">
                  <span style="font-size:36px; font-weight:800;
                               color:{score_color}; line-height:1;">{score}</span><span 
                        style="font-size:16px; font-weight:700; color:{score_color};">/100</span>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 4px 0; font-size:11px; color:#94a3b8;
                      text-transform:uppercase; letter-spacing:1.5px; font-weight:600;">
              Policy Health Score
            </p>
          </td>
        </tr>

        <!-- ── SNAPSHOT GRID ── -->
        <tr>
          <td style="padding:28px 32px 24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0;">
              <tr>
                <td width="25%" style="padding:20px 18px; border-right:1px solid #e2e8f0;
                                        border-bottom:1px solid #e2e8f0; vertical-align:top;">
                  <p style="font-size:10px; color:#94a3b8; text-transform:uppercase;
                             letter-spacing:0.8px; font-weight:600; margin-bottom:8px;">Sum Insured</p>
                  <p style="font-size:14px; font-weight:800; color:#0f172a; white-space:nowrap;">{fmt_inr(data.get('sum_insured', 0))}</p>
                </td>
                <td width="25%" style="padding:16px 12px; border-right:1px solid #e2e8f0;
                                        border-bottom:1px solid #e2e8f0; vertical-align:top;">
                  <p style="font-size:10px; color:#94a3b8; text-transform:uppercase;
                             letter-spacing:0.8px; font-weight:600; margin-bottom:8px;">Ideal Cover</p>
                  <p style="font-size:14px; font-weight:800; color:#0ea5e9; white-space:nowrap;">{fmt_inr(data.get('ideal_cover', 0))}</p>
                </td>
                <td width="25%" style="padding:16px 12px; border-right:1px solid #e2e8f0;
                                        border-bottom:1px solid #e2e8f0; vertical-align:top;">
                  <p style="font-size:10px; color:#94a3b8; text-transform:uppercase;
                             letter-spacing:0.8px; font-weight:600; margin-bottom:8px;">Annual Premium</p>
                  <p style="font-size:14px; font-weight:800; color:#0f172a; white-space:nowrap;">{fmt_inr(data.get('premium', 0))}/yr</p>
                </td>
                <td width="25%" style="padding:20px 18px; border-bottom:1px solid #e2e8f0; vertical-align:top;">
                  <p style="font-size:10px; color:#94a3b8; text-transform:uppercase;
                             letter-spacing:0.8px; font-weight:600; margin-bottom:8px;">Coverage Type</p>
                  <p style="font-size:13px; font-weight:700; color:#0f172a;">{floater_label}</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:16px 18px; border-right:1px solid #e2e8f0; vertical-align:top;">
                  <p style="font-size:10px; color:#94a3b8; text-transform:uppercase;
                             letter-spacing:0.8px; font-weight:600; margin-bottom:6px;">Room Rent</p>
                  <p style="font-size:13px; font-weight:600; color:#1e293b;">{data.get('room_rent_limit', '—')}</p>
                </td>
                <td colspan="2" style="padding:16px 18px; vertical-align:top;">
                  <p style="font-size:10px; color:#94a3b8; text-transform:uppercase;
                             letter-spacing:0.8px; font-weight:600; margin-bottom:6px;">Co-pay / Deductible</p>
                  <p style="font-size:13px; font-weight:600; color:#1e293b;">
                    {data.get('copay_percentage', 0)}% co-pay &nbsp;/&nbsp;
                    {fmt_inr(data.get('deductible', 0)) if data.get('deductible', 0) > 0 else 'No deductible'}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── POLICY DETAILS ── -->
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
              <tr>
                <td colspan="2"
                    style="padding:13px 18px; background:#f1f5f9;
                           font-size:10px; font-weight:700; color:#475569;
                           text-transform:uppercase; letter-spacing:1px;">
                  Policy Details
                </td>
              </tr>
              <tr>
                <td style="padding:13px 18px; font-size:12px; color:#64748b;
                           border-top:1px solid #e2e8f0; width:36%;">Waiting Periods</td>
                <td style="padding:13px 18px; font-size:13px; color:#0f172a; font-weight:600;
                           border-top:1px solid #e2e8f0;">{waiting_str}</td>
              </tr>
              <tr>
                <td style="padding:13px 18px; font-size:12px; color:#64748b;
                           border-top:1px solid #e2e8f0;">Restoration</td>
                <td style="padding:13px 18px; font-size:13px; color:#0f172a; font-weight:600;
                           border-top:1px solid #e2e8f0;">
                  {'Yes &mdash; ' + data.get('restoration_type', '') if data.get('restoration_present') else 'Not included'}
                </td>
              </tr>
              <tr>
                <td style="padding:13px 18px; font-size:12px; color:#64748b;
                           border-top:1px solid #e2e8f0;">NCB</td>
                <td style="padding:13px 18px; font-size:13px; color:#0f172a; font-weight:600;
                           border-top:1px solid #e2e8f0;">
                  {data.get('ncb_percentage', 0)}% per year (max {data.get('ncb_max_percentage', 0)}%)
                </td>
              </tr>
              <tr>
                <td style="padding:13px 18px; font-size:12px; color:#64748b;
                           border-top:1px solid #e2e8f0;">Sub-limits</td>
                <td style="padding:13px 18px; font-size:13px; color:#0f172a; font-weight:600;
                           border-top:1px solid #e2e8f0;">{sub_limits_str}</td>
              </tr>
              <tr>
                <td style="padding:13px 18px; font-size:12px; color:#64748b;
                           border-top:1px solid #e2e8f0;">Global Coverage</td>
                <td style="padding:13px 18px; font-size:13px; color:#0f172a; font-weight:600;
                           border-top:1px solid #e2e8f0;">
                  {'Included' if data.get('global_health_coverage') else 'Not included'}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── COVERAGE ANALYSIS ── -->
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <p style="margin:0 0 12px 0; font-size:12px; font-weight:700; color:#0f172a;
                      text-transform:uppercase; letter-spacing:1px;">Coverage Analysis</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;
                          border-collapse:collapse;">
              <tr style="background:#f1f5f9;">
                <th style="padding:12px 16px; font-size:10px; font-weight:700; color:#475569;
                           text-align:left; text-transform:uppercase; letter-spacing:0.8px;
                           border-bottom:2px solid #e2e8f0;" width="22%">Dimension</th>
                <th style="padding:12px 16px; font-size:10px; font-weight:700; color:#475569;
                           text-align:left; text-transform:uppercase; letter-spacing:0.8px;
                           border-bottom:2px solid #e2e8f0;" width="22%">Your Need</th>
                <th style="padding:12px 16px; font-size:10px; font-weight:700; color:#475569;
                           text-align:left; text-transform:uppercase; letter-spacing:0.8px;
                           border-bottom:2px solid #e2e8f0;" width="44%">Your Policy</th>
                <th style="padding:12px 16px; font-size:10px; font-weight:700; color:#475569;
                           text-align:center; text-transform:uppercase; letter-spacing:0.8px;
                           border-bottom:2px solid #e2e8f0;" width="12%">Status</th>
              </tr>
              {rows_html}
            </table>
          </td>
        </tr>

        <!-- ── RECOMMENDATIONS ── -->
        <tr>
          <td style="padding:0 32px 40px 32px;">
            <p style="margin:0 0 12px 0; font-size:12px; font-weight:700; color:#0f172a;
                      text-transform:uppercase; letter-spacing:1px;">Recommendations</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;
                          border-collapse:collapse;">
              {recs_html}
            </table>
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td align="center"
              style="padding:24px 32px; background:#f8fafc; border-top:1px solid #e2e8f0;
                     font-size:11px; color:#94a3b8; line-height:1.6;">
            This report is generated for informational purposes only.
          </td>
        </tr>

      </table>
      <!-- /card -->

    </td>
  </tr>
</table>

</body>
</html>"""
    return html