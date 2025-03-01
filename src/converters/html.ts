import { parse } from "node-html-parser";
import fs from "fs";
import CustomMarkdownConverter from "./customMarkdown";
import DocumentConverter from "../converters/document";
import type {
  DocumentConverterResult,
  ConversionOptions,
} from "../types/document";

/**
 * Converts HTML files to Markdown format.
 * Handles both standalone HTML files and HTML content from other converters.
 * Removes scripts and styles while preserving content structure.
 * @extends DocumentConverter
 */
export default class HtmlConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_GENERIC_FILE_FORMAT // anything with content type text/html
  ) {
    super(priority);
  }
  /**
   * Converts an HTML file to Markdown format.
   *
   * @param {string} localPath - Path to the local HTML file
   * @param {ConversionOptions} options - Conversion options
   * @param {string} [options.fileExtension] - File extension (must be .html or .htm)
   * @returns {Promise<DocumentConverterResult>} Conversion result or null if:
   *   - File extension is not .html or .htm
   *   - File cannot be read
   *   - Conversion fails
   *
   * @example
   * ```typescript
   * const converter = new Markitdown();
   * const result = await converter.convert('page.html');
   * ```
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (![".html", ".htm"].includes(extension)) {
      return null;
    }

    const content = await fs.promises.readFile(localPath, "utf-8");
    return this._convert(content);
  }

  /**
   * Converts HTML content to Markdown format.
   * Internal method used by both direct HTML conversion and other converters.
   *
   * @param {string} htmlContent - Raw HTML content to convert
   * @returns {DocumentConverterResult} Object containing title and converted markdown content
   *
   * @remarks
   * - Removes all <script> and <style> elements before conversion
   * - Attempts to extract content from <body> first, falls back to entire document
   * - Preserves document title if available
   * - Trims whitespace from the final markdown
   *
   * @protected
   */
  protected _convert(htmlContent: string): DocumentConverterResult {
    // Parse the HTML
    const root = parse(htmlContent);

    // Remove javascript and style blocks
    root.querySelectorAll("script, style").forEach((el) => el.remove());

    // Convert to markdown
    const markdownConverter = new CustomMarkdownConverter();
    const bodyElm = root.querySelector("body");
    const webpageText = bodyElm
      ? markdownConverter.convert(bodyElm.innerHTML)
      : markdownConverter.convert(root.innerHTML);

    return {
      title: root.querySelector("title")?.text || null,
      textContent: webpageText.trim(),
    };
  }
}
