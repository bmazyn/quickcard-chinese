import http from "http";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/lookup") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";

  req.on("data", chunk => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const { word } = JSON.parse(body);

const prompt = `
You translate English words for a beginner Mandarin learner.

Return ONLY valid JSON.
No markdown.
No explanation.
No text before or after the JSON.

Use this exact structure:

{
  "english": "${word}",
  "choices": [
    {
      "hanzi": "Chinese word",
      "meaning": "short English meaning",
      "example": "short beginner Chinese sentence",
      "exampleEnglish": "English translation"
    }
  ]
}

Rules:
- Choose the most useful everyday Mandarin translation.
- If the English word has multiple common meanings, include up to 3 choices.
- Keep examples short and beginner-friendly.
- Do not generate pinyin.
- Do not add 的 unless it is actually required.
- Every example must be a complete natural sentence.

Word: ${word}
`;

      const ollamaResponse = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen2.5:7b",
          prompt,
          stream: false
        })
      });

      const data = await ollamaResponse.json();

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        word,
        result: data.response
      }));
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        error: String(error)
      }));
    }
  });
});

server.listen(3001, () => {
  console.log("Lookup server running on http://localhost:3001");
});