import path from "path";
import Groq from "groq-sdk";
import MarkItDown from "../src/markitdown";

async function convertToMarkdown() {
  let converter: MarkItDown = new MarkItDown({
    llmCall: async ({ messages }): Promise<string | null> => {
      if (!messages) return null;
      try {
        const client = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });

        const chatCompletion = await client.chat.completions.create({
          model: "llama-3.2-11b-vision-preview",
          // @ts-expect-error - need to work on ts types for llm calls
          messages,
        });

        return chatCompletion.choices[0].message.content;
      } catch (err) {
        return err instanceof Error ? err.message : null;
      }
    },
  });

  const testFilePath = path.join(__dirname, "./fixtures/sample.png");
  const result = await converter.convert(testFilePath);

  console.log(result?.textContent);
}

convertToMarkdown();
