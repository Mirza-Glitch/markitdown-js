import nodePptxParser from "node-pptx-parser";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";
import DocumentConverter from "./document";

// node-pptx-parser exports an object with key "default" for commonjs which we need to handle in our cjs version just like @kenjiuno/msgreader package.
const PptxParser = ("default" in nodePptxParser
  ? nodePptxParser.default
  : nodePptxParser) as unknown as typeof nodePptxParser;

/**
 * Converts PowerPoint PPTX files to markdown format.
 * Only supports .pptx files (modern PowerPoint format), not .ppt files.
 * Each slide is converted to a markdown section with its text content preserved.
 *
 * @extends DocumentConverter
 *
 * @example
 * ```typescript
 * const pptxConverter = new PptxConverter();
 * let result = await pptxConverter.convert('presentation.pptx', {
 *   fileExtension: '.pptx'
 * });
 *
 * // Using Markitdown
 * const converter = new Markitdown();
 * let result = await converter.convert('presentation.pptx');
 * ```
 */
export default class PptxConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts a PPTX file to markdown format.
   * Extracts text from each slide and organizes them in order.
   * Slides are sorted by their ID to maintain presentation order.
   *
   * @param {string} localPath - Path to the PPTX file
   * @param {ConversionOptions} options - Conversion options including file extension
   * @returns {Promise<DocumentConverterResult>} Object containing formatted markdown as textContent (title is null), or returns null for unsupported file types (.ppt files or non-PowerPoint files)
   * @throws {Error} If the file cannot be read or parsed
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
