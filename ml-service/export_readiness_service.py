import json
import os
from typing import Optional

# Load data files
_BASE = os.path.dirname(__file__)
with open(os.path.join(_BASE, "phyto_data.json"))    as f: PHYTO    = json.load(f)
with open(os.path.join(_BASE, "logistics_data.json")) as f: LOGISTICS = json.load(f)


# ─────────────────────────────────────────────
#  PHYTOSANITARY RISK ENGINE
# ─────────────────────────────────────────────

def _phi_factor(days_since_spray: int, required_phi: int) -> dict:
    """Return a risk multiplier based on how close to PHI the farmer is."""
    if required_phi == 0:
        return {"multiplier": 0.3, "label": "No PHI concern"}
    ratio_pct = (days_since_spray / required_phi) * 100
    if ratio_pct >= 150:
        return {"multiplier": 0.3,  "label": "Well within PHI — residue decay likely complete"}
    elif ratio_pct >= 100:
        return {"multiplier": 0.6,  "label": "PHI met — residue within expected limits"}
    elif ratio_pct >= 70:
        return {"multiplier": 1.2,  "label": "Borderline — residue likely still present"}
    else:
        return {"multiplier": 2.0,  "label": "PHI violated — high residue risk"}


def _score_pesticide(pesticide: str, country: str, days_since_spray: int, crop: str, quantity_mt: float) -> dict:
    """Score a single pesticide against a target country's MRL standard with enhanced risk factors."""

    country_mrls = PHYTO["mrl_standards"].get(country, {})
    if pesticide not in country_mrls:
        return {
            "pesticide": pesticide,
            "risk_points": 0,
            "flag": "UNKNOWN",
            "note": f"No MRL data found for {pesticide} in {country} — assume moderate risk"
        }

    mrl_entry = country_mrls[pesticide]
    status     = mrl_entry["status"]
    limit      = mrl_entry["limit_mg_kg"]
    note       = mrl_entry["note"]

    # Get crop-specific PHI for this pesticide
    crop_data    = PHYTO["crop_pesticide_defaults"].get(crop, {})
    phi_map      = crop_data.get("phi_days", {})
    required_phi = phi_map.get(pesticide, 14)  # default 14 days if unknown

    phi_result = _phi_factor(days_since_spray, required_phi)

    # Enhanced base risk points from MRL limit (lower limit = higher base risk)
    if limit <= 0.01:
        base_points = 95  # Near-zero tolerance
    elif limit <= 0.05:
        base_points = 75  # Very strict
    elif limit <= 0.1:
        base_points = 55  # Strict
    elif limit <= 0.2:
        base_points = 35  # Moderate
    elif limit <= 0.5:
        base_points = 20  # Lenient
    else:
        base_points = 10  # Very lenient

    # Status modifier with enhanced penalties
    status_modifier = 0
    if status in ("banned", "banned_2020"):
        status_modifier = 25  # Severe penalty for banned substances
    elif status == "restricted":
        status_modifier = 15  # Moderate penalty for restricted

    # PHI modifier with quantity consideration
    phi_modifier = 0
    if phi_result["multiplier"] >= 2.0:
        phi_modifier = 20  # High risk for PHI violation
    elif phi_result["multiplier"] >= 1.5:
        phi_modifier = 10  # Moderate PHI risk

    # Quantity risk modifier (larger shipments = higher scrutiny)
    quantity_modifier = 0
    if quantity_mt > 50:
        quantity_modifier = 5  # Large shipments face more scrutiny
    elif quantity_mt > 20:
        quantity_modifier = 3

    # Crop-specific risk adjustments
    crop_risk_modifier = 0
    high_risk_crops = ["pomegranate", "banana", "grape"]  # Crops with stricter global standards
    if crop in high_risk_crops:
        crop_risk_modifier = 5

    # Calculate final risk score
    final_points = min(100, base_points + status_modifier + phi_modifier + quantity_modifier + crop_risk_modifier)

    # Enhanced risk level determination
    if final_points >= 80:
        risk_flag = "CRITICAL"
    elif final_points >= 60:
        risk_flag = "HIGH"
    elif final_points >= 40:
        risk_flag = "MEDIUM"
    elif final_points >= 20:
        risk_flag = "LOW"
    else:
        risk_flag = "VERY_LOW"

    return {
        "pesticide":      pesticide,
        "risk_points":    final_points,
        "mrl_limit":      f"{limit} mg/kg",
        "status":         status,
        "phi_required":   required_phi,
        "phi_status":     phi_result["label"],
        "quantity_mt":    quantity_mt,
        "flag":           risk_flag,
        "note":           note,
        "risk_factors": {
            "mrl_strictness": f"{limit} mg/kg limit",
            "status_penalty": f"{status_modifier} pts ({status})",
            "phi_penalty": f"{phi_modifier} pts ({phi_result['label']})",
            "quantity_penalty": f"{quantity_modifier} pts ({quantity_mt} MT)",
            "crop_penalty": f"{crop_risk_modifier} pts ({crop})"
        }
    }


def assess_phytosanitary_risk(
    crop: str,
    country: str,
    pesticides_used: Optional[list] = None,
    days_since_last_spray: int = 14,
    quantity_quintals: int = 100
) -> dict:
    """
    Main phytosanitary risk assessment function.

    Args:
        crop:                  Crop name (onion, grape, mango, etc.)
        country:               Target export country (EU, UK, USA, UAE)
        pesticides_used:       List of pesticide names used. If None, uses crop defaults.
        days_since_last_spray: Days since last spray application.
        quantity_quintals:     Shipment quantity in quintals.

    Returns:
        Full risk assessment dict.
    """
    crop    = crop.lower().strip()
    country = country.upper().strip()
    quantity_mt = quantity_quintals / 10.0  # Convert quintals to metric tons (1 quintal = 0.1 MT)

    # Fall back to crop defaults if no pesticides specified
    crop_defaults = PHYTO["crop_pesticide_defaults"].get(crop, {})
    if not pesticides_used:
        pesticides_used = crop_defaults.get("common_pesticides", [])

    if country not in PHYTO["mrl_standards"]:
        return {"error": f"Country '{country}' not in database. Supported: EU, UK, USA, UAE"}

    # Score each pesticide
    quantity_mt = quantity_quintals * 0.1  # Convert to metric tons
    pesticide_results = []
    for p in pesticides_used:
        result = _score_pesticide(p, country, days_since_last_spray, crop, quantity_mt)
        pesticide_results.append(result)

    if not pesticide_results:
        overall_score = 0
    else:
        # Use weighted average with emphasis on highest risk pesticides
        scores = [r["risk_points"] for r in pesticide_results]
        max_score = max(scores)
        avg_score = sum(scores) / len(scores)
        overall_score = int((max_score * 0.7) + (avg_score * 0.3))  # Weight towards highest risk

    # Enhanced overall risk level with more granular categories
    if overall_score >= 75:
        overall_risk  = "CRITICAL"
        likely_result = "VERY HIGH RISK — Likely to Fail Port Inspection"
        primary_action = "🚫 DO NOT PROCEED with shipment. Multiple critical risk factors detected. Requires immediate lab testing and potential crop destruction."
    elif overall_score >= 60:
        overall_risk  = "HIGH"
        likely_result = "HIGH RISK — Very Likely to Fail"
        primary_action = "⚠️  HIGH RISK DETECTED — Do NOT book shipment yet. Immediate lab-certified residue testing required."
    elif overall_score >= 45:
        overall_risk  = "MEDIUM"
        likely_result = "MODERATE RISK — Lab Test Strongly Recommended"
        primary_action = "🟡 BORDERLINE RISK — Get comprehensive pesticide residue test from NABL-accredited lab before booking shipment."
    elif overall_score >= 25:
        overall_risk  = "LOW"
        likely_result = "LOW RISK — Likely to Pass with Standard Checks"
        primary_action = "🟢 LOW REJECTION RISK — Proceed with standard phytosanitary certificate, but monitor for any issues."
    else:
        overall_risk  = "VERY_LOW"
        likely_result = "VERY LOW RISK — High Confidence Pass"
        primary_action = "✅ VERY LOW RISK — Standard phytosanitary procedures should suffice."

    # Build specific recommendations
    recommendations = []
    high_flags = [r for r in pesticide_results if r["flag"] == "HIGH"]
    med_flags  = [r for r in pesticide_results if r["flag"] == "MEDIUM"]

    if high_flags:
        names = ", ".join(r["pesticide"].replace("_", " ").title() for r in high_flags)
        recommendations.append(f"Critical: {names} detected as high risk for {country} — these pesticides have near-zero or banned MRL status.")

    if med_flags:
        names = ", ".join(r["pesticide"].replace("_", " ").title() for r in med_flags)
        recommendations.append(f"Monitor: {names} show moderate residue risk — PHI compliance is critical.")

    # PHI-specific advice
    phi_violated = [r for r in pesticide_results if "violated" in r.get("phi_status", "").lower()]
    if phi_violated:
        days_needed = max(
            PHYTO["crop_pesticide_defaults"].get(crop, {}).get("phi_days", {}).get(r["pesticide"], 14)
            for r in phi_violated
        )
        wait_more = max(0, days_needed - days_since_last_spray)
        if wait_more > 0:
            recommendations.append(f"Wait at least {wait_more} more days before harvest to allow residue decay on flagged pesticides.")

    recommendations.append(primary_action)

    return {
        "crop":                  crop,
        "target_country":        country,
        "days_since_last_spray": days_since_last_spray,
        "overall_risk":          overall_risk,
        "overall_score":         overall_score,
        "likely_result":         likely_result,
        "pesticide_breakdown":   pesticide_results,
        "recommendations":       recommendations,
        "lab_testing_options":   PHYTO["lab_testing_bodies"],
        "crop_context":          crop_defaults.get("base_risk_note", ""),
    }


# ─────────────────────────────────────────────
#  LOGISTICS CHAIN ENGINE
# ─────────────────────────────────────────────

def get_logistics_chain(
    crop: str,
    country: str,
    origin_district: str,
    quantity_quintals: int
) -> dict:
    """
    Return the full export logistics pathway for a crop to a target country.

    Args:
        crop:              Crop name
        country:           Target country (EU, UK, USA, UAE)
        origin_district:   District in Maharashtra (nashik, pune, aurangabad, etc.)
        quantity_quintals: Quantity in quintals

    Returns:
        Full logistics chain dict.
    """
    crop             = crop.lower().strip()
    country          = country.upper().strip()
    origin_district  = origin_district.lower().strip()

    # Port info — default to JNPT if district not mapped
    port_info = LOGISTICS["export_ports"].get(
        origin_district,
        LOGISTICS["export_ports"]["nashik"]  # JNPT as fallback
    )

    if country not in LOGISTICS["shipping_routes"]:
        return {"error": f"Country '{country}' not supported. Available: EU, UK, USA, UAE"}

    route    = LOGISTICS["shipping_routes"][country]
    market   = LOGISTICS["destination_markets"][country]
    handlers = LOGISTICS["apeda_handlers"]["maharashtra"]
    docs     = LOGISTICS["required_documents"]

    # Relevant docs for this country
    country_docs = docs.get("all_exports", []) + docs.get(f"{country}_specific", [])

    # Quantity conversion (1 quintal = 100 kg = 0.1 MT)
    quantity_mt = quantity_quintals * 0.1
    freight_low_str, freight_high_str = route["freight_cost_per_mt_inr"].split("-")
    freight_low  = int(freight_low_str.strip())
    freight_high = int(freight_high_str.strip())
    total_freight_low  = int(freight_low  * quantity_mt)
    total_freight_high = int(freight_high * quantity_mt)

    # Filter handlers by crop
    relevant_handlers = [
        h for h in handlers
        if "all" in h["crops"] or crop in h["crops"]
    ]
    if not relevant_handlers:
        relevant_handlers = handlers  # show all if none match

    return {
        "crop":             crop,
        "target_country":   country,
        "origin_district":  origin_district,
        "quantity_quintals": quantity_quintals,
        "quantity_mt":      round(quantity_mt, 2),

        "port": {
            "name":               port_info["port_full_name"],
            "code":               port_info["primary_port"],
            "distance_from_farm": f"{port_info['distance_km']} km ({port_info['drive_hours']} hrs drive)",
            "cold_chain":         "Available" if port_info["cold_chain_available"] else "Not available",
            "apeda_office":       port_info["apeda_office"]
        },

        "shipping": {
            "destination_ports":   route["destination_ports"],
            "shipping_lines":      route["primary_shipping_lines"],
            "transit_days":        route["transit_days"],
            "frequency":           route["frequency"],
            "container_type":      route["container_type"],
            "incoterm":            route["incoterm_typical"],
            "freight_per_mt_inr":  route["freight_cost_per_mt_inr"],
            "total_freight_inr":   f"Rs.{total_freight_low:,} – Rs.{total_freight_high:,} (for {quantity_mt} MT)"
        },

        "destination_markets": {
            "wholesale_markets":     market["primary_wholesale_markets"],
            "diaspora_demand":       market["indian_diaspora_demand"],
            "peak_demand_months":    market["peak_demand_months"]
        },

        "apeda_handlers":  relevant_handlers,
        "cold_chain_providers": LOGISTICS["cold_chain_providers"],
        "required_documents":   country_docs,
    }


# ─────────────────────────────────────────────
#  COMBINED EXPORT READINESS
# ─────────────────────────────────────────────

def get_export_readiness(
    crop: str,
    country: str,
    origin_district: str,
    quantity_quintals: int,
    pesticides_used: Optional[list] = None,
    days_since_last_spray: int = 14,
    demanded_price_per_quintal: Optional[float] = None
) -> dict:
    """Master function — combines phytosanitary risk + logistics chain + price validation."""

    phyto    = assess_phytosanitary_risk(crop, country, pesticides_used, days_since_last_spray, quantity_quintals)
    logistics = get_logistics_chain(crop, country, origin_district, quantity_quintals)

    # Price validation and market analysis
    price_analysis = None
    if demanded_price_per_quintal is not None:
        try:
            from price_service import predict_prices
            from export_service import predict_export_premium

            # Get current market prices
            domestic_prices = predict_prices(crop.title())
            best_domestic = domestic_prices.get('best_price')
            if best_domestic is None:
                predictions = domestic_prices.get('predictions', [])
                if predictions:
                    best_domestic = max(item.get('predicted_price', 0) for item in predictions)
            if best_domestic is None:
                raise ValueError("No domestic price data available")

            # Get export premium prediction
            export_analysis = predict_export_premium(
                crop_name=crop.title(),
                domestic_price=best_domestic,
                qty_qt=quantity_quintals,
                destination=country
            )

            # Analyze farmer's demanded price
            price_realistic = demanded_price_per_quintal <= export_analysis['predicted_export_qt'] * 1.2  # Allow 20% optimism
            price_competitive = demanded_price_per_quintal >= best_domestic * 0.8  # Not too low

            price_analysis = {
                'demanded_price': demanded_price_per_quintal,
                'market_domestic_best': best_domestic,
                'predicted_export_price': export_analysis['predicted_export_qt'],
                'export_premium': export_analysis['premium_rs_qt'],
                'price_realistic': price_realistic,
                'price_competitive': price_competitive,
                'market_insights': {
                    'domestic_vs_export': f"Export price {export_analysis['premium_pct']:+.1f}% vs domestic",
                    'farmer_positioning': 'Optimistic' if demanded_price_per_quintal > export_analysis['predicted_export_qt'] else 'Conservative',
                    'quantity_impact': f"Large quantity ({quantity_quintals}q) may negotiate better rates"
                }
            }

            # Adjust phytosanitary risk based on price expectations
            if not price_realistic and phyto.get("overall_risk") != "HIGH":
                phyto["overall_risk"] = "MEDIUM"
                phyto["likely_result"] = "Price expectations may need adjustment"
                phyto["recommendations"].insert(0, f"Consider adjusting price expectations — market suggests ₹{export_analysis['predicted_export_qt']}/q for {country}")

        except Exception as e:
            price_analysis = {'error': f'Price analysis unavailable: {str(e)}'}

    # Generate comprehensive action plan based on enhanced risk assessment
    if phyto.get("overall_risk") == "CRITICAL":
        next_steps = [
            "🚫  CRITICAL RISK — DO NOT PROCEED WITH SHIPMENT",
            "1. Immediate cessation of export plans for this batch.",
            "2. Contact NABL-accredited lab for comprehensive multi-residue testing (URGENT).",
            "3. Consult agricultural extension officer about alternative pesticides/crops.",
            "4. Consider domestic market sales or processing options.",
            "5. Document all spraying records for regulatory compliance review.",
            "6. Risk of complete crop rejection and financial loss is extremely high."
        ]
    elif phyto.get("overall_risk") == "HIGH":
        next_steps = [
            "⚠️  HIGH RISK DETECTED — DO NOT BOOK SHIPMENT",
            "1. Halt all export preparations immediately.",
            "2. Arrange for accredited lab testing within 24-48 hours.",
            "3. Review PHI compliance for all flagged pesticides.",
            "4. Prepare alternative marketing strategies (domestic sales).",
            "5. Contact insurance provider if export insurance is in place.",
            "6. Only proceed after lab results confirm safe residue levels."
        ]
    elif phyto.get("overall_risk") == "MEDIUM":
        next_steps = [
            "🟡 MODERATE RISK — LAB TESTING ESSENTIAL",
            "1. Schedule comprehensive pesticide residue testing immediately.",
            "2. Continue phytosanitary certificate application but do not finalize.",
            "3. Monitor weather conditions that may affect residue degradation.",
            "4. Prepare backup domestic market distribution plan.",
            "5. Contact APEDA for guidance on testing requirements.",
            "6. Only proceed with shipment booking after receiving clean lab reports."
        ]
    elif phyto.get("overall_risk") == "LOW":
        next_steps = [
            "🟢 LOW RISK — PROCEED WITH CAUTION",
            "1. Apply for Phytosanitary Certificate from Plant Quarantine Authority.",
            "2. Consider voluntary lab testing for peace of mind.",
            "3. Ensure all documentation is complete and accurate.",
            "4. Contact APEDA-registered export house for logistics coordination.",
            "5. Book reefer container with preferred shipping line.",
            "6. Arrange cold chain transport from farm to port."
        ]
    else:  # VERY_LOW
        next_steps = [
            "✅ VERY LOW RISK — CONFIDENT PROCEED",
            "1. Apply for Phytosanitary Certificate from Plant Quarantine Authority.",
            "2. Register with APEDA if not already done.",
            "3. Contact APEDA export handlers for documentation support.",
            "4. Book reefer container with Maersk/MSC/CMA CGM via JNPT.",
            "5. Arrange cold chain transport from farm to JNPT Mumbai.",
            "6. Monitor for any last-minute issues before loading."
        ]

    return {
        "status":           "success",
        "summary": {
            "crop":           crop,
            "country":        country,
            "origin":         origin_district,
            "quantity":       f"{quantity_quintals} quintals ({quantity_quintals * 0.1:.1f} MT)",
            "risk_level":     phyto.get("overall_risk", "UNKNOWN"),
            "likely_result":  phyto.get("likely_result", ""),
            "price_analysis": price_analysis.get("market_insights", {}) if price_analysis else None,
        },
        "phytosanitary":    phyto,
        "logistics":        logistics,
        "price_analysis":   price_analysis,
        "action_plan":      next_steps
    }
