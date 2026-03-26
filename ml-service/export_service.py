import xgboost as xgb
import numpy as np
import joblib
import os

BASE     = os.path.join(os.path.dirname(__file__), 'models')
_model   = xgb.XGBRegressor()
_model.load_model(os.path.join(BASE, 'export_model.json'))
_le_crop = joblib.load(os.path.join(BASE, 'le_crop_export.pkl'))

SUPPORTED_CROPS = ['Onion', 'Grapes', 'Mango', 'Wheat']

MIN_QTY_QT = {
    'Onion' : 100,
    'Grapes': 50,
    'Mango' : 30,
    'Wheat' : 200,
}

LAST_KNOWN = {
    'Onion' : {'price_lag': 2241.0,  'growth_rate': 0.142},
    'Grapes': {'price_lag': 9876.0,  'growth_rate': 0.089},
    'Mango' : {'price_lag': 12800.0, 'growth_rate': 0.115},
    'Wheat' : {'price_lag': 2450.0,  'growth_rate': 0.063},
}

COUNTRY_MULTIPLIERS = {
    'Onion': {
        'UAE'          : 1.18,
        'Malaysia'     : 1.05,
        'Saudi Arabia' : 1.20,
        'Bangladesh'   : 0.85,
        'Sri Lanka'    : 0.88,
        'UK'           : 1.32,
        'USA'          : 1.35,
        'Oman'         : 1.15,
        'Qatar'        : 1.22,
        'Kuwait'       : 1.19,
    },
    'Grapes': {
        'UAE'          : 1.25,
        'Malaysia'     : 1.10,
        'Saudi Arabia' : 1.28,
        'Bangladesh'   : 0.90,
        'Sri Lanka'    : 0.92,
        'UK'           : 1.45,
        'USA'          : 1.50,
        'Oman'         : 1.20,
        'Qatar'        : 1.30,
        'Kuwait'       : 1.22,
    },
    'Mango': {
        'UAE'          : 1.30,
        'Malaysia'     : 1.15,
        'Saudi Arabia' : 1.32,
        'Bangladesh'   : 0.88,
        'Sri Lanka'    : 0.90,
        'UK'           : 1.55,
        'USA'          : 1.60,
        'Oman'         : 1.25,
        'Qatar'        : 1.35,
        'Kuwait'       : 1.28,
    },
    'Wheat': {
        'UAE'          : 1.10,
        'Malaysia'     : 1.08,
        'Saudi Arabia' : 1.12,
        'Bangladesh'   : 0.92,
        'Sri Lanka'    : 0.94,
        'UK'           : 1.20,
        'USA'          : 1.18,
        'Oman'         : 1.08,
        'Qatar'        : 1.14,
        'Kuwait'       : 1.10,
    },
}

def check_eligibility(crop: str, grade: str, qty_qt: int):
    issues  = []
    min_qty = MIN_QTY_QT.get(crop, 50)

    if qty_qt < min_qty:
        issues.append(
            f"Minimum {min_qty} quintals required for APEDA export "
            f"(you have {qty_qt})"
        )
    if grade and grade != 'Grade A':
        issues.append(
            f"Grade A required for export (your produce: {grade})"
        )
    return {'eligible': len(issues) == 0, 'issues': issues}

def predict_export_premium(
    crop_name     : str,
    domestic_price: float,
    qty_qt        : int   = 100,
    grade         : str   = 'Grade A',
    year          : int   = 2026,
    qty_mt        : float = None,
    destination   : str   = 'UAE'
):
    if crop_name not in SUPPORTED_CROPS:
        raise ValueError(
            f"Crop '{crop_name}' not supported. "
            f"Supported: {SUPPORTED_CROPS}"
        )

    eligibility = check_eligibility(crop_name, grade, qty_qt)

    if qty_mt is None:
        qty_mt = qty_qt / 10

    last      = LAST_KNOWN[crop_name]
    year_norm = (year - 1987) / (2023 - 1987)
    log_qty   = np.log1p(qty_mt)
    era       = 3

    features = np.array([[
        int(_le_crop.transform([crop_name])[0]),
        year,
        year_norm,
        era,
        log_qty,
        last['price_lag'],
        last['growth_rate']
    ]])

    base_export      = float(_model.predict(features)[0])
    multiplier       = COUNTRY_MULTIPLIERS.get(crop_name, {}).get(destination, 1.0)
    predicted_export = base_export * multiplier

    premium_rs  = predicted_export - domestic_price
    premium_pct = (premium_rs / domestic_price) * 100

    if not eligibility['eligible']:
        recommendation = 'NOT_ELIGIBLE'
        reason = ' | '.join(eligibility['issues'])
    elif premium_pct >= 25:
        recommendation = 'EXPORT'
        reason = (
            f"Export to {destination} fetches ₹{premium_rs:,.0f}/quintal more "
            f"({premium_pct:.1f}% premium) — strongly recommended"
        )
    elif premium_pct >= 10:
        recommendation = 'CONSIDER_EXPORT'
        reason = (
            f"Moderate {destination} export premium of {premium_pct:.1f}% "
            f"(₹{premium_rs:,.0f}/q) — viable if logistics allow"
        )
    else:
        recommendation = 'SELL_DOMESTIC'
        reason = (
            f"{destination} export premium insufficient ({premium_pct:.1f}%) "
            f"— domestic market more profitable"
        )

    return {
        'crop'               : crop_name,
        'grade'              : grade,
        'destination'        : destination,
        'quantity_qt'        : qty_qt,
        'domestic_price_qt'  : round(domestic_price),
        'predicted_export_qt': round(predicted_export),
        'base_export_qt'     : round(base_export),
        'country_multiplier' : multiplier,
        'premium_rs_qt'      : round(premium_rs),
        'premium_pct'        : round(premium_pct, 1),
        'export_eligible'    : eligibility['eligible'],
        'eligibility_issues' : eligibility['issues'],
        'recommendation'     : recommendation,
        'reason'             : reason,
        'earnings_comparison': {
            'quantity_qt'    : qty_qt,
            'domestic_total' : round(domestic_price * qty_qt),
            'export_total'   : round(predicted_export * qty_qt),
            'extra_income'   : round(premium_rs * qty_qt)
        }
    }