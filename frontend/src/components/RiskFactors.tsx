import { useState, useRef, useEffect } from "react";
import { ShieldAlert, Sparkles, Loader2, Send, FileText } from "lucide-react";
import type { PatientData, PredictionOutput } from "../data/patients";
import FamilyLetterView from "./FamilyLetterView";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  patient: PatientData;
  prediction: PredictionOutput;
  isDark: boolean;
}

export default function RiskFactors({ patient, prediction, isDark }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [familyLetter, setFamilyLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasChat = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const textP = isDark ? "text-txt-primary" : "text-gray-900";
  const textM = isDark ? "text-txt-muted" : "text-gray-500";
  const divider = isDark ? "bg-dark-border" : "bg-gray-200";
  const barBg = isDark ? "bg-dark-bar" : "bg-gray-100";
  const surface = isDark ? "bg-dark-surface border-dark-card" : "bg-gray-50 border-gray-200";
  const inputBg = isDark ? "bg-dark-input border-dark-border" : "bg-white border-gray-200";

  const urgColor = {
    RED: "text-brand-red",
    YELLOW: "text-brand-amber",
    GREEN: "text-brand-green",
  }[prediction.urgency_tier];

  const handleGenerateBrief = async () => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setFamilyLetter(null);

    try {
      const res = await fetch("/clinical-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_data: patient, prediction_output: prediction }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detail = errorData.detail;
        setError(typeof detail === "string" ? detail : "Error generating clinical brief.");
        return;
      }
      const data = await res.json();
      setMessages([{ role: "assistant", content: data.technical_brief }]);
      setFamilyLetter(data.family_letter);
    } catch {
      setError("Network error — check your API and connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a stroke neurology clinical assistant. Patient: ${patient.age}yo ${patient.gender}, NIHSS ${patient.nihss_score}, ASPECTS ${patient.aspects_score}, ${patient.clot_location} occlusion, penumbra ${patient.penumbra_volume_ml}ml, core infarct ${patient.core_infarct_volume_ml}ml, onset-to-door ${patient.onset_to_door_min} min. Predicted mRS ${prediction.predicted_mrs}, independence probability ${prediction.independence_prob}%, urgency: ${prediction.urgency_tier}. Respond concisely in clinical language.`,
            },
            ...newMessages,
          ],
        }),
      });
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch {
      setError("Chat error — please retry.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      {showFamily && familyLetter && (
        <FamilyLetterView
          letter={familyLetter}
          patientId={patient.patient_id}
          isDark={isDark}
          onClose={() => setShowFamily(false)}
        />
      )}

      <div className="flex flex-col gap-5 h-full">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 className={`text-base font-semibold ${textP}`}>Top Risk Factors</h2>
          <p className={`text-xs ${textM}`}>Drivers of extended procedure time</p>
        </div>

        <div className={`h-px w-full ${divider}`} />

        {/* Bars */}
        <div className="flex flex-col gap-5">
          {prediction.top_features.map((f, i) => {
            const isUp = f.direction === "up";
            const barColor = isUp ? (i < 2 ? "bg-brand-red" : "bg-brand-amber") : "bg-brand-green";
            const labelColor = isUp ? (i < 2 ? "text-brand-red" : "text-brand-amber") : "text-brand-green";
            return (
              <div key={f.label} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${textP}`}>{f.label}</span>
                  <span className={`text-[11px] ${labelColor}`}>
                    {isUp ? "↑" : "↓"} {isUp ? "Increases" : "Decreases"} risk
                  </span>
                </div>
                <div className={`w-full h-1.5 ${barBg}`}>
                  <div
                    className={`h-1.5 ${barColor} opacity-90 transition-all duration-700`}
                    style={{ width: `${f.weight}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className={`h-px w-full ${divider} mt-auto`} />

        {/* Predicted time */}
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] font-semibold tracking-widest ${textM}`}>
            PREDICTED PROCEDURE TIME
          </span>
          <span className={`text-3xl font-bold ${urgColor}`}>
            {prediction.predicted_duration_min} minutes
          </span>
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-brand-amber shrink-0" />
            <span className="text-xs text-brand-amber">
              Safe limit: {prediction.safe_duration_min} min —{" "}
              {prediction.predicted_duration_min - prediction.safe_duration_min} min over threshold
            </span>
          </div>
        </div>

        {/* Generate button — only before chat starts */}
        {!hasChat && (
          <button
            type="button"
            onClick={handleGenerateBrief}
            disabled={loading}
            className="flex items-center justify-center gap-2 h-11 bg-brand-blue text-white
                       text-sm font-semibold w-full hover:bg-blue-500 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Generating..." : "Generate Clinical Brief"}
          </button>
        )}

        {error && <p className="text-xs text-brand-red">{error}</p>}

        {/* Chat interface */}
        {hasChat && (
          <div className="flex flex-col gap-2">
            {/* Chat header */}
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold tracking-widest ${textM}`}>
                AI CLINICAL CHAT
              </span>
              <button
                type="button"
                onClick={() => setShowFamily(true)}
                className="flex items-center gap-1 text-[11px] text-brand-blue hover:text-blue-400 transition-colors"
              >
                <FileText size={12} />
                Family Letter
              </button>
            </div>

            {/* Messages */}
            <div className={`flex flex-col gap-3 h-64 overflow-y-auto p-3 border ${surface}`}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`text-xs leading-relaxed px-3 py-2 max-w-[85%] whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-brand-blue text-white"
                        : isDark
                        ? "bg-dark-input text-txt-primary"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className={`px-3 py-2 ${isDark ? "bg-dark-input" : "bg-gray-100"}`}>
                    <Loader2 size={12} className={`animate-spin ${textM}`} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className={`flex items-center gap-2 h-10 px-3 border ${inputBg}`}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a clinical question..."
                className={`flex-1 bg-transparent outline-none text-xs ${textP} placeholder:opacity-40`}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={chatLoading || !input.trim()}
                className="text-brand-blue hover:text-blue-400 disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
