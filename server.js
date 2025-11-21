import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // sert index.html et images

// Supprime les codes couleurs ANSI des logs
function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
}

// --- Flux temps réel (SSE) ---
app.get("/logs", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const prompt = req.query.prompt;
  if (!prompt) {
    res.write(`data: ⚠️ Aucun prompt reçu\n\n`);
    res.end();
    return;
  }

  const proc = spawn("node", ["pipeline.js", prompt]);
  console.log(`▶️ Pipeline lancé pour ${prompt}`);

  proc.stdout.on("data", (data) => {
    const msg = stripAnsi(data.toString());//Supprime les codes couleurs ANSI des logs

    // Si une image est générée
    const match = msg.match(/diagram_iter(\d+)\.png/);
    if (match) {
      const iter = match[1];
      const file = `out/diagram_iter${iter}.png`;
      if (fs.existsSync(path.join(__dirname, file))) {
        const payload = JSON.stringify({ iter, file });
        res.write(`data: IMAGE:${payload}\n\n`);
      }
    }

    res.write(`data: ${msg}\n\n`);
  });

  proc.stderr.on("data", (data) => {
    let raw = stripAnsi(data.toString());
    // d2 écrit parfois les lignes de succès sur stderr avec couleurs
    if (/success: successfully compiled/i.test(raw)) {
      res.write(`data: ${raw}\n\n`);
    } else {
      const msg = `[ERR] ${raw}`;
      res.write(`data: ${msg}\n\n`);
    }
  });

  proc.on("close", () => {
    // Petit délai pour s'assurer que tous les messages sont envoyés
    setTimeout(() => {
      res.write(`data: [END]\n\n`);
      res.end();
    }, 500);
  });
});

app.listen(3000, () =>
  console.log("🌐 Interface sur http://localhost:3000")
);

