import MarkItDown from "../src/markitdown";

async function test(url: string) {
  let converter: MarkItDown = new MarkItDown();

  const result = await converter.convert(url);

  const data = result?.textContent;
  console.log(data);
}

test("https://www.youtube.com/watch?v=e5dhaQm_J6U");
// test("https://www.youtube.com/playlist?list=PLYxzS__5yYQkbxXeZiL4gpRF_rLjScEui");

// import axios from "axios";

// const response = await axios.get(
//   "https://www.youtubetranscript.com/?server_vid2=e5dhaQm_J6U"
// );
// const html = parse(response.data);
// html.querySelector("xml")?.remove();
// const text = html.innerText;

// console.log(html.querySelector("transcript")?.toString());
