import { exiftool } from "exiftool-vendored";
import DocumentConverter from "../converters/document";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";

/**
 * Abstract base class for media converters.
 * Provides a common interface for all media conversion implementations.
 *
 * @abstract
 *
 * @example
 * ```typescript
 * const converter = new MediaConverter();
 *
 * const metadata = await converter._getMetadata('video.mp4');
 * ```
 */
export default abstract class MediaConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts a local file to the target format.
   * @abstract
   * @param {string} localPath - The path to the local file to convert
   * @param {ConversionOptions} [options] - Optional conversion configuration
   * @returns {Promise<DocumentConverterResult>} A promise that resolves with the conversion result
   * @throws {Error} May throw implementation-specific errors during conversion
   */
  convert(
    localPath: string,
    options?: ConversionOptions
  ): Promise<DocumentConverterResult> {
    throw new Error("Method not implemented.");
  }

  /**
   * Generates media metadata using exiftool.
   * @param {string} localPath - Path to the local audio file
   * @returns {Promise<Record<string, any> | null>} The transcription text or null if transcription fails or is unavailable
   */
  async _getMetadata(localPath: string): Promise<Record<string, any> | null> {
    try {
      const metadata = await exiftool.read(localPath);
      return metadata;
    } catch (error) {
      console.error("Error reading metadata:", error);
      return null;
    } finally {
      exiftool.end();
    }
  }
}
