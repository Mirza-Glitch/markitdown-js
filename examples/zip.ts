import MarkItDown from "../src/markitdown";
import path from "path";

async function convertToMarkdown() {
  let converter: MarkItDown = new MarkItDown();

  const testFilePath = path.join(__dirname, "./fixtures/sample.zip");
  const result = await converter.convert(testFilePath, {});

  console.log(result);
}

convertToMarkdown();
