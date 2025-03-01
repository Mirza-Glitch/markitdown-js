import mime from "mime-types";
import fs from "fs";
import iconv from "iconv-lite";
import DocumentConverter from "../converters/document";
import type {
  DocumentConverterResult,
  ConversionOptions,
} from "../types/document";

/**
 * Converts plain text files to a standard document format.
 * Handles various text-based content types including plain text and JSON files.
 *
 * @extends DocumentConverter
 */
export default class PlainTextConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_GENERIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts a text file to the standard document format.
   * Automatically detects content type based on file extension and only processes
   * files that have text/* MIME types or application/json.
   *
   * @param {string} localPath - Path to the text file
   * @param {ConversionOptions} options - Conversion options including file extension
   * @returns {Promise<DocumentConverterResult>} Object containing the file content as textContent (title is null), or returns null if the file type is not supported
   * @throws {Error} If the file cannot be read or decoded
   *
   * @example
   * ```typescript
   * const converter = new Markitdown();
   * const result = await converter.convert('document.txt');
   * ```
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    // Guess the content type from file extension
    const contentType = mime.lookup(
      `__placeholder${options.fileExtension || ""}`
    );

    // Only accept text files
    if (!contentType) return null;

    const isValidType =
      contentType.toLowerCase().startsWith("text/") ||
      contentType.toLowerCase() === "application/json";

    if (!isValidType) return null;

    const buffer = await fs.promises.readFile(localPath);
    // Decode the buffer to text
    const text = iconv.decode(buffer, "utf-8");

    return {
      title: null,
      textContent: text,
    };
  }
}
