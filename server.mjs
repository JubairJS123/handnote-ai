import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "AI server is running, but GEMINI_API_KEY is not configured."
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

    const parts = [
      {
        text: `You are HandNote AI, a helpful study assistant for students.

Answer accurately and clearly.
Language: ${language}.
Answer style requested by the student: ${style}.
If this is a school/college question, make the answer suitable for the student's level.
Show working for numerical problems when useful.
Do not invent facts.

Student question: ${question || "(Question is in the uploaded image.)"}`
      }
    ];

    if (req.file) {
      const mime = req.file.mimetype || "image/jpeg";
      const base64 = req.file.buffer.toString("base64");

      parts.push({
        inline_data: {
          mime_type: mime,
          data: base64
        }
      });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    res.json({
      answer: answer || "I couldn't generate an answer."
    });

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
