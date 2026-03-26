import xgboost as xgb
import pandas as pd
import joblib
import datetime
import os

BASE    = os.path.join(os.path.dirname(__file__), 'models')
_model  = xgb.XGBRegressor()
_model.load_model(os.path.join(BASE, 'price_model.json'))
_le_crop = joblib.load(os.path.join(BASE, 'le_crop.pkl'))
_le_city = joblib.load(os.path.join(BASE, 'le_city.pkl'))

CITIES = ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Solapur']

def get_season(month):
    if   month in [6,7,8,9,10]:   return 1
    elif month in [11,12,1,2,3]:  return 2
    else:                          return 3

def predict_prices(crop_name: str, days_ahead: int = 0):
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

        row = pd.DataFrame([{
            'crop_enc'   : crop_enc,
            'city_enc'   : city_enc,
            'month'      : month,
            'year'       : year,
            'day_of_year': day_of_year,
            'weekday'    : weekday,
            'quarter'    : quarter,
            'season'     : season,
            'grade_enc'  : 2,
            'price_spread': 300
        }])

        price = float(_model.predict(row)[0])
        results.append({
            'city': city,
            'predicted_price': round(price, 2)
        })

    if not results:
        raise ValueError(f"Crop '{crop_name}' not found in model")

    # Highest predicted price is the best market for a seller.
    ranked_results = sorted(results, key=lambda x: x['predicted_price'], reverse=True)
    best_result = ranked_results[0]
    cities = [
        {
            'city': item['city'],
            'price': item['predicted_price'],
            'predicted_price': item['predicted_price'],
            'recommended': item['city'] == best_result['city']
        }
        for item in ranked_results
    ]

    return {
        'crop': crop_name,
        'predictions': ranked_results,
        'cities': cities,
        'best_city': best_result['city'],
        'best_price': best_result['predicted_price'],
        'recommended_city': best_result['city'],
        'recommended_price': best_result['predicted_price'],
        'date': target.isoformat()
    }
