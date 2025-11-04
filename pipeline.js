import fs from "fs";
import { execSync } from "child_process";
import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// Initialisation du client Mistral
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Prompt utilisateur
const userPrompt =
  process.argv[2] ||
  "Deux clients parlent à un serveur et une base de données";

// --- Étape 1 : Charger la documentation D2 depuis le site officiel ---
async function fetchD2Doc() {
  try {
    console.log("📚 Téléchargement de la documentation D2...");
    const res = await fetch("https://d2lang.com/tour/intro");
    const html = await res.text();
    console.log("✅ Documentation récupérée !");
    // On coupe un peu pour éviter d’envoyer tout le HTML
    return html.slice(0, 5000);
  } catch (err) {
    console.warn("⚠️ Impossible de récupérer la doc D2 :", err);
    return "";
  }
}

// --- Étape 2 : Génération du code D2 via Mistral ---
async function generateD2(prompt, ragText, feedback = "") {
  const response = await client.chat.complete({
    model: "codestral-latest",
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
    execSync(`d2.exe "${input}" "${output}"`, { stdio: "inherit" });
    console.log(`✅ Diagramme généré : ${output}`);
    return true;
  } catch (err) {
    console.error("❌ Erreur de compilation :", err.message);
    return err.message;
  }
}

// --- Étape 4 : Pipeline principal ---
async function main() {
  const ragText = await fetchD2Doc();
  let feedback = "";

  for (let i = 0; i < 3; i++) {
    console.log(`\n🔁 Itération ${i + 1}`);

    const d2Code = await generateD2(userPrompt, ragText, feedback);

    // --- Nettoyage du code D2 généré ---
    const cleanCode = d2Code
      .replace(/```d2/g, "")
      .replace(/```/g, "")
      .replace(/^[\s\S]*?(direction:|[A-Za-z0-9_-]+\s*:)/, "$1") // coupe avant la syntaxe principale
      .trim();

    fs.writeFileSync("diagram.d2", cleanCode);
    console.log("🧠 Code D2 nettoyé :\n", cleanCode);

    // --- Compilation ---
    const result = compileD2("diagram.d2");
    if (result === true) {
      console.log("✅ Fin du pipeline : diagram.png prêt !");
      break;
    } else {
      console.log("❌ Erreur de compilation détectée.");
      feedback = `Erreur de compilation : ${result}. Corrige le code en respectant la syntaxe D2.`;
    }
  }
}

main();
