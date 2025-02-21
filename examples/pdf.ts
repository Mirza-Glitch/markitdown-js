import MarkItDown from "../src/markitdown.js";
import path from "path";

async function convertToMarkdown() {
  let converter = new MarkItDown();

  const testFilePath = path.join(__dirname, "./fixtures/sample.pdf");
  const result = await converter.convert(testFilePath, {});

  console.log(result);
}

convertToMarkdown();
