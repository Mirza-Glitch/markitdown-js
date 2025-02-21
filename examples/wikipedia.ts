import path from "path";
import fs from "fs";
import MarkItDown from "../src/markitdown";

async function convertToMarkdown() {
  let converter: MarkItDown = new MarkItDown();

  const testFilePath =
    "https://en.wikipedia.org/wiki/Andromeda_(constellation)";
  const result = await converter.convert(testFilePath);

  const data = result?.textContent;
  console.log(data);
  if (data)
    fs.writeFileSync(path.join(__dirname, "./fixtures/wikipedia.md"), data);
}

convertToMarkdown();
