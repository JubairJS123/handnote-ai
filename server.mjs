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

/* =========================================================
   GEMINI
========================================================= */

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    })
  : null;


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash"
  });
});


/* =========================================================
   UNICODE MATH
========================================================= */

const subscriptMap = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  "a": "ₐ",
  "e": "ₑ",
  "h": "ₕ",
  "i": "ᵢ",
  "j": "ⱼ",
  "k": "ₖ",
  "l": "ₗ",
  "m": "ₘ",
  "n": "ₙ",
  "o": "ₒ",
  "p": "ₚ",
  "r": "ᵣ",
  "s": "ₛ",
  "t": "ₜ",
  "u": "ᵤ",
  "v": "ᵥ",
  "x": "ₓ"
};

const superscriptMap = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  "n": "ⁿ",
  "i": "ⁱ"
};

function toSubscript(value) {
  return String(value)
    .split("")
    .map(char => subscriptMap[char] || char)
    .join("");
}

function toSuperscript(value) {
  return String(value)
    .split("")
    .map(char => superscriptMap[char] || char)
    .join("");
}


/* =========================================================
   LATEX → NORMAL MATHEMATICAL NOTATION
========================================================= */

function cleanMath(text) {
  let value = String(text);

  /* Remove display math markers */

  value = value.replace(/\\\[/g, "");
  value = value.replace(/\\\]/g, "");
  value = value.replace(/\\\(/g, "");
  value = value.replace(/\\\)/g, "");

  value = value.replace(/\$\$/g, "");
  value = value.replace(/\$/g, "");


  /* Fractions */

  value = value.replace(
    /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
    "($1)/($2)"
  );

  value = value.replace(
    /\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
    "($1)/($2)"
  );


  /* Square root */

  value = value.replace(
    /\\sqrt\s*\{([^{}]+)\}/g,
    "√($1)"
  );

  value = value.replace(
    /\\sqrt\s*([A-Za-z0-9]+)/g,
    "√$1"
  );


  /* Common mathematical symbols */

  const symbols = {
    "\\times": "×",
    "\\cdot": "·",
    "\\div": "÷",
    "\\pm": "±",
    "\\mp": "∓",
    "\\leq": "≤",
    "\\le": "≤",
    "\\geq": "≥",
    "\\ge": "≥",
    "\\neq": "≠",
    "\\approx": "≈",
    "\\equiv": "≡",
    "\\sim": "∼",
    "\\propto": "∝",
    "\\rightarrow": "→",
    "\\to": "→",
    "\\leftarrow": "←",
    "\\Rightarrow": "⇒",
    "\\Leftarrow": "⇐",
    "\\leftrightarrow": "↔",
    "\\infty": "∞",
    "\\partial": "∂",
    "\\nabla": "∇",
    "\\sum": "Σ",
    "\\prod": "Π",
    "\\int": "∫",
    "\\oint": "∮",
    "\\pm": "±",
    "\\degree": "°"
  };

  for (const [latex, symbol] of Object.entries(symbols)) {
    value = value.replaceAll(latex, symbol);
  }


  /* Greek letters */

  const greek = {
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\delta": "δ",
    "\\epsilon": "ε",
    "\\varepsilon": "ε",
    "\\zeta": "ζ",
    "\\eta": "η",
    "\\theta": "θ",
    "\\vartheta": "ϑ",
    "\\iota": "ι",
    "\\kappa": "κ",
    "\\lambda": "λ",
    "\\mu": "μ",
    "\\nu": "ν",
    "\\xi": "ξ",
    "\\pi": "π",
    "\\rho": "ρ",
    "\\sigma": "σ",
    "\\tau": "τ",
    "\\upsilon": "υ",
    "\\phi": "φ",
    "\\varphi": "φ",
    "\\chi": "χ",
    "\\psi": "ψ",
    "\\omega": "ω",

    "\\Gamma": "Γ",
    "\\Delta": "Δ",
    "\\Theta": "Θ",
    "\\Lambda": "Λ",
    "\\Xi": "Ξ",
    "\\Pi": "Π",
    "\\Sigma": "Σ",
    "\\Phi": "Φ",
    "\\Psi": "Ψ",
    "\\Omega": "Ω"
  };

  for (const [latex, symbol] of Object.entries(greek)) {
    value = value.replaceAll(latex, symbol);
  }


  /* Text / formatting commands */

  value = value.replace(
    /\\text\s*\{([^{}]*)\}/g,
    "$1"
  );

  value = value.replace(
    /\\mathrm\s*\{([^{}]*)\}/g,
    "$1"
  );

  value = value.replace(
    /\\mathbf\s*\{([^{}]*)\}/g,
    "$1"
  );

  value = value.replace(
    /\\operatorname\s*\{([^{}]*)\}/g,
    "$1"
  );


  /* Remove LaTeX positioning commands */

  value = value.replace(/\\left/g, "");
  value = value.replace(/\\right/g, "");

  value = value.replace(/\\,/g, " ");
  value = value.replace(/\\;/g, " ");
  value = value.replace(/\\!/g, "");
  value = value.replace(/\\quad/g, " ");
  value = value.replace(/\\qquad/g, " ");


  /* Braced superscripts */

  value = value.replace(
    /\^\{([^{}]+)\}/g,
    (_, content) => toSuperscript(content)
  );


  /* Braced subscripts */

  value = value.replace(
    /_\{([^{}]+)\}/g,
    (_, content) => toSubscript(content)
  );


  /* Number superscripts */

  value = value.replace(
    /\^([0-9]+)/g,
    (_, content) => toSuperscript(content)
  );


  /* Number subscripts */

  value = value.replace(
    /_([0-9]+)/g,
    (_, content) => toSubscript(content)
  );


  /* Single-letter superscripts */

  value = value.replace(
    /\^([a-zA-Z])/g,
    (_, content) => toSuperscript(content)
  );


  /* Single-letter subscripts */

  value = value.replace(
    /_([a-zA-Z])/g,
    (_, content) => toSubscript(content)
  );


  /* Common plain-text chemistry patterns */

  value = value.replace(
    /\b(C|H|O|N|S|P|Cl|Na|K|Ca|Mg|Fe|Cu|Zn|Al|CO|NO|SO|NH|OH|HCl|HNO|H₂SO)_(\d+)/g,
    (_, element, number) =>
      element + toSubscript(number)
  );


  /* CO2 / H2O etc. */

  value = value.replace(
    /\b(CO|H|O|N|SO|NO|NH|OH|CH|C)(\d+)\b/g,
    (_, element, number) =>
      element + toSubscript(number)
  );


  /* Clean remaining backslashes */

  value = value.replace(/\\/g, "");


  /* Clean excessive spaces */

  value = value.replace(/[ \t]{2,}/g, " ");

  return value.trim();
}


/* =========================================================
   CLEAN AI RESPONSE
========================================================= */

function cleanAIResponse(text) {
  let clean = String(text || "");

  /* Remove Markdown code blocks */

  clean = clean.replace(
    /```(?:text|latex|math|markdown|plaintext|python|javascript)?/gi,
    ""
  );

  clean = clean.replace(/```/g, "");


  /* Remove Markdown heading symbols */

  clean = clean.replace(
    /^\s*#{1,6}\s*/gm,
    ""
  );


  /* Remove bold markers */

  clean = clean.replace(/\*\*(.*?)\*\*/gs, "$1");
  clean = clean.replace(/__(.*?)__/gs, "$1");


  /* Remove unnecessary italic markers */

  clean = clean.replace(
    /(?<!\*)\*(?!\s)(.*?)(?<!\*)\*(?!\*)/gs,
    "$1"
  );


  /* Remove Markdown horizontal rules */

  clean = clean.replace(
    /^\s*[-*_]{3,}\s*$/gm,
    ""
  );


  /* Convert mathematical notation */

  clean = cleanMath(clean);


  /* Convert common plain-text notation */

  clean = clean.replace(
    /\bCO_2\b/gi,
    "CO₂"
  );

  clean = clean.replace(
    /\bH_2O\b/gi,
    "H₂O"
  );

  clean = clean.replace(
    /\bO_2\b/g,
    "O₂"
  );

  clean = clean.replace(
    /\bN_2\b/g,
    "N₂"
  );

  clean = clean.replace(
    /\bH_2\b/g,
    "H₂"
  );

  clean = clean.replace(
    /\bCH_4\b/g,
    "CH₄"
  );


  /* Remove excessive blank lines */

  clean = clean.replace(
    /\n{3,}/g,
    "\n\n"
  );


  return clean.trim();
}


/* =========================================================
   AI PROMPT
========================================================= */

function buildPrompt({
  language,
  style,
  question,
  hasImage
}) {

  return `
You are HandNote AI, an advanced academic study assistant.

The student may be studying school, college, university, competitive-exam,
or research/PhD-level subjects.

TARGET LANGUAGE:
${language}

ANSWER STYLE:
${style}

IMPORTANT OUTPUT RULES:

1. Give the answer directly. Do not talk about being an AI.

2. NEVER write programming code unless the student's question specifically
asks for programming code.

3. NEVER put the answer inside Markdown code blocks.

4. NEVER use LaTeX commands such as:
\\frac, \\sqrt, \\times, \\alpha, \\beta, etc.
Instead use readable mathematical symbols.

5. Mathematical notation must look like normal handwritten mathematics.

Examples:
CO_2 → CO₂
H_2O → H₂O
O_2 → O₂
x^2 → x²
x^3 → x³
a_n → aₙ
√x → √x
π → π
∞ → ∞
≤ → ≤
≥ → ≥
≠ → ≠
∫ → ∫
∑ → Σ

6. For chemistry, use proper chemical formulas with Unicode subscripts.

7. For mathematics, physics and chemistry, preserve equations accurately.
Do not replace equations with programming syntax.

8. For differential equations, calculus, algebra, geometry, mechanics,
electromagnetism, quantum mechanics, statistics and advanced mathematics,
use proper readable mathematical notation.

9. Show important calculation steps for numerical problems.

10. Use simple headings and bullet points where useful.

11. Keep the response clean enough to become a handwritten study note.

12. Do not unnecessarily describe an uploaded image.

13. If the uploaded image contains a question, solve it.

14. If the uploaded image contains study material, extract the important
information and organize it into useful notes.

15. Preserve Hindi and Assamese characters exactly and naturally when that
language is selected. Do not transliterate them into English.

16. Do not output HTML.

17. Do not output JSON.

18. Do not output Markdown code.

19. Do not add unnecessary phrases such as "Here is your answer".

STUDENT QUESTION:
${question || "Understand the uploaded image and create clear, organized study notes."}

IMAGE UPLOADED:
${hasImage ? "YES" : "NO"}
`;
}


/* =========================================================
   CHAT API
========================================================= */

app.post(
  "/api/chat",
  upload.single("file"),
  async (req, res) => {

    try {

      if (!ai) {

        return res.status(503).json({
          error: "Gemini API key is not configured."
        });

      }


      const question =
        (req.body.question || "").trim();

      const style =
        req.body.style || "standard";

      const language =
        req.body.language || "English";


      if (!question && !req.file) {

        return res.status(400).json({
          error:
            "Please enter a question or upload an image."
        });

      }


      const prompt =
        buildPrompt({
          language,
          style,
          question,
          hasImage: Boolean(req.file)
        });


      const model =
        process.env.GEMINI_MODEL ||
        "gemini-3.6-flash";


      let contents;


      /* =====================================================
         IMAGE REQUEST
      ===================================================== */

      if (req.file) {

        const mimeType =
          req.file.mimetype || "image/jpeg";

        const base64 =
          req.file.buffer.toString("base64");


        contents = [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType,
              data: base64
            }
          }
        ];

      }

      /* =====================================================
         NORMAL TEXT REQUEST
      ===================================================== */

      else {

        contents = prompt;

      }


      /* =====================================================
         GEMINI
      ===================================================== */

      const response =
        await ai.models.generateContent({
          model,
          contents
        });


      let answer =
        response.text;


      if (!answer) {

        console.error(
          "Gemini response:",
          response
        );

        return res.status(502).json({
          error:
            "Gemini returned no text answer."
        });

      }


      /* =====================================================
         FINAL SERVER-SIDE CLEANING
      ===================================================== */

      answer =
        cleanAIResponse(answer);


      if (!answer) {

        return res.status(502).json({
          error:
            "Gemini returned an empty cleaned answer."
        });

      }


      res.json({
        answer,
        language,
        style
      });


    } catch (error) {

      console.error(
        "Gemini error:",
        error
      );


      res.status(500).json({
        error:
          error?.message ||
          "Gemini request failed."
      });

    }

  }
);


/* =========================================================
   FRONTEND
========================================================= */

app.get(/.*/, (_req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


/* =========================================================
   SERVER
========================================================= */

const port =
  Number(
    process.env.PORT || 3000
  );


app.listen(
  port,
  "0.0.0.0",
  () => {

    console.log(
      `HandNote AI running on port ${port}`
    );

  }
);
