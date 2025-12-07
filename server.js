import express from "express";
import axios from "axios";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(express.json({ limit: "200mb" }));

// Multer para archivos temporales
const upload = multer({ dest: "/tmp" });

// Utilidad para frase taoísta
function taoPhrase() {
  const frases = [
    "Cuando el agua se calma, la verdad se refleja.",
    "El camino aparece cuando dejas de buscarlo con fuerza.",
    "Nada que sea tuyo puede perderte; nada que te pierda era tuyo.",
    "La mente que se vacía, encuentra dirección.",
    "Si el ruido cae, la decisión sube.",
    "La claridad es un filo que no corta, revela.",
    "El paso correcto siempre es el más simple."
  ];
  return frases[Math.floor(Math.random() * frases.length)];
}

// ================================
// UNIVERSAL MEDIA PROCESSOR
// ================================
app.post("/process-media", upload.single("media"), async (req, res) => {
  const stages = {};

  try {
    // Detectar el tipo de input
    const hasFile = !!req.file;
    const hasUrl = req.body.url;
    const hasText = req.body.text;

    let inputPath = null;

    // ========================================
    // 1) PROCESAR ARCHIVO SUBIDO
    // ========================================
    if (hasFile) {
      stages.input = "file";
      inputPath = req.file.path;
    }

    // ========================================
    // 2) PROCESAR URL → descargar archivo
    // ========================================
    else if (hasUrl) {
      stages.input = "url";
      const url = req.body.url;

      try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        inputPath = "/tmp/input_from_url";
        fs.writeFileSync(inputPath, Buffer.from(response.data));
        stages.download = "ok";
      } catch (err) {
        return res.status(400).json({
          ok: false,
          error: "No se pudo descargar el archivo desde la URL.",
          details: err.message,
          tao: taoPhrase()
        });
      }
    }

    // ========================================
    // 3) SOLO TEXTO → pasa directo a análisis
    // ========================================
    else if (hasText) {
      stages.input = "text";

      return res.json({
        ok: true,
        type: "text",
        summary: req.body.text,
        insight: "Tu pensamiento tiene un patrón detectable.",
        next_step: "Define qué parte de esta reflexión es acción y cuál es ruido.",
        tao: taoPhrase(),
        stages
      });
    }

    else {
      return res.status(400).json({
        ok: false,
        error: "No se envió archivo, texto ni URL.",
        tao: taoPhrase()
      });
    }

    // ========================================
    // 4) EXTRAER AUDIO
    // ========================================
    const outputWav = `${inputPath}.wav`;

    try {
      await new Promise((resolve, reject) => {
        exec(`ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputWav}"`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      stages.audio_extract = "ok";
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "FFmpeg falló al convertir el archivo.",
        details: err.message,
        tao: taoPhrase(),
        stages
      });
    }

    // ========================================
    // 5) TRANSCODIFICACIÓN → listo para Whisper
    // ========================================
    const wavBuffer = fs.readFileSync(outputWav);
    stages.wav = "ok";

    // ========================================
    // RESPUESTA FINAL (versión Hydra Tao)
    // ========================================
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
      stages
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "El servidor falló.",
      details: err.message,
      tao: taoPhrase()
    });
  }
});

// Puerto
const port = process.env.PORT || 8080;
app.listen(port, () => console.log("Hydra FFmpeg API running on", port));
