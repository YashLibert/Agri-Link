from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from price_service            import predict_prices
from demand_service           import predict_demand
from export_service           import predict_export_premium
from compliance_service       import check_compliance
from export_readiness_service import get_export_readiness
import os, uvicorn

app = FastAPI(
    title       = "AgriLink ML Service",
    description = "Price prediction, demand forecasting, export premium, compliance and export readiness",
    version     = "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"]
)

REQUIRED_MODELS = [
    'price_model.json',
    'le_crop.pkl',
    'le_city.pkl',
    'demand_model.json',
    'le_crop_demand.pkl',
    'le_city_demand.pkl',
    'export_model.json',
    'le_crop_export.pkl',
]

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
missing    = [f for f in REQUIRED_MODELS
              if not os.path.exists(os.path.join(MODELS_DIR, f))]

if missing:
    print("WARNING — Missing model files:")
    for f in missing:
        print(f"  x {f}")
else:
    print("All model files present — starting server")


# ── existing routes (unchanged) ────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status" : "ok",
        "service": "AgriLink ML",
        "version": "1.0.0",
        "models" : ["price", "demand", "export_premium", "compliance", "export_readiness"]
    }

@app.get("/predict-price")
def predict_price(
    crop      : str = Query(..., description="Crop name e.g. Onion"),
    days_ahead: int = Query(0,   description="Days into future (0=today)")
):
    try:
        return predict_prices(crop, days_ahead)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/demand-forecast")
def demand_forecast(
    crop      : str = Query(..., description="Crop name e.g. Onion"),
    days_ahead: int = Query(7,   description="Days ahead for forecast")
):
    try:
        return predict_demand(crop, days_ahead)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export-premium")
def export_premium(
    crop          : str   = Query(...,       description="Crop name"),
    domestic_price: float = Query(...,       description="Domestic price per quintal"),
    qty_qt        : int   = Query(100,       description="Quantity in quintals"),
    grade         : str   = Query('Grade A', description="Produce grade"),
    year          : int   = Query(2026,      description="Year for prediction"),
    destination   : str   = Query('UAE',     description="Export destination country")
):
    try:
        return predict_export_premium(
            crop, domestic_price, qty_qt,
            grade, year, destination=destination
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/compliance-check")
def compliance(
    crop       : str = Query(...,        description="Crop name"),
    grade      : str = Query('Grade A',  description="Produce grade"),
    destination: str = Query('domestic', description="Export destination country")
):
    try:
        return check_compliance(crop, grade, destination)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/grade")
async def grade(file: UploadFile = File(...)):
    return {
        "grade"          : "Grade A",
        "confidence"     : 88.5,
        "export_eligible": True,
        "scores"         : {
            "Grade A": 88.5,
            "Grade B": 8.2,
            "Grade C": 3.3
        },
        "note": "Placeholder — grading model integration pending"
    }


# ── new: export readiness ──────────────────────────────────────────────────────

class ExportReadinessRequest(BaseModel):
    crop                 : str
    country              : str
    origin_district      : str
    quantity_quintals    : int
    pesticides_used      : Optional[List[str]] = None
    days_since_last_spray: int = 14
    demanded_price_per_quintal: Optional[float] = None

@app.post("/export-readiness")
def export_readiness(req: ExportReadinessRequest):
    try:
        return get_export_readiness(
            crop                  = req.crop,
            country               = req.country,
            origin_district       = req.origin_district,
            quantity_quintals     = req.quantity_quintals,
            pesticides_used       = req.pesticides_used,
            days_since_last_spray = req.days_since_last_spray,
            demanded_price_per_quintal = req.demanded_price_per_quintal,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)