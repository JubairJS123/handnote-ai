import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    })
  : null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash"
  });
});

app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured."
      });
    }

    const question = (req.body.question || "").trim();
    const style = req.body.style || "standard";
    const language = req.body.language || "English";

    if (!question && !req.file) {
      return res.status(400).json({
        error: "Please enter a question or upload an image."
      });
    }

    const prompt = `You are HandNote AI, a helpful study assistant.

Language: ${language}
Answer style: ${style}

Give accurate, clear and student-friendly answers.
Do not invent facts.
For numerical problems, show the important steps.
Use headings and bullet points when useful.
Keep the answer suitable for conversion into handwritten study notes.

If an image is uploaded:
- Carefully read the image.
- Extract important information.
- If it contains a question, solve it.
- If it contains study material, create clear and organized notes.
- Do not unnecessarily describe the image.

Student question:
${question || "Please understand the uploaded image and create clear study notes from it."}`;

    const model =
      process.env.GEMINI_MODEL || "gemini-3.6-flash";

    let contents;

    if (req.file) {
      const mimeType = req.file.mimetype || "image/jpeg";
      const base64 = req.file.buffer.toString("base64");

      contents = [
        {
          text: prompt
        },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64
          }
        }
      ];
    } else {
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model,
      contents
    });

    const answer = response.text;

    if (!answer) {
      console.error("Gemini response:", response);

      return res.status(502).json({
        error: "Gemini returned no text answer."
      });
    }

    res.json({ answer });

  } catch (error) {
    console.error("Gemini error:", error);

    res.status(500).json({
      error: error?.message || "Gemini request failed."
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", () => {
  console.log(`HandNote AI running on port ${port}`);
});
