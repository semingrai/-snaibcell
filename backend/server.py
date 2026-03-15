from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from featherless import generate_communication, call_featherless

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


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


@app.post("/chat")
def chat(req: ChatRequest):
    try:
        from featherless import client as fl_client
        response = fl_client.chat.completions.create(
            model="aaditya/Llama3-OpenBioLLM-70B",
            messages=[m.model_dump() for m in req.messages],
            max_tokens=400,
            temperature=0.3,
        )
        return {"content": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/clinical-brief")
def clinical_brief(req: BriefRequest):
    patient = req.patient_data.model_dump()

    prediction = req.prediction_output.model_dump()
    # featherless.py expects top_features as a list of label strings
    prediction["top_features"] = [f["label"] for f in prediction["top_features"]]

    result = generate_communication(patient, prediction)

    tb = result.get("technical_brief", "")
    fl = result.get("family_letter", "")
    if tb.startswith("Error") or fl.startswith("Error"):
        raise HTTPException(status_code=502, detail=tb or fl or "AI service error")

    return result
