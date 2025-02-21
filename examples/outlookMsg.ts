import path from "path";
import MarkItDown from "../src/markitdown";

async function convertToMarkdown() {
  let converter: MarkItDown = new MarkItDown();

  const testFilePath = path.join(__dirname, "./fixtures/sample.msg");
  const result = await converter.convert(testFilePath, {});

  console.log(result?.textContent);
}

convertToMarkdown();
