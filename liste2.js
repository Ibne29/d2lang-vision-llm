// list_modele.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("Erreur : GOOGLE_API_KEY n'est pas définie dans le .env");
  process.exit(1);
}

// 1. L'URL correcte pour lister les modèles (API v1beta)
// 2. La clé API est passée en paramètre "key"
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

    // 3. La structure de réponse de Google est { "models": [...] }
    //    Et le nom du modèle est dans "m.name"
    console.log("📋 Modèles disponibles:");
    
    json.models.forEach(model => {
      // m.name est l'identifiant (ex: "models/text-embedding-004")
      // m.displayName est le nom lisible (ex: "Text Embedding 004")
      console.log(`- ${model.name} (${model.displayName})`);
    });

    // Filtre pour trouver les modèles d'embedding
    console.log("\n🧬 Modèles d'embedding (ceux que vous cherchiez) :");
    const embeddingModels = json.models.filter(m => 
        m.name.includes("embedding") && m.supportedGenerationMethods.includes("embedContent")
    );
    
    embeddingModels.forEach(model => console.log(`- ${model.name}`));


  } catch (err) {
    console.error("⚠️ Erreur inattendue:", err);
  }
}

listModels();