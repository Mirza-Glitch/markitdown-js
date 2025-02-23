import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";

/**
 * Abstract base class for document converters.
 * Provides a common interface for all document conversion implementations.
 * @abstract
 */
export default abstract class DocumentConverter {
  /**
   * Converts a local file to the target format.
   * @abstract
   * @param {string} localPath - The path to the local file to convert
   * @param {ConversionOptions} [options] - Optional conversion configuration
   * @returns {Promise<DocumentConverterResult>} A promise that resolves with the conversion result
   * @throws {Error} May throw implementation-specific errors during conversion
   */
  abstract convert(
    localPath: string,
    options?: ConversionOptions
  ): Promise<DocumentConverterResult>;
}
