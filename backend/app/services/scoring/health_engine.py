"""
Health Insurance Scoring Engine — RULEBOOK v2.0
Calculates the policy score entirely on the backend.
The frontend must NEVER calculate a score — it only displays policy_score.
"""

from app.core.rules.health_rules import HEALTH_SCORING_CONFIG


def calculate_health_score(extracted: dict, user_prefs: dict) -> tuple:
    """
    Calculate a 0–100 health policy score and a label.

    Args:
        extracted: Dict with fields from the PDF extraction (insurer_name, sum_insured,
                   room_rent_limit, copay_percentage, restoration_present,
                   waiting_periods, sub_limits, icr_value, zone_of_cover, has_zonal_copay).
        user_prefs: Dict with user preferences (age, city, family_type, members,
                    room_preference, child_planning, family_history).

    Returns:
        (score: int, label: str) where label is 'Strong' | 'Needs Attention' | 'Critical Gaps'.
    """
    config = HEALTH_SCORING_CONFIG
    score = config['global']['start_score']

    # 1. ICR Score
    icr = extracted.get('icr_value')
    if icr is not None:
        for tier in config['icr']['tiers']:
            if icr <= tier['max']:
                score += tier['score']
                break

    # 2. Sum Insured
    si = extracted.get('sum_insured', 0) or 0
    si_score = config['sum_insured']['default']
    for tier in config['sum_insured']['tiers']:
        if si >= tier['min']:
            si_score = tier['score']
            break
    score += si_score

    # 3. Room Rent
    room = (extracted.get('room_rent_limit') or '').lower()
    rr_cfg = config['room_rent']
    if 'no limit' in room or 'any room' in room:
        score += rr_cfg['no_limit']
    elif 'single private' in room:
        score += rr_cfg['single_private']
    elif '%' in room or 'cap' in room:
        score += rr_cfg['capped']
    else:
        score += rr_cfg['default']

    # 4. Co-pay
    copay = extracted.get('copay_percentage', 0) or 0
    score += config['copay']['base_no_copay'] if copay == 0 else config['copay']['base_has_copay']

    # 5. Restoration
    score += config['restoration']['present'] if extracted.get('restoration_present') else config['restoration']['missing']

    # 6. PED Waiting Period
    ped = (extracted.get('waiting_periods') or {}).get('ped_months', 48)
    wp_cfg = config['ped_waiting']
    if ped <= 24:
        score += wp_cfg['months_24']
    elif ped <= 36:
        score += wp_cfg['months_36']
    elif ped <= 48:
        score += wp_cfg['months_48']
    else:
        score += wp_cfg['months_gt_48']

    # 7. Sub-limits
    sub_limits = extracted.get('sub_limits') or []
    sl_cfg = config['sub_limits']
    if len(sub_limits) == 0:
        score += sl_cfg['none']
    elif len(sub_limits) <= 2:
        score += sl_cfg['minor']
    elif len(sub_limits) <= 5:
        score += sl_cfg['several']
    else:
        score += sl_cfg['many_critical']

    # 8. Geo Coverage
    zone = (extracted.get('zone_of_cover') or '').lower()
    has_zonal_copay = extracted.get('has_zonal_copay', False)
    geo_cfg = config['geo_cover']
    if ('pan' in zone or 'india' in zone or 'all' in zone) and not has_zonal_copay:
        score += geo_cfg['pan_india_no_copay']
    elif has_zonal_copay or 'partial' in zone:
        score += geo_cfg['partial_zonal_copay']
    elif 'restrict' in zone:
        score += geo_cfg['restricted']

    # Clamp to 0–100
    score = max(config['global']['min_score'], min(config['global']['max_score'], score))

    # Label
    if score >= 75:
        label = 'Strong'
    elif score >= 50:
        label = 'Needs Attention'
    else:
        label = 'Critical Gaps'

    return score, label
