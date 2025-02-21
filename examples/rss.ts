import MarkItDown from "../src/markitdown";
import path from "path";

async function test(extension: string) {
  let converter: MarkItDown = new MarkItDown();

  const testFilePath = path.join(__dirname, `./fixtures/sample.${extension}`);
  const result = await converter.convert(testFilePath);

  console.log(result?.textContent);
}

test("xml");
// test("atom");
// test("rss");
