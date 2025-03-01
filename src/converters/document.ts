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
   * Lower priority values are tried first.
   * Used for specific file formats like .docx, .pdf, .xlsx, or specific pages like Wikipedia.
   */
  static readonly PRIORITY_SPECIFIC_FILE_FORMAT: number = 0.0;

  /**
   * Used for near catch-all converters for mimetypes like text/*, etc.
   * These are tried after more specific converters.
   */
  static readonly PRIORITY_GENERIC_FILE_FORMAT: number = 10.0;

  /**
   * The priority of this converter.
   * @private
   */
  private _priority: number;

  /**
   * Initialize the DocumentConverter with a given priority.
   *
   * Priorities work as follows: By default, most converters get priority
   * DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT (== 0). The exception
   * is the PlainTextConverter, which gets priority PRIORITY_GENERIC_FILE_FORMAT (== 10),
   * with lower values being tried first (i.e., higher priority).
   *
   * Just prior to conversion, the converters are sorted by priority, using
   * a stable sort. This means that converters with the same priority will
   * remain in the same order, with the most recently registered converters
   * appearing first.
   *
   * @param {number} priority - The priority of this converter
   */
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    this._priority = priority;
  }

  /**
   * Converts a local file to the target format.
   * @abstract
   * @param {string} localPath - The path to the local file to convert
   * @param {ConversionOptions} [options] - Optional conversion configuration
   * @returns {Promise<DocumentConverterResult | null>} A promise that resolves with the conversion result or null if conversion is not applicable
   * @throws {Error} May throw implementation-specific errors during conversion
   */
  abstract convert(
    localPath: string,
    options?: ConversionOptions
  ): Promise<DocumentConverterResult | null>;

  /**
   * Gets the priority of the converter in the converter list.
   * Lower values are tried first (higher priority).
   * @returns {number} The priority value
   */
  get priority(): number {
    return this._priority;
  }

  /**
   * Sets the priority of the converter.
   * @param {number} value - The new priority value
   */
  set priority(value: number) {
    this._priority = value;
  }
}
