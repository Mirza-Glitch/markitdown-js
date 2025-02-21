import path from "path";
import Groq from "groq-sdk";
import MarkItDown from "../src/markitdown";

async function convertToMarkdown() {
  let converter: MarkItDown = new MarkItDown({
    llmCall: async ({ messages, file }): Promise<string | null> => {
      try {
        const client = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });
        if (messages) {
          const chatCompletion = await client.chat.completions.create({
            model: "llama-3.2-11b-vision-preview",
            // @ts-expect-error - need to work on ts types for llm calls
            messages,
          });

          return chatCompletion.choices[0].message.content;
        } else if (file) {
          const chatCompletion = await client.audio.transcriptions.create({
            file: file,
            model: "whisper-large-v3-turbo",
            language: "en",
          });

          return chatCompletion.text;
        }
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : null;
      }
    },
  });

  const audioFilePath = path.join(__dirname, "./fixtures/sample.wav");
  const imageFilePath = path.join(__dirname, "./fixtures/sample.png");
  const audioResult = await converter.convert(audioFilePath);
  const imageResult = await converter.convert(imageFilePath);

  console.log(audioResult?.textContent);
  console.log(imageResult?.textContent);
}

convertToMarkdown();
