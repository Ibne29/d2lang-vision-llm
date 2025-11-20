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

// --- Mesures de performance (ce que j'ai rajouter)---
const timings = {
  generation: [],
  compilation: [],
  vision: [],
  embedding: [],
  iteration: []
};

// --- Étape 1 : Charger la documentation D2 (version améliorée avec cache) ---
async function fetchD2Doc() {
  const cacheFile = 'rag_d2_full.txt';
  const fallbackFile = 'rag_d2.txt';
  
  // Vérifier si le cache existe déjà
  if (fs.existsSync(cacheFile)) {
    console.log("📚 Chargement de la documentation D2 (cache local)...");
    const cached = fs.readFileSync(cacheFile, 'utf-8');
    console.log(`✅ Documentation chargée (${cached.length} caractères)`);
    return cached;
  }
  
  try {
    console.log("📚 Téléchargement complet de la documentation D2...");
    
    // Pages importantes de la documentation D2
    const pages = [
      "https://d2lang.com/tour/intro",
      "https://d2lang.com/tour/hello-world",
      "https://d2lang.com/tour/connections",
      "https://d2lang.com/tour/shapes",
      "https://d2lang.com/tour/containers",
      "https://d2lang.com/tour/style"
    ];
    
    const docs = [];
    
    for (const url of pages) {
      const res = await fetch(url);
      const html = await res.text();
      
      // Extraction du contenu texte (suppression des balises HTML)
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      docs.push(`\n--- ${url} ---\n${textContent.substring(0, 2000)}`);
    }
    
    const fullDoc = docs.join('\n\n');
    
    // Sauvegarder dans le cache
    fs.writeFileSync(cacheFile, fullDoc);
    
    console.log(`✅ Documentation récupérée et mise en cache (${fullDoc.length} caractères)`);
    return fullDoc;
    
  } catch (err) {
    console.log("⚠️ Erreur lors du téléchargement, utilisation du fallback...");
    if (fs.existsSync(fallbackFile)) {
      return fs.readFileSync(fallbackFile, 'utf-8');
    }
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
          `Tu écris uniquement du code D2 valide, sans texte explicatif, en respectant la documentation officielle de D2lang.
IMPORTANT : 
- Utilise des identifiants simples sans guillemets quand possible (ex: client1, serveur, database)
- Si tu dois utiliser des guillemets, assure-toi qu'ils soient bien fermés
- Teste mentalement la syntaxe avant de générer le code`,
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
  
  // Seuil adaptatif selon la longueur/précision du prompt
  const promptWords = userPrompt.split(/\s+/).length;
  let seuil_comparaison;
  if (promptWords >= 10) {
    seuil_comparaison = 0.78; // Prompt détaillé = seuil élevé
  } else if (promptWords >= 6) {
    seuil_comparaison = 0.72; // Prompt moyen
  } else {
    seuil_comparaison = 0.68; // Prompt court/vague = seuil plus bas
  }
  console.log(`🎯 Seuil de cohérence : ${seuil_comparaison} (prompt : ${promptWords} mots)`);
  
  let bestScore = 0;
  let bestIteration = 0;

  for (let i = 0; i < 5; i++) {
    const iterStart = Date.now();//Mesure le temps de début d'itération
    console.log(`\n🔁 Itération ${i + 1}`);
    
    const genStart = Date.now();//Mesure le temps de début de génération
    const d2Code = await generateD2(userPrompt, ragText, feedback);
    timings.generation.push(Date.now() - genStart);

    const cleanCode = d2Code
      .replace(/```d2/g, "")
      .replace(/```/g, "")
      .trim();

    fs.writeFileSync(`out/diagram_iter${i + 1}.d2`, cleanCode);
    
    console.log("🧠 Code D2 généré et nettoyé :\n");

    const compStart = Date.now();//Mesure le temps de début de compilation
    const result = compileD2(`out/diagram_iter${i + 1}.d2`);
    timings.compilation.push(Date.now() - compStart);
    if (result === true) {
      console.log("Génération réussie, vérification sémantique...");//Mesure le temps de début de vérification sémantique
      
      const visionStart = Date.now();//Mesure le temps de début de vision
      const caption = await describeDiagram(`out/diagram_iter${i + 1}.png`);
      timings.vision.push(Date.now() - visionStart);//Mesure le temps de vision
      
      const embStart = Date.now();//Mesure le temps de début d'embedding
      const [embPrompt, embCaption] = await Promise.all([
        embedding(userPrompt),
        embedding(caption),
      ]);
      timings.embedding.push(Date.now() - embStart);//Mesure le temps d'embedding
      
      const sim = await cosineSimilarity(embPrompt, embCaption);//Mesure le temps de similarité
      console.log(`📊 Similarité cosinus : ${sim.toFixed(3)}`);
      
      // Tracker le meilleur score
      if (sim > bestScore) {
        bestScore = sim;
        bestIteration = i + 1;
      }

      if (sim >= seuil_comparaison) {
        timings.iteration.push(Date.now() - iterStart);
        console.log("✅ Cohérence suffisante ! Pipeline terminé avec succès.");
        printPerformanceStats();//
        return;
      } else {
        // Feedback détaillé pour guider le LLM
        feedback = `Similarité actuelle : ${sim.toFixed(3)} (objectif : ${seuil_comparaison}).
        
Ce que Pixtral voit dans l'image : "${caption}"
Ce que l'utilisateur a demandé : "${userPrompt}"

Instructions pour améliorer :
- Utilise des noms DESCRIPTIFS qui correspondent aux termes du prompt
- Respecte EXACTEMENT tous les éléments mentionnés dans : "${userPrompt}"
- Améliore le diagramme précédent au lieu de recommencer
- Choisis les formes D2 appropriées selon le contexte (rectangle, cylinder, circle, person, etc.)`;
      }
    } else {
      feedback = `Erreur de compilation : ${result}`;
    }
    timings.iteration.push(Date.now() - iterStart);//
  }
  console.log(`⚠️ Seuil (${seuil_comparaison}) non atteint. Meilleur score : ${bestScore.toFixed(3)} (itération ${bestIteration})`);
  printPerformanceStats();
}

// --- Affichage des statistiques de performance ---
function printPerformanceStats() {
  console.log("\n" + "=".repeat(50));
  console.log("📊 STATISTIQUES DE PERFORMANCE");
  console.log("=".repeat(50));
  
  const avg = (arr) => arr.length ? (arr.reduce((a,b) => a+b, 0) / arr.length).toFixed(0) : 0;//Calcule la moyenne des temps
  
  console.log(`\n⏱️  Temps moyen par étape :`);
  console.log(`   - Génération D2      : ${avg(timings.generation)} ms`);
  console.log(`   - Compilation        : ${avg(timings.compilation)} ms`);
  console.log(`   - Vision (Pixtral)   : ${avg(timings.vision)} ms`);
  console.log(`   - Embeddings (Gemini): ${avg(timings.embedding)} ms`);
  console.log(`   - Itération complète : ${avg(timings.iteration)} ms`);
  
  console.log(`\n🔢 Nombre d'itérations : ${timings.iteration.length}`);
  
  const total = timings.iteration.reduce((a,b) => a+b, 0);
  console.log(`⏰ Temps total         : ${(total / 1000).toFixed(2)} secondes`);
  console.log("=".repeat(50) + "\n");
  
  // Afficher en JSON pour l'interface web
  const stats = {
    generation: avg(timings.generation),
    compilation: avg(timings.compilation),
    vision: avg(timings.vision),
    embedding: avg(timings.embedding),
    iteration: avg(timings.iteration),
    total_iterations: timings.iteration.length,
    total_time: (total / 1000).toFixed(2)
  };
  
  console.log("STATS_JSON:" + JSON.stringify(stats));
}

main();