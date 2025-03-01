import fs from "fs";
import pdf from "pdf-parse-tt-message-gone/lib/pdf-parse.js";
import DocumentConverter from "../converters/document";
import type {
  DocumentConverterResult,
  ConversionOptions,
} from "../types/document";

/**
 * Converts PDF files to Markdown format.
 *
 * @extends DocumentConverter
 *
 * @example
 * ```typescript
 * const pdfConverter = new PdfConverter();
 * let result = await pdfConverter.convert('document.pdf', {
 *   fileExtension: '.pdf'
 * });
 *
 * // Using Markitdown
 * const converter = new Markitdown();
 * let result = await converter.convert('document.pdf');
 * ```
 */
export default class PdfConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts a PDF file to Markdown format.
   * Uses pdf-parse to Extract text from PDF file.
   *
   * @param {string} localPath - Path to the local PDF file
   * @param {ConversionOptions} options - Conversion options
   * @returns {Promise<DocumentConverterResult>} A promise that resolves to the conversion result
   * @throws {Error} If the file cannot be read or parsed
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (extension.toLowerCase() !== ".pdf") {
      return null;
    }
    try {
      const buffer = fs.readFileSync(localPath);
      const data = await pdf(buffer, {
        version: "default",
      });
      return {
        title: null,
        textContent: data.text,
      };
    } catch (error) {
      console.error("Error parsing PDF:", error);
      return null;
    }
  }
}
