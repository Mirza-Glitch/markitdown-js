import MarkItDown from "../src/markitdown";
import path from "path";

async function convertToMarkdown() {
  let converter: MarkItDown = new MarkItDown();

  const testFilePath = path.join(__dirname, "./fixtures/sample.txt");
  const result = await converter.convertLocal(testFilePath, {});

  console.log(result);
}

convertToMarkdown();
