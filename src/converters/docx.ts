import fs from "fs";
import mammoth from "mammoth";
import HtmlConverter from "./html";
import type { ConversionOptions } from "../types/document";

/**
 * Converts DOCX files to Markdown format via HTML intermediate conversion.
 * Preserves document structure including headings, tables, and styling where possible.
 * @extends HtmlConverter
 */
export default class DocxConverter extends HtmlConverter {
  /**
   * Converts a DOCX file to Markdown format.
   * Uses Mammoth.js to convert DOCX to HTML, then processes the HTML to Markdown.
   *
   * @param {string} localPath - Path to the local DOCX file
   * @param {ConversionOptions} options - Conversion options
   * @param {string} [options.fileExtension] - File extension (must be .docx)
   * @param {Array<string>} [options.styleMap] - Custom style mappings for Mammoth.js conversion
   * @returns {Promise<DocumentConverterResult>} Conversion result or null if:
   *   - File is not a DOCX
   *   - File cannot be read
   *   - Conversion fails
   *
   * @example
   * ```typescript
   * const converter = new Markitdown({
   *   styleMap: [
   *     "p[style-name='Section Title'] => h1:fresh",
   *     "p[style-name='Subsection Title'] => h2:fresh"
   *   ]
   * });
   * const result = await converter.convert('document.docx');
   * ```
   *
   * @throws {Error} If file reading or conversion process fails
   * @override
   */
  override async convert(localPath: string, options: ConversionOptions) {
    // Bail if not a DOCX
    const extension = options.fileExtension || "";
    if (extension.toLowerCase() !== ".docx") {
      return null;
    }

    try {
      // Read the DOCX file as a binary buffer
      const buffer = await fs.promises.readFile(localPath);
      const styleMap = options.styleMap;

      // Convert DOCX to HTML using Mammoth
      const result = await mammoth.convertToHtml({ buffer }, { styleMap });
      const htmlContent = result.value;

      // Convert HTML to Markdown using HtmlConverter
      return this._convert(htmlContent);
    } catch (error) {
      console.error("Error converting DOCX file:", error);
      return null;
    }
  }
}
