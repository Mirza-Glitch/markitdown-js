import MarkItDown from "../src/markitdown";

async function test(url: string) {
  let converter: MarkItDown = new MarkItDown();

  const result = await converter.convert(url);

  const data = result?.textContent;
  console.log(data);
}

test("https://www.bing.com/search?q=javascript");
