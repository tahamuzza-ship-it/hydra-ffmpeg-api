import express from "express";
import axios from "axios";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(express.json({ limit: "200mb" }));

// Multer para manejar archivos temporales
const upload = multer({ dest: "/tmp" });

// Ruta principal
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Hydra FFmpeg API active" });
});

// ================================
// EXTRACT AUDIO (MP3)
// ================================
app.post("/extract-audio", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const inputPath = req.file.path;
    const outputPath = `${inputPath}.mp3`;

    ffmpeg(inputPath)
      .output(outputPath)
      .on("end", () => {
        res.download(outputPath, "audio.mp3", () => {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        });
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: "FFmpeg processing failed", details: err });
      })
      .run();

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server crashed", details: error });
  }
});

// ================================
// TRANSCODE VIDEO → WAV (Mono 16kHz)
// ================================
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
      exec(`ffmpeg -y -i "${input}" -ar 16000 -ac 1 -f wav "${output}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const audio = fs.readFileSync(output);

    res.json({
      ok: true,
      message: "Video convertido a WAV",
      wav_size: audio.length,
      hint: "Listo para Whisper o GPT-4o Audio"
    });

    // Limpieza
    fs.unlinkSync(input);
    fs.unlinkSync(output);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Puerto
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Hydra FFmpeg API running on", port));
