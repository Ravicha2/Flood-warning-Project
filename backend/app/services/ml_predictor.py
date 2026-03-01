"""
Machine Learning Service — Flood Water Level Prediction
=======================================================
Uses scikit-learn (or Elasticsearch ML) to predict water levels
4-6 hours in advance from historical sensor data.

TODO: Implement the following:
1. Feature engineering from historical sensor documents
2. Model training (scikit-learn RandomForest or Elasticsearch ML job)
3. Prediction generation and storage back to Elasticsearch
"""

from typing import Optional
import numpy as np


class FloodPredictionModel:
    """
    Time-series predictor for water level forecasting.

    Training data schema (from Elasticsearch):
      - timestamp (date)
      - water_level (float)
      - rainfall_mm (float)
      - wind_speed_ms (float)
      - humidity_pct (float)
      - risk_level (keyword → encoded as int)

    Output:
      - predicted_water_level (float)
      - predicted_risk_level (str)
      - confidence_score (float 0–1)
    """

    def __init__(self):
        self.model = None       # TODO: initialize sklearn model
        self.is_trained = False
        self.model_version = "v1.0.0"
        self.feature_columns = [
            "water_level",
            "rainfall_mm",
            "wind_speed_ms",
            "humidity_pct",
            "hour_of_day",       # engineered feature
            "day_of_week",       # engineered feature
        ]

    def train(self, historical_data: list[dict]) -> None:
        """
        Train the model on historical sensor data.

        Args:
            historical_data: list of sensor documents from Elasticsearch

        TODO:
        1. Convert historical_data to DataFrame
        2. Engineer lag features (t-1, t-2, t-6 readings)
        3. Encode risk_level as ordinal int
        4. Split into train/val sets
        5. Fit model (RandomForestRegressor or XGBRegressor)
        6. Evaluate RMSE on validation set
        7. Persist model to disk (joblib.dump)
        """
        raise NotImplementedError("train() not yet implemented")

    def predict(
        self,
        recent_readings: list[dict],
        horizon_hours: int = 6,
    ) -> dict:
        """
        Generate water level prediction for N hours ahead.

        Args:
            recent_readings: last 24h of sensor readings (latest first)
            horizon_hours:   prediction window (default 6 hours)

        Returns:
            {
                "predicted_water_level": float,
                "predicted_risk_level":  str,
                "confidence_score":      float,
            }

        TODO:
        1. Check model is trained (self.is_trained)
        2. Build feature vector from recent_readings
        3. Call self.model.predict(features)
        4. Map prediction to risk_level thresholds
        5. Return prediction dict
        """
        raise NotImplementedError("predict() not yet implemented")

    def load(self, model_path: str) -> None:
        """
        Load a pre-trained model from disk.
        TODO: use joblib.load(model_path)
        """
        raise NotImplementedError("load() not yet implemented")

    def save(self, model_path: str) -> None:
        """
        Persist the trained model to disk.
        TODO: use joblib.dump(self.model, model_path)
        """
        raise NotImplementedError("save() not yet implemented")


# ----------------------------------------------------------
# Risk level thresholds — calibrate for each region
# ----------------------------------------------------------
RISK_THRESHOLDS = {
    "low":      (0.0, 1.0),    # water_level < 1.0m
    "medium":   (1.0, 2.5),    # 1.0m ≤ water_level < 2.5m
    "high":     (2.5, 4.0),    # 2.5m ≤ water_level < 4.0m
    "critical": (4.0, float("inf")),
}


def water_level_to_risk(level_m: float) -> str:
    """Convert water level in metres to risk category."""
    for risk, (low, high) in RISK_THRESHOLDS.items():
        if low <= level_m < high:
            return risk
    return "critical"
