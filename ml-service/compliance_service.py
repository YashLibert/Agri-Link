EXPORT_STANDARDS = {
    'Onion': {
        'min_grade'         : 'Grade A',
        'max_moisture_pct'  : 86,
        'min_dry_matter_pct': 14,
        'prohibited_markets': [],
        'approved_countries': ['UAE', 'Malaysia', 'Sri Lanka', 'Bangladesh',
                               'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman'],
        'phytosanitary'     : 'Fumigation certificate required',
        'packaging'         : '25kg or 50kg jute/mesh bags',
        'mrls'              : 'As per importing country standards',
        'apeda_certified'   : True
    },
    'Grapes': {
        'min_grade'         : 'Grade A',
        'min_brix'          : 16,
        'max_so2_ppm'       : 10,
        'approved_countries': ['UAE', 'Netherlands', 'UK', 'Germany',
                               'Bangladesh', 'Saudi Arabia'],
        'phytosanitary'     : 'SO2 fumigation + phytosanitary certificate',
        'packaging'         : 'Corrugated boxes 4-5 kg with SO2 pads',
        'mrls'              : 'EU MRL compliance required for Europe',
        'apeda_certified'   : True
    },
    'Mango': {
        'min_grade'         : 'Grade A',
        'varieties_allowed' : ['Alphonso', 'Kesar', 'Totapuri', 'Banganapalli'],
        'approved_countries': ['UAE', 'UK', 'USA', 'Canada', 'Australia',
                               'Japan', 'South Korea'],
        'phytosanitary'     : 'Vapor heat treatment (VHT) for USA/Australia',
        'packaging'         : 'Corrugated boxes 3-5 kg',
        'mrls'              : 'Country-specific MRL compliance',
        'apeda_certified'   : True
    },
    'Wheat': {
        'min_grade'         : 'Grade A',
        'min_protein_pct'   : 11,
        'max_moisture_pct'  : 12,
        'approved_countries': ['Bangladesh', 'Sri Lanka', 'Indonesia',
                               'Philippines', 'Vietnam', 'Yemen'],
        'phytosanitary'     : 'Fumigation + phytosanitary certificate',
        'packaging'         : 'Bulk or 50kg bags',
        'mrls'              : 'As per importing country standards',
        'apeda_certified'   : True
    }
}

def check_compliance(crop: str, grade: str, destination: str = 'domestic'):
    if crop not in EXPORT_STANDARDS:
        return {
            'crop'      : crop,
            'eligible'  : False,
            'reason'    : f"Crop '{crop}' not in APEDA export standards database",
            'standards' : None
        }

    std = EXPORT_STANDARDS[crop]

    issues = []
    if grade != std['min_grade']:
        issues.append(f"{std['min_grade']} required — you have {grade}")

    destination_approved = (
        destination == 'domestic' or
        any(destination.lower() in c.lower()
            for c in std.get('approved_countries', []))
    )

    if not destination_approved and destination != 'domestic':
        issues.append(
            f"{destination} not in approved countries list. "
            f"Approved: {', '.join(std.get('approved_countries', []))}"
        )

    return {
        'crop'               : crop,
        'grade'              : grade,
        'destination'        : destination,
        'eligible'           : len(issues) == 0,
        'issues'             : issues,
        'standards'          : {
            'phytosanitary'  : std.get('phytosanitary'),
            'packaging'      : std.get('packaging'),
            'mrls'           : std.get('mrls'),
            'approved_countries': std.get('approved_countries', [])
        }
    }