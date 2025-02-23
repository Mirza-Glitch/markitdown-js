import fs from "fs";
import path from "path";
import DocumentConverter from "../src/converters/document";
import {
  type ConversionOptions,
  type DocumentConverterResult,
} from "../src/types/document";
import Markitdown from "../src/markitdown";

class CustomParser extends DocumentConverter {
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    if (options.fileExtension !== ".my-extension") return null;

    const content = fs.readFileSync(localPath, "utf8");
    // your logic toparse the content as markdown string
    const textContent = content.replace("Hello", "Hi");

    return {
      title: null,
      textContent,
    };
  }
}

async function main() {
  const converter = new Markitdown();
  converter.registerConverter(new CustomParser());
  const result = await converter.convert(
    path.join(__dirname, "./fixtures/sample.my-extension")
  );
  console.log(result);
}

main();
