import fs from "fs";
import mammoth from "mammoth";
import HtmlConverter from "./html";
import type { ConversionOptions } from "./document";

export default class DocxConverter extends HtmlConverter {
  /**
   * Converts DOCX files to Markdown. Style information (e.g., headings) and tables are preserved where possible.
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
