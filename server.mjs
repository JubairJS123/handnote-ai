
import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "AI server is running, but OPENAI_API_KEY is not configured."
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const question = (req.body.question || "").trim();
    const style = req.body.style || "standard";
    const language = req.body.language || "English";

    if (!question && !req.file) {
      return res.status(400).json({ error: "Please enter a question or upload an image." });
    }

    const content = [{
      type: "input_text",
      text:
        `You are HandNote AI, a helpful study assistant for students.
Answer accurately and clearly. Language: ${language}.
Answer style requested by the student: ${style}.
If this is a school/college question, make the answer suitable for the student's level.
Show working for numerical problems when useful. Do not invent facts.
Student question: ${question || "(Question is in the uploaded image.)"}`
    }];

    if (req.file) {
      const mime = req.file.mimetype || "image/jpeg";
      const base64 = req.file.buffer.toString("base64");
      content.push({
        type: "input_image",
        image_url: `data:${mime};base64,${base64}`
      });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      input: [{ role: "user", content }]
    });

    res.json({ answer: response.output_text || "I couldn't generate an answer." });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err?.message || "AI request failed."
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log(`HandNote AI running on port ${port}`);
});
