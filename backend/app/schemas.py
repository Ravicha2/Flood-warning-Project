"""
Pydantic schemas for request/response validation.
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
    latitude:  float = Field(..., ge=-90,  le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=5.0, gt=0, le=100, description="Search radius in km")

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


class FloodBoundariesResponse(BaseModel):
    total:      int
    boundaries: list[FloodBoundaryItem]


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


class PredictionsResponse(BaseModel):
    total:       int
    predictions: list[PredictionItem]
