import path from "path";
import Groq from "groq-sdk";
import MarkItDown from "../src/markitdown";

async function convertToMarkdown() {
  let converter: MarkItDown = new MarkItDown({
    llmCall: async ({ file }): Promise<string | null> => {
      if (!file) return null;
      try {
        const client = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });

        const chatCompletion = await client.audio.transcriptions.create({
          // @ts-expect-error - need to work on ts types for llm calls
          file: file,
          model: "whisper-large-v3-turbo",
          language: "en",
        });

        return chatCompletion.text;
      } catch (err) {
        return err instanceof Error ? err.message : null;
      }
    },
  });

  const testFilePath = path.join(__dirname, "./fixtures/sample.wav");
  const result = await converter.convert(testFilePath);

  console.log(result?.textContent);
}

convertToMarkdown();
