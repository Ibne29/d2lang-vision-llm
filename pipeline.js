import fs from "fs";
import { execSync } from "child_process";
import { Mistral } from "@mistralai/mistralai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// Initialisation du client Mistral
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// Prompt utilisateur
const userPrompt =
  process.argv[2] || "Deux clients parlent à un serveur et une base de données";

// --- Étape 1 : Charger la documentation D2 ---
async function fetchD2Doc() {
  try {
    console.log("📚 Téléchargement de la documentation D2...");
    const res = await fetch("https://d2lang.com/tour/intro");
    const html = await res.text();
    console.log("✅ Documentation récupérée !");
    return html;
  } catch (err) {
    console.warn("⚠️ Impossible de récupérer la doc D2 :", err);
    return "";
  }
}

// --- Étape 2 : Génération du code D2 via Codestral ---
async function generateD2(prompt, ragText, feedback = "") {
  const response = await client.chat.complete({
    model: "codestral-2508",
    //model: "codestral-latest",
    messages: [
      {
        role: "system",
        content:
          "Tu écris uniquement du code D2 valide, sans texte explicatif, en respectant la documentation officielle de D2lang.",
      },
      {
        role: "user",
        content: `
Documentation D2 (extrait) :
${ragText}

${feedback}

Écris un diagramme D2 qui correspond à :
${prompt}
        `,
      },
    ],
  });

  return response.choices[0].message.content.trim();
}

// --- Étape 3 : Compilation du code D2 en image ---
function compileD2(file) {
  try {
    const input = file;
    const output = file.replace(".d2", ".png");
    console.log("🛠️ Compilation du diagramme...");
    const d2Command = process.platform === "win32" ? "d2.exe" : "d2";
    execSync(`${d2Command} "${input}" "${output}"`, { stdio: "inherit" });
    console.log(`✅ Diagramme généré : ${output}`);
    return true;
  } catch (err) {
    console.error("❌ Erreur de compilation :", err.message);
    return err.message;
  }
}






// --- Étape 4 : Vision LLM (Pixtral) pour décrire le PNG ---
async function describeDiagram(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString("base64");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "pixtral-large-latest",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Décris brièvement ce diagramme D2 en une phrase concise.",
            },
            {
              type: "image_url",
              image_url: `data:image/png;base64,${imageBase64}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Erreur API vision:", await res.text());
    throw new Error("Pixtral API error");
  }

  const json = await res.json();
  const caption = json.choices[0].message.content.trim();
  console.log("🧠 Caption générée :", caption);
  return caption;
}





// --- Étape 5 : Calcul de la similarité via embeddings ---
async function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

 

async function embedding(text) {
  try {
    // Utilise le modèle d'embedding de Google
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    const embedding = result.embedding;
    return embedding.values;
  } catch (err) {
    console.error("❌ Erreur d'embedding Google :", err);
    throw err;
  }
}

// --- Étape 6 : Pipeline principal ---
async function main() {
  const ragText = await fetchD2Doc();
  let feedback = "";
  const seuil_comparaison = 0.90;

  for (let i = 0; i < 5; i++) {
    console.log(`\n🔁 Itération ${i + 1}`);
    const d2Code = await generateD2(userPrompt, ragText, feedback);

    const cleanCode = d2Code
      .replace(/```d2/g, "")
      .replace(/```/g, "")
      .trim();

    fs.writeFileSync(`out/diagram_iter${i + 1}.d2`, cleanCode);
    
    console.log("🧠 Code D2 généré et nettoyé :\n");

    const result = compileD2(`out/diagram_iter${i + 1}.d2`);
    if (result === true) {
      console.log("🖼️ Génération réussie, vérification sémantique...");
      const caption = await describeDiagram(`out/diagram_iter${i + 1}.png`);
      const [embPrompt, embCaption] = await Promise.all([
        embedding(userPrompt),
        embedding(caption),
      ]);
      const sim = await cosineSimilarity(embPrompt, embCaption);
      console.log(`📊 Similarité cosinus : ${sim.toFixed(3)}`);

      if (sim >= seuil_comparaison) {
        console.log("✅ Cohérence suffisante ! Pipeline terminé avec succès.");
        return;
      } else {
        feedback = `Le diagramme ne correspond pas assez bien (${sim.toFixed(
          3
        )}). Caption : ${caption}. Corrige le code.`;
      }
    } else {
      feedback = `Erreur de compilation : ${result}`;
    }
  }
  console.warn("⚠️ Aucune itération n’a produit un diagramme cohérent.");
}

main();