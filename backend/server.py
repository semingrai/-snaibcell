import re
import json
import math
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from featherless import generate_communication, client as fl_client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

_triage_counter = 0


def build_time_curve(base_bad: float, max_bad: float) -> list:
    """S-curve matching the frontend buildSCurve logic."""
    points = []
    for m in range(0, 181, 5):
        t = m / 180
        sig = 1 / (1 + math.exp(-10 * (t - 0.44)))
        prob = base_bad + (max_bad - base_bad) * sig
        points.append({"minutes": m, "bad_outcome_prob": min(99, round(prob))})
    return points


# ── Shared models ─────────────────────────────────────────────────────────────

class TopFeature(BaseModel):
    label: str
    direction: str
    weight: float


class PatientData(BaseModel):
    patient_id: str
    age: int
    gender: str
    nihss_score: int
    gcs_score: int
    aspects_score: int
    clot_location: str
    clot_length_mm: float
    penumbra_volume_ml: float
    core_infarct_volume_ml: float
    mismatch_ratio: float
    systolic_bp: int
    blood_glucose: int
    onset_to_door_min: int
    hypertension: int
    diabetes: int
    atrial_fibrillation: int
    interventionist_experience_years: float


class PredictionOutput(BaseModel):
    predicted_mrs: int
    independence_prob: int
    urgency_tier: str
    time_window_minutes: int
    mrs_plain_english: str
    predicted_duration_min: int
    safe_duration_min: int
    top_features: List[TopFeature]


class BriefRequest(BaseModel):
    patient_data: PatientData
    prediction_output: PredictionOutput


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


class TriageRequest(BaseModel):
    description: str


# ── /clinical-brief ───────────────────────────────────────────────────────────

@app.post("/clinical-brief")
def clinical_brief(req: BriefRequest):
    patient = req.patient_data.model_dump()
    prediction = req.prediction_output.model_dump()
    prediction["top_features"] = [f["label"] for f in prediction["top_features"]]

    result = generate_communication(patient, prediction)

    tb = result.get("technical_brief", "")
    fl = result.get("family_letter", "")
    if tb.startswith("Error") or fl.startswith("Error"):
        raise HTTPException(status_code=502, detail=tb or fl or "AI service error")

    return result


# ── /chat ─────────────────────────────────────────────────────────────────────

@app.post("/chat")
def chat(req: ChatRequest):
    try:
        response = fl_client.chat.completions.create(
            model="aaditya/Llama3-OpenBioLLM-70B",
            messages=[m.model_dump() for m in req.messages],
            max_tokens=400,
            temperature=0.3,
        )
        return {"content": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── /triage ───────────────────────────────────────────────────────────────────

@app.post("/triage")
def triage(req: TriageRequest):
    global _triage_counter
    _triage_counter += 1
    counter = _triage_counter

    prompt = f"""You are an emergency stroke triage AI in an interventional neurology unit.
A doctor described this incoming patient:

"{req.description}"

Reason through the clinical presentation and estimate all values below.
Be CONSERVATIVE — when uncertain, assume worse outcomes to protect patient safety.

REASONING GUIDELINES:
- "Unresponsive", "unconscious", low GCS, or "found down" → NIHSS 20-35, urgency RED
- "Weakness", "hemiplegia", "paralysis" on one side → NIHSS 12-20, likely MCA-M1
- "Speech difficulty" or "aphasia" alone → NIHSS 5-10, urgency YELLOW
- "Facial droop" alone → NIHSS 4-8
- Age > 65 → increase NIHSS estimate by 3, reduce independence_prob by 10%
- Obese / weight > 250 lbs / BMI > 35 → increase predicted_duration_min by 15, add cardiovascular risk
- Systolic BP > 180 → urgency RED, reduce time_window_minutes by 20
- Unknown onset time → set onset_to_door_min to 60
- When urgency is uncertain → default to RED

Output ONLY a valid JSON object. No markdown, no explanation, no code fences.

{{
  "patient_id": "TRIAGE-{counter:03d}",
  "age": <integer>,
  "gender": "<Male|Female|Unknown>",
  "nihss_score": <0-42>,
  "gcs_score": <3-15>,
  "aspects_score": <0-10, default 7 if unknown>,
  "clot_location": "<MCA-M1|MCA-M2|ICA|Basilar|Other>",
  "clot_length_mm": <float>,
  "penumbra_volume_ml": <float>,
  "core_infarct_volume_ml": <float>,
  "mismatch_ratio": <float>,
  "systolic_bp": <integer>,
  "blood_glucose": <integer, default 110>,
  "onset_to_door_min": <integer>,
  "hypertension": <0 or 1>,
  "diabetes": <0 or 1>,
  "atrial_fibrillation": <0 or 1>,
  "interventionist_experience_years": <float, default 5.0>,
  "urgency_tier": "<RED|YELLOW|GREEN>",
  "predicted_duration_min": <60-180>,
  "safe_duration_min": <predicted_duration_min minus 20>,
  "independence_prob": <0-100>,
  "predicted_mrs": <0-6>,
  "mrs_plain_english": "<brief disability description>",
  "time_window_minutes": <15-120>,
  "top_features": [
    {{"label": "<key clinical factor with value>", "direction": "up", "weight": <50-100>}},
    {{"label": "<key clinical factor with value>", "direction": "up", "weight": <30-85>}},
    {{"label": "<key clinical factor with value>", "direction": "<up|down>", "weight": <20-70>}}
  ]
}}"""

    try:
        response = fl_client.chat.completions.create(
            model="aaditya/Llama3-OpenBioLLM-70B",
            messages=[
                {
                    "role": "system",
                    "content": "You are an emergency stroke triage AI. Output ONLY a valid JSON object. No markdown fences, no explanation, no text before or after the JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=900,
            temperature=0.2,
        )
        raw = response.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Extract JSON — handle markdown fences or raw object
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
    if fence_match:
        json_str = fence_match.group(1)
    else:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end == -1:
            raise HTTPException(status_code=502, detail=f"Model did not return valid JSON. Got: {raw[:200]}")
        json_str = raw[start : end + 1]

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"JSON parse error: {e}")

    def gi(key, default):
        try:
            return int(data.get(key, default))
        except (TypeError, ValueError):
            return default

    def gf(key, default):
        try:
            return float(data.get(key, default))
        except (TypeError, ValueError):
            return default

    independence_prob = gi("independence_prob", 40)
    base_bad = max(0, min(99, 100 - independence_prob))
    max_bad = min(99, base_bad + 28)

    pred_duration = gi("predicted_duration_min", 90)
    safe_duration = gi("safe_duration_min", max(pred_duration - 20, 10))

    urgency = str(data.get("urgency_tier", "RED")).upper()
    if urgency not in ("RED", "YELLOW", "GREEN"):
        urgency = "RED"

    patient = {
        "patient_id": f"TRIAGE-{counter:03d}",
        "age": gi("age", 60),
        "gender": str(data.get("gender", "Unknown")),
        "nihss_score": gi("nihss_score", 15),
        "gcs_score": gi("gcs_score", 12),
        "aspects_score": gi("aspects_score", 7),
        "clot_location": str(data.get("clot_location", "MCA-M1")),
        "clot_length_mm": gf("clot_length_mm", 12.0),
        "penumbra_volume_ml": gf("penumbra_volume_ml", 50.0),
        "core_infarct_volume_ml": gf("core_infarct_volume_ml", 8.0),
        "mismatch_ratio": gf("mismatch_ratio", 6.0),
        "systolic_bp": gi("systolic_bp", 160),
        "blood_glucose": gi("blood_glucose", 110),
        "onset_to_door_min": gi("onset_to_door_min", 60),
        "hypertension": gi("hypertension", 1),
        "diabetes": gi("diabetes", 0),
        "atrial_fibrillation": gi("atrial_fibrillation", 0),
        "interventionist_experience_years": gf("interventionist_experience_years", 5.0),
    }

    prediction = {
        "predicted_mrs": gi("predicted_mrs", 3),
        "independence_prob": independence_prob,
        "urgency_tier": urgency,
        "time_window_minutes": gi("time_window_minutes", 60),
        "mrs_plain_english": str(data.get("mrs_plain_english", "moderate disability")),
        "predicted_duration_min": pred_duration,
        "safe_duration_min": safe_duration,
        "top_features": data.get("top_features", []),
        "time_curve": build_time_curve(base_bad, max_bad),
    }

    return {"patient": patient, "prediction": prediction}
