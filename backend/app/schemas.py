"""
Pydantic schemas for request/response validation.
Includes JSON examples used by Swagger "Try It Out" button.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ----------------------------------------------------------
# Enums
# ----------------------------------------------------------

class RiskLevel(str, Enum):
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


# ----------------------------------------------------------
# Geospatial primitives
# ----------------------------------------------------------

class GeoPoint(BaseModel):
    lat: float = Field(..., ge=-90,  le=90,  description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")


# ----------------------------------------------------------
# POST /check-location
# ----------------------------------------------------------

class LocationCheckRequest(BaseModel):
    latitude:  float = Field(..., ge=-90,  le=90, description="GPS latitude")
    longitude: float = Field(..., ge=-180, le=180, description="GPS longitude")
    radius_km: float = Field(default=50.0, gt=0, le=100, description="Search radius in km")
    at_time:   Optional[str] = Field(None, description="ISO8601 timestamp for time-traveling (demo)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Brisbane (inside flood zone)",
                    "latitude": -27.48,
                    "longitude": 153.05,
                    "radius_km": 50
                },
                {
                    "title": "Hat Yai (inside flood zone)",
                    "latitude": 7.01,
                    "longitude": 100.47,
                    "radius_km": 30
                },
                {
                    "title": "Sydney (outside flood zone)",
                    "latitude": -33.8688,
                    "longitude": 151.2093,
                    "radius_km": 10
                }
            ]
        }
    }


class LocationCheckResponse(BaseModel):
    latitude:              float
    longitude:             float
    risk_level:            RiskLevel
    nearest_sensor_id:     Optional[str] = None
    water_level_m:         Optional[float] = None
    predicted_flood_time:  Optional[str]  = None   # ISO8601
    active_boundaries:     list[str]      = Field(default_factory=list)
    evacuation_route:      list[GeoPoint] = Field(default_factory=list)
    message:               str = ""

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "latitude": -27.48,
                    "longitude": 153.05,
                    "risk_level": "high",
                    "nearest_sensor_id": "QLD-001",
                    "water_level_m": 2.4,
                    "predicted_flood_time": "2024-01-15T10:00:00Z",
                    "active_boundaries": ["BOUND-QLD-001"],
                    "evacuation_route": [],
                    "message": "High flood risk! Be prepared to evacuate."
                }
            ]
        }
    }


# ----------------------------------------------------------
# GET /flood-boundaries
# ----------------------------------------------------------

class FloodBoundaryItem(BaseModel):
    boundary_id:   str
    region_name:   str
    country:       str
    risk_level:    RiskLevel
    severity:      float
    active:        bool
    valid_from:    Optional[str] = None
    valid_until:   Optional[str] = None
    # GeoJSON geometry returned as raw dict
    geometry:      dict

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "boundary_id": "BOUND-QLD-001",
                    "region_name": "Brisbane River Flood Zone",
                    "country": "AU",
                    "risk_level": "high",
                    "severity": 7.5,
                    "active": True,
                    "valid_from": "2024-01-15T00:00:00Z",
                    "valid_until": "2024-01-16T00:00:00Z",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [[152.98, -27.42], [153.1, -27.42],
                             [153.1, -27.55], [152.98, -27.55],
                             [152.98, -27.42]]
                        ]
                    }
                }
            ]
        }
    }


class FloodBoundariesResponse(BaseModel):
    total:      int
    boundaries: list[FloodBoundaryItem]

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "total": 2,
                    "boundaries": [
                        {
                            "boundary_id": "BOUND-QLD-001",
                            "region_name": "Brisbane River Flood Zone",
                            "country": "AU",
                            "risk_level": "high",
                            "severity": 7.5,
                            "active": True,
                            "valid_from": "2024-01-15T00:00:00Z",
                            "valid_until": "2024-01-16T00:00:00Z",
                            "geometry": {"type": "Polygon", "coordinates": [[[152.98, -27.42], [153.1, -27.42], [153.1, -27.55], [152.98, -27.55], [152.98, -27.42]]]}
                        }
                    ]
                }
            ]
        }
    }


# ----------------------------------------------------------
# GET /evacuation-routes
# ----------------------------------------------------------

class EvacuationRouteRequest(BaseModel):
    latitude:  float
    longitude: float

class EvacuationRouteResponse(BaseModel):
    origin:       GeoPoint
    destination:  Optional[GeoPoint] = None
    waypoints:    list[GeoPoint]     = Field(default_factory=list)
    distance_km:  Optional[float]    = None
    estimated_minutes: Optional[int] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "origin": {"lat": -27.48, "lon": 153.05},
                    "destination": {"lat": -27.02, "lon": 153.55},
                    "waypoints": [
                        {"lat": -27.48, "lon": 153.05},
                        {"lat": -27.30, "lon": 153.20},
                        {"lat": -27.02, "lon": 153.55}
                    ],
                    "distance_km": 62.3,
                    "estimated_minutes": 48
                }
            ]
        }
    }


# ----------------------------------------------------------
# GET /predictions
# ----------------------------------------------------------

class PredictionItem(BaseModel):
    prediction_id:            str
    sensor_id:                str
    latitude:                 float
    longitude:                float
    predicted_water_level:    float
    predicted_risk_level:     RiskLevel
    prediction_horizon_hours: int
    confidence_score:         float
    predicted_for:            str   # ISO8601

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "prediction_id": "PRED-QLD-001-H4",
                    "sensor_id": "QLD-001",
                    "latitude": -27.4698,
                    "longitude": 153.0251,
                    "predicted_water_level": 3.6,
                    "predicted_risk_level": "high",
                    "prediction_horizon_hours": 4,
                    "confidence_score": 0.82,
                    "predicted_for": "2024-01-15T10:00:00Z"
                }
            ]
        }
    }


class PredictionsResponse(BaseModel):
    total:       int
    predictions: list[PredictionItem]

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "total": 1,
                    "predictions": [
                        {
                            "prediction_id": "PRED-QLD-001-H4",
                            "sensor_id": "QLD-001",
                            "latitude": -27.4698,
                            "longitude": 153.0251,
                            "predicted_water_level": 3.6,
                            "predicted_risk_level": "high",
                            "prediction_horizon_hours": 4,
                            "confidence_score": 0.82,
                            "predicted_for": "2024-01-15T10:00:00Z"
                        }
                    ]
                }
            ]
        }
    }
