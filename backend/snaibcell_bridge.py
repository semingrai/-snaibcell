import os
import pickle
import pandas as pd

_PKL = os.path.join(os.path.dirname(__file__), "..", "snaibcell_model.pkl")

try:
    with open(_PKL, "rb") as _f:
        _data = pickle.load(_f)
    _model = _data["model"]
    _features = _data["features"]
    _available = True
    print("[snaibcell_bridge] Model loaded OK")
except FileNotFoundError:
    _available = False
    print("[snaibcell_bridge] WARNING: snaibcell_model.pkl not found — run `python snaibcell.py` from project root first")


def predict_duration(patient_dict: dict) -> dict | None:
    """Return ML-predicted durations, or None if model pkl not available."""
    if not _available:
        return None
    row = pd.DataFrame([patient_dict])
    row = row.reindex(columns=_features)
    pred = float(_model.predict(row)[0])
    safe = float(max(pred - 20, 10))
    return {"predicted_duration_min": round(pred), "safe_duration_min": round(safe)}
