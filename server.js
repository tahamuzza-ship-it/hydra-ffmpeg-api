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

// Generador de frases taoístas
function taoPhrase() {
  const frases = [
    "El camino aparece cuando dejas de buscarlo con fuerza.",
    "Cuando el agua se calma, la verdad se refleja.",
    "El guerrero sabio actúa sin ansiedad.",
    "En la quietud, el universo responde.",
    "La fuerza verdadera nace del equilibrio."
  ];
  return frases[Math.floor(Math.random() * frases.length)];
}

// =======================================================
// UNIVERSAL MEDIA PROCESSOR (video/audio/link)
// =======================================================
app.post("/process-media", upload.single("media"), async (req, res) => {
  const stages = { input: null, download: null, audio_extract: null, wav: null };
  const tmpInput = `/tmp/input_${Date.now()}`;
  const tmpWav = `/tmp/output_${Date.now()}.wav`;

  try {
    // ------------------------------
    // 1. DETERMINAR TIPO DE INPUT
    // ------------------------------
    if (req.file) {
      stages.input = "file";
      fs.renameSync(req.file.path, tmpInput);
    } else if (req.body.url) {
      stages.input = "url";
      const video = await axios.get(req.body.url, { responseType: "arraybuffer" });
      fs.writeFileSync(tmpInput, Buffer.from(video.data));
      stages.download = "ok";
    } else {
      stages.input = "text";
      return res.json({
        ok: true,
        type: "text",
        message: "Texto recibido. No hay media para procesar.",
        tao: taoPhrase()
      });
    }

    // ------------------------------
    // 2. EXTRAER AUDIO → WAV
    // ------------------------------
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -y -i "${tmpInput}" -ar 16000 -ac 1 -f wav "${tmpWav}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    stages.audio_extract = "ok";
    stages.wav = "ok";

    // ------------------------------
    // 3. LEER WAV Y CODIFICARLO PARA MAKE
    // ------------------------------
    const wavBuffer = fs.readFileSync(tmpWav);
    const wavBase64 = wavBuffer.toString("base64");

    // ------------------------------
    // 4. RESPUESTA FINAL
    // ------------------------------
    return res.json({
      ok: true,
      type: stages.input,
      message: "Media procesado correctamente.",
      summary: "Audio listo para Whisper u otra IA.",
      insights: [
        "El contenido contiene estructura que puede ser analizada.",
        "Existe un patrón narrativo esperando ser revelado."
      ],
      next_step: "Enviar este audio al módulo Whisper para obtener claridad textual.",
      tao: taoPhrase(),
      wav_base64: wavBase64,
      stages
    });

  } catch (error) {
    console.error("Hydra error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  } finally {
    // Limpieza segura de archivos
    try { if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput); } catch {}
    try { if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav); } catch {}
  }
});

// Puerto
const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Hydra FFmpeg API running on", port));
