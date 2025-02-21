import nodePptxParser from "node-pptx-parser";
import type { ConversionOptions, DocumentConverterResult } from "./document";
import DocumentConverter from "./document";

const PptxParser = ("default" in nodePptxParser ? nodePptxParser.default : nodePptxParser) as unknown as typeof nodePptxParser; // node-pptx-parser exports an object with key "default" for commonjs which we need to handle in our cjs version

export default class PptxConverter extends DocumentConverter {
  /**
   * Converts PPTX files to Markdown, with each slide presented as a separate Markdown table.
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    // Bail if not an PPTX file
    const extension = options.fileExtension || "";
    if (extension.toLowerCase() === ".ppt") {
      console.warn("PPT files are not supported. Please use PPTX files.");
      return null;
    }
    if (extension.toLowerCase() !== ".pptx") {
      return null;
    }

    const pptxParser = new PptxParser(localPath);
    const pptxSlides = await pptxParser.extractText();

    const sortedSlides = pptxSlides.sort((a, b) => {
      const aId = a.id.substring(3); // remove the "rId" prefix
      const bId = b.id.substring(3); // remove the "rId" prefix
      return Number(aId) - Number(bId);
    });
    let mdContent = "";

    sortedSlides.forEach((slide, index) => {
      const slideName =
        slide.path?.split("/").pop()?.split(".")[0] || `Slide ${index}`;
      mdContent += `\n## ${slideName} - ${slide.id}\n`;
      mdContent += slide.text ? slide.text : "Empty Slide...";
    });

    return {
      title: null,
      textContent: mdContent.replace(/\n\n\n/g, "\n").trim(),
    };
  }
}
