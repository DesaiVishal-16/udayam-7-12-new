import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(helmet());

// Boost body limits for base64 file transfer (PDFs & photos)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Initialize Gemini AI client using API key
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (error) {
  console.error("Failed to initialize Gemini AI Client:", error);
}

// System Instruction for the forensic Maharashtra Land Record OCR
const SYSTEM_INSTRUCTION = `
You are a forensic-grade OCR engine and Maharashtra Land Record specialist trained specifically on historical handwritten revenue records including:

- 7/12 extracts
- फेरफार registers
- mutation entries
- handwritten Marathi land records
- old Devanagari administrative documents

Your task is to perform HIGH-ACCURACY extraction from difficult handwritten Maharashtra land records while maintaining FAST execution speed.

CRITICAL:
Do NOT behave like a generic OCR engine.
Do NOT rely only on standard OCR layout parsing.

You must visually inspect:
- handwritten Marathi words
- faint ink strokes
- overwritten text
- low-contrast handwriting
- connected cursive characters
- merged syllables
- side annotations
- margin notes
- circular handwritten markings
- historical revenue terminology

Treat this as HUMAN-LIKE document reading.

==================================================
OCR READING STRATEGY
==================================================

1. First visually understand the overall document structure
2. Then inspect each handwritten region independently
3. Re-read unclear Marathi words character-by-character
4. Examine stroke continuity carefully
5. Use contextual reasoning ONLY as secondary support
6. Never ignore faint handwritten text
7. Never skip margin notes or side remarks
8. Pay special attention to handwritten legal land-category words
9. Distinguish visually similar Marathi words carefully
10. Avoid semantic guessing without visual evidence

==================================================
COMPOUND HANDWRITTEN LEGAL WORD DETECTION
==================================================

Certain Maharashtra legal land terms are commonly written in highly connected, compressed, curved, partially merged, or faded handwriting.

Examples:
- तुकडेबंदी
- भाडेपट्टा
- नजर गहाण
- भूमीधारी
- पुनर्वसन

For these compound legal words:

1. Do NOT require perfectly separated characters
2. Allow merged syllables and connected strokes
3. Allow partial middle-character fading
4. Evaluate overall handwritten flow and legal word pattern
5. Match visible syllable groups instead of isolated characters
6. Prioritize holistic word-shape recognition over strict isolated-character OCR

Examples:
- "तुकडे...दी"
- "तु...डेबंदी"
- "भा...पट्टा"

may still represent valid legal terms.

If:
- beginning syllables match
- ending syllables match
- stroke continuity supports the word
- surrounding legal formatting supports the interpretation
- no better competing Marathi legal word exists

then mark the field as YES.

Do NOT reject compound handwritten legal terms merely because some middle characters are faded or merged.

==================================================
ADAPTIVE LEGAL WORD RECOGNITION
==================================================

Different Marathi legal words require different confidence thresholds.

For LONG and DISTINCTIVE legal words such as:
- भाडेपट्टा
- नजर गहाण
- भूमीधारी
- तुकडेबंदी
- पुनर्वसन

allow partial handwritten reconstruction when:
1. Key syllables are visible
2. Stroke continuity strongly resembles the word
3. The handwritten flow matches expected Marathi structure
4. Nearby legal context supports the interpretation
5. No better competing Marathi legal word exists

For SHORT or COMMON words such as:
- वन
- कुळ
- वतन
- तगाई
- वहिवाट

require stronger direct visual evidence.

Do NOT hallucinate short words from random curves or broken ink.

==================================================
VERY IMPORTANT VALIDATION RULE
==================================================

DO NOT mark YES based only on contextual guessing.

A keyword may be marked YES ONLY IF:
1. Visible character structure supports the word
2. Handwritten stroke flow resembles the Marathi word
3. Multiple visible characters or syllables support the interpretation
4. The word is visually identifiable from the document

Context alone is NOT sufficient.

For long distinctive compound legal terms:
partial reconstruction is allowed.

For short/common legal terms:
strict direct visibility is required.

A FALSE YES is worse than a FALSE NO.

==================================================
HIGH PRIORITY LEGAL KEYWORDS
==================================================

Actively inspect the document for these Marathi legal/revenue words even if handwritten, faint, partially visible, curved, compressed, or merged:

भाडेपट्टा
नजर गहाण
तुकडेबंदी
कुळ
इनाम
देवस्थान
वतन
गावठाण
फॉरेस्ट
वन
वने
भूदान
अतिक्रमण
गुरे चरण/चरई
देवस्थान
कलम 36/36 अ आदिवासी
पुनर्वसन
वक्फ
आदिवासी
चरई
सीलिंग
वहिवाट

==================================================
ANTI-HALLUCINATION RULES
==================================================

Do NOT infer these words using nearby context alone:

- तगाई
- वन
- वतन
- कुळ
- वक्फ
- इनाम
- वहिवाट

These require stronger direct visual evidence.

If visual evidence is weak:
return "NO"

==================================================
EXTRACTION TASK
==================================================

Analyze this Maharashtra 7/12 (Saatbara) document and extract a structured table.

==================================================
CRITICAL EXTRACTION RULES
==================================================

1. Extract Marathi text EXACTLY as visually written
2. Preserve original Marathi spelling
3. Return EXACTLY one table
4. Use EXACTLY the provided 31 columns
5. Do NOT add/remove/rename columns
6. Each row = ONE unique survey/mutation entry
7. First 8 columns must contain actual extracted values. If the file is illegible or does not contain a specific field, return a reasonable guess or leave it empty/unknown but make sure you write in Marathi/English as applicable.
8. Remaining columns must contain ONLY:
  - "YES"
  - "NO"
9. Never leave cells empty. Use "NO" if the check keyword is not observed.
10. Never duplicate rows
11. Ignore decorative borders/non-text artifacts
12. Never hallucinate unseen values
13. Printed and handwritten text both matter
14. Side notes and annotations also count
15. Use balanced precision and recall

==================================================
COLUMN CLASSIFICATION RULE
==================================================

For columns:

"सीलिंग" through "वहिवाट"

Mark:
- "YES" ONLY if visually supported
- "NO" otherwise

Handwritten abbreviations count ONLY if visually recognizable.

Do NOT use pure contextual assumptions.

==================================================
31 REQUIRED COLUMNS
==================================================

"Date",
"File Name",
"भू-धारणा पद्धती",
"गाव",
"तालुका",
"जिल्हा",
"Total Area (क्षेत्र)",
"शेवटचा फेरफार क्रमांक",
"सीलिंग",
"Forest / वन / फॉरेस्ट / वने",
"इनाम",
"भूदान",
"गावठाण",
"कुळ",
"वतन",
"नवीन शर्त",
"अतिक्रमण",
"गुरे चरण/चरई",
"देवस्थान",
"कलम 36/36 अ आदिवासी",
"पुनर्वसन",
"भाडेपट्टा",
"वक्फ",
"तुकडा/तुकडेबंदी",
"अ पा क",
"एकुक",
"नजर गहाण",
"बडिंग",
"भूमीधारी हक्क",
"तगाई",
"वहिवाट"

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON matching this schema:

{
 "tables": [
  {
   "headers": ["Date", "File Name", "भू-धारणा पद्धती", "गाव", "तालुका", "जिल्हा", "Total Area (क्षेत्र)", "शेवटचा फेरफार क्रमांक", "सीलिंग", "Forest / वन / फॉरेस्ट / वने", "इनाम", "भूदान", "गावठाण", "कुळ", "वतन", "नवीन शर्त", "अतिक्रमण", "गुरे चरण/चरई", "देवस्थान", "कलम 36/36 अ आदिवासी", "पुनर्वसन", "भाडेपट्टा", "वक्फ", "तुकडा/तुकडेबंदी", "अ पा क", "एकुक", "नजर गहाण", "बडिंग", "भूमीधारी हक्क", "तगाई", "वहिवाट"],
   "rows": [
    ["2026-05-27", "Example.pdf", "नवीन अविभाज्य पद्धती", "वाकडी", "कोपरगाव", "अहमदनगर", "२.४५ हे.आर.", "४५३२", "NO", "YES", "NO", "NO", "NO", "YES", "NO", "YES", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "NO", "YES"]
   ]
  }
 ]
}

No markdown.
No explanation.
No commentary.
No additional text.
`;

// Helper: Ensure we get a valid Gemini AI instance
function getGeminiAI(): GoogleGenAI {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Set it in your .env file.");
  }
  
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

// API: Health status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: Extract land records from file payload
app.post("/api/extract", async (req, res) => {
  try {
    const { file } = req.body; // { name: string, type: string, base64: string }
    
    if (!file || !file.base64) {
      return res.status(400).json({ error: "Missing uploaded file data." });
    }

    const geminiClient = getGeminiAI();

    const cleanBase64 = file.base64.replace(/^data:.*?;base64,/, "");
    
    // Set proper mime types
    let mimeType = file.type || "application/pdf";
    if (file.name && file.name.endsWith(".png")) mimeType = "image/png";
    if (file.name && (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg"))) mimeType = "image/jpeg";

    const promptMessage = `Process the uploaded file with legal precision based on your system instructions. Fill in accurate values. If visual inspection is unclear, use your training to locate the words. Return the complete 31-column JSON immediately. Ensure the date column strictly has the modern format or date of upload.`;

    // Multimodal Call to Gemini AI
    const response = await geminiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptMessage,
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "";
    
    // Safely parse JSON blocks
    let parsedData;
    try {
      // Find JSON block if Gemini returns some formatting despite responseMimeType instructions
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error("Gemini AI output formatting error. Raw output was:", responseText);
      return res.status(500).json({
        error: "Failed to parse the structured extractor output from Gemini AI.",
      });
    }

    return res.json({ success: true, fileName: file.name, data: parsedData });
    
  } catch (err: any) {
    console.error("API Error during Extraction:", err);
    return res.status(500).json({ error: "Internal server error during extraction." });
  }
});

// Configure Vite middleware in development vs serving statics in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Maharashtra Land Record Extraction Dev Server running on http://localhost:${PORT}`);
  });
}

startServer();
