"""
ICR (Incurred Claim Ratio) Database for Indian Health Insurers.
Source: IRDAI annual reports. Values are approximate and updated periodically.
"""

ICR_DATABASE = {
    'star health': 64.66,
    'hdfc ergo': 82.0,
    'hdfc ergo health': 82.0,
    'niva bupa': 91.0,
    'max bupa': 91.0,
    'care health': 55.0,
    'care insurance': 55.0,
    'icici lombard': 79.0,
    'bajaj allianz': 86.0,
    'united india': 110.0,
    'national insurance': 117.0,
    'new india assurance': 99.0,
    'oriental insurance': 112.0,
    'reliance health': 73.0,
    'aditya birla health': 68.0,
    'manipal cigna': 60.0,
    'manipalcigna': 60.0,
    'iffco tokio': 95.0,
    'future generali': 88.0,
    'royal sundaram': 77.0,
    'kotak general': 72.0,
    'go digit': 65.0,
    'acko': 55.0,
}


def get_icr(insurer_name: str) -> tuple:
    """
    Look up ICR for a given insurer name.
    Returns (icr_value, icr_rating) or (None, 'Unknown') if not found.
    """
    if not insurer_name:
        return None, 'Unknown'

    key = insurer_name.lower().strip()
    icr = ICR_DATABASE.get(key)

    # Fuzzy match: check if any key is a substring of the input or vice versa
    if icr is None:
        for k, v in ICR_DATABASE.items():
            if k in key or key in k:
                icr = v
                break

    if icr is None:
        return None, 'Unknown'

    tiers = [
        (60, 'Risky'),
        (70, 'Moderate Concern'),
        (77, 'Average'),
        (85, 'Good'),
        (100, 'Excellent'),
    ]
    for threshold, rating in tiers:
        if icr <= threshold:
            return icr, rating

    # > 100% — sustainability concern
    return icr, 'Risky'
