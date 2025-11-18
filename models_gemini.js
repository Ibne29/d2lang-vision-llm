import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("Erreur : GOOGLE_API_KEY n'est pas définie dans le .env");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  try {
    const res = await fetch(url, {
      method: "GET", // C'est une requête GET
    });

    console.log("🔍 Statut HTTP:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Erreur lors de l'appel API:", errorText);
      return;
    }

    const json = await res.json();
    console.log("📋 Modèles disponibles:");
    
    json.models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
    });
    console.log("\n🧬 Modèles d'embedding :");
    const embeddingModels = json.models.filter(m => 
        m.name.includes("embedding") && m.supportedGenerationMethods.includes("embedContent")
    );
    
    embeddingModels.forEach(model => console.log(`- ${model.name}`));


  } catch (err) {
    console.error("⚠️ Erreur inattendue:", err);
  }
}

listModels();