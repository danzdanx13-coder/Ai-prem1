// Voice note: audio dikirim ke server lalu ditranskripsi dengan OpenAI.
const { json, user, useQuota, currentPlan, PLANS } = require("../lib/common");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Metode tidak diizinkan." });
  const u = user(context);
  if (!u) return json(401, { error: "Silakan masuk terlebih dahulu.", code: "AUTH" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Permintaan tidak valid." }); }
  const { audio, mime } = body;
  if (!audio || typeof audio !== "string") return json(400, { error: "Audio kosong." });
  if (audio.length > 10_000_000) return json(400, { error: "Voice note terlalu panjang." });

  const plan = await currentPlan(u.id);
  const quota = await useQuota(u.id, plan);
  if (!quota.ok) return json(429, { error: "Batas pemakaian hari ini sudah habis.", code: "QUOTA" });

  const type = mime || "audio/webm";
  const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(audio, "base64")], { type }), `voice.${ext}`);
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("language", "id");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    const out = await res.json();
    if (!res.ok) return json(502, { error: "Transkripsi gagal. Coba lagi." });
    return json(200, { text: out.text || "" });
  } catch {
    return json(502, { error: "Tidak bisa terhubung ke layanan transkripsi." });
  }
};
  
