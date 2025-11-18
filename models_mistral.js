import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const res = await fetch("https://api.mistral.ai/v1/models", {
  headers: { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
});

const text = await res.text();
console.log("🔍 Statut HTTP:", res.status);
console.log("🧾 Réponse brute:\n", text);

try {
  const json = JSON.parse(text);
  console.log("📋 Modèles disponibles:\n", json.data?.map(m => m.id));
} catch {
  console.warn("⚠️ Impossible de parser la réponse JSON");
}
