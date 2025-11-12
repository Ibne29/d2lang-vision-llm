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
    const msg = data.toString();

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
    const msg = `[ERR] ${data.toString()}`;
    res.write(`data: ${msg}\n\n`);
  });

  proc.on("close", () => {
    res.write(`data: [END]\n\n`);
    res.end();
  });
});

app.listen(3000, () =>
  console.log("🌐 Interface sur http://localhost:3000")
);
