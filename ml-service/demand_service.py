import xgboost as xgb
import numpy as np
import joblib
import datetime
import os

BASE      = os.path.join(os.path.dirname(__file__), 'models')
_model    = xgb.XGBClassifier()
_model.load_model(os.path.join(BASE, 'demand_model.json'))
_le_crop  = joblib.load(os.path.join(BASE, 'le_crop_demand.pkl'))
_le_city  = joblib.load(os.path.join(BASE, 'le_city_demand.pkl'))

CITIES           = ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Solapur']
PRODUCTION_CROPS = ['Onion', 'Potato', 'Tomato']
LABEL_MAP        = {0: 'LOW', 1: 'MEDIUM', 2: 'HIGH'}
ADVICE_MAP       = {
    'LOW'   : 'Oversupply expected — consider selling now or cold storage',
    'MEDIUM': 'Stable market — sell at current price',
    'HIGH'  : 'Strong demand expected — hold if possible, price likely rising'
}

def get_season(month):
    if   month in [6,7,8,9,10]:   return 1
    elif month in [11,12,1,2,3]:  return 2
    else:                          return 3

def predict_demand(crop_name: str, days_ahead: int = 7):
    if crop_name not in PRODUCTION_CROPS:
        raise ValueError(
            f"Crop '{crop_name}' not supported. "
            f"Supported: {PRODUCTION_CROPS}"
        )

    target      = datetime.date.today() + datetime.timedelta(days=days_ahead)
    month       = target.month
    year        = target.year
    day_of_year = target.timetuple().tm_yday
    weekday     = target.weekday()
    quarter     = (month - 1) // 3 + 1
    season      = get_season(month)

    results = []
    for city in CITIES:
        try:
            crop_enc = int(_le_crop.transform([crop_name])[0])
            city_enc = int(_le_city.transform([city])[0])
        except ValueError:
            continue

        features   = np.array([[
            crop_enc, city_enc, month, year,
            day_of_year, weekday, quarter, season
        ]])
        pred_class = int(_model.predict(features)[0])
        pred_proba = _model.predict_proba(features)[0]
        demand     = LABEL_MAP[pred_class]

        results.append({
            'city'      : city,
            'demand'    : demand,
            'confidence': round(float(pred_proba[pred_class]) * 100, 1),
            'advice'    : ADVICE_MAP[demand],
            'probabilities': {
                'LOW'   : round(float(pred_proba[0]) * 100, 1),
                'MEDIUM': round(float(pred_proba[1]) * 100, 1),
                'HIGH'  : round(float(pred_proba[2]) * 100, 1),
            }
        })

    best = max(results, key=lambda x: x['confidence'])
    best['top_city'] = True

    return {
        'crop'      : crop_name,
        'date'      : str(target),
        'days_ahead': days_ahead,
        'cities'    : results,
        'summary'   : {
            'high_demand_cities'  : [r['city'] for r in results if r['demand'] == 'HIGH'],
            'low_demand_cities'   : [r['city'] for r in results if r['demand'] == 'LOW'],
            'overall_outlook'     : best['demand'],
        }
    }