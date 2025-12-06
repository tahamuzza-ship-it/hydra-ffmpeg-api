import express from "express";
import axios from "axios";
import { exec } from "child_process";
import fs from "fs";

const app = express();
app.use(express.json({ limit: "200mb" }));

// Ruta principal
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Hydra FFmpeg API active" });
});

// Convertir video usando FFmpeg
app.post("/transcribe", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing video URL" });
    }

    const input = "/tmp/input.mp4";
    const output = "/tmp/output.wav";

    // Descargar video
    const video = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(input, Buffer.from(video.data));

    // Convertir con ffmpeg
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -i ${input} -ar 16000 -ac 1 -f wav ${output}`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const audio = fs.readFileSync(output);

    // Aquí luego añadimos Whisper o OpenAI Audio API
    res.json({
      ok: true,
      message: "Video convertido a WAV",
      wav_size: audio.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Hydra FFmpeg API running on", port));
