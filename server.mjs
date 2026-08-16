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
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
  });
});

// AI chat
app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
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

    const prompt = `You are HandNote AI, a helpful AI study assistant for students.

Language: ${language}
Answer style: ${style}

Rules:
- Give accurate and understandable answers.
- Do not invent facts.
- For numerical questions, show the important steps.
- For school or college questions, make the answer suitable for the student's level.
- Use headings and bullet points when useful.
- Keep the answer clean so it can later be converted into handwritten notes.

Student question:
${question || "The student has uploaded an image. Understand the image and answer appropriately."}`;

    const input = [];

    input.push({
      type: "text",
      text: prompt
    });

    // Add uploaded image
    if (req.file) {
      const mimeType = req.file.mimetype || "image/jpeg";
      const base64 = req.file.buffer.toString("base64");

      input.push({
        type: "image",
        data: `data:${mimeType};base64,${base64}`
      });
    }

    const model =
      process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: model,
          input: input
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    let answer = "";

    if (Array.isArray(data.outputs)) {
      answer = data.outputs
        .map(output => {
          if (typeof output === "string") return output;

          if (output?.text) return output.text;

          if (output?.content) {
            if (typeof output.content === "string") {
              return output.content;
            }

            if (Array.isArray(output.content)) {
              return output.content
                .map(item => item?.text || "")
                .join("");
            }
          }

          return "";
        })
        .join("")
        .trim();
    }

    // Support newer response structure if returned
    if (!answer && Array.isArray(data.steps)) {
      answer = data.steps
        .map(step => step?.text || "")
        .join("")
        .trim();
    }

    res.json({
      answer: answer || "I couldn't generate an answer."
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: error?.message || "AI request failed."
    });
  }
});

// Send the website
app.get(/.*/, (_req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", () => {
  console.log(`HandNote AI running on port ${port}`);
});
