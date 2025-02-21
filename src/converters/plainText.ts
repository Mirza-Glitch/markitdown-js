import mime from "mime-types";
import fs from "fs";
import iconv from "iconv-lite";
import DocumentConverter, {
  type DocumentConverterResult,
  type ConversionOptions,
} from "./document";

/**
 * Converter for plain text files
 */
export default class PlainTextConverter extends DocumentConverter {
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
