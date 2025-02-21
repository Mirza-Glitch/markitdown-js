import fs from "fs";
import pdf from "pdf-parse-tt-message-gone/lib/pdf-parse.js";
import DocumentConverter, {
  type DocumentConverterResult,
  type ConversionOptions,
} from "./document";

/**
 * Converts PDF files to text.
 */
export default class PdfConverter extends DocumentConverter {
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
