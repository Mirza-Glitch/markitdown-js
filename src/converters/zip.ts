import path from "path";
import fs from "fs";
import unzipper from "unzipper";
import DocumentConverter from "../converters/document";
import type {
  DocumentConverterResult,
  ConversionOptions,
} from "../types/document";

/**
 * ZipConverter handles the conversion of ZIP archives to Markdown format.
 * It extracts the archive contents and processes each file using appropriate parent converters.
 *
 * @extends DocumentConverter
 *
 * @example
 * ```typescript
 * const zipConverter = new ZipConverter();
 * let result = await zipConverter.convert("archive.zip", {
 *   parentConverters: [new PdfConverter(), new DocxConverter(), new HtmlConverter()],
 *   fileExtension: ".zip"
 * })
 *
 * // Using Markitdown
 * const converter = new Markitdown();
 * let result = await converter.convert("archive.zip");
 * ```
 */
export default class ZipConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts a ZIP archive to Markdown by extracting and processing its contents.
   * Creates a temporary directory for extraction, processes each file with available converters,
   * and cleans up afterward.
   *
   * @param {string} localPath - The local file path to the ZIP archive
   * @param {ConversionOptions} options - Conversion options including:
   *   - fileExtension: The file extension (must be .zip)
   *   - parentConverters: Array of available document converters for processing extracted files
   * @returns {Promise<DocumentConverterResult>} Object containing:
   *   - Markdown content with results from all processed files
   *   - Error message if processing fails or no converters are available
   *
   * @throws Will return an error result if:
   *   - The file is not a ZIP archive
   *   - No parent converters are available
   *   - Archive extraction fails
   *   - File processing fails
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (extension.toLowerCase() !== ".zip") return null;

    // Verify available converters
    const parentConverters = options.parentConverters || [];
    if (!parentConverters.length) {
      return {
        title: null,
        textContent: `[ERROR] No converters available to process zip contents from: ${localPath}`,
      };
    }

    // Set up extraction directory
    const extractionDir = path.join(
      path.dirname(localPath),
      `extracted_${path.basename(localPath, ".zip")}`
    );
    let mdContent = `Content from the zip file \`${path.basename(
      localPath
    )}\`:\n\n`;

    try {
      // Extract archive contents
      await fs
        .createReadStream(localPath)
        .pipe(unzipper.Extract({ path: extractionDir }))
        .promise();

      // Process extracted files
      mdContent += await this.processDirectory(extractionDir, parentConverters);

      // Cleanup temporary directory
      fs.rmSync(extractionDir, { recursive: true, force: true });

      return {
        title: null,
        textContent: mdContent.trim(),
      };
    } catch (error) {
      return {
        title: null,
        textContent: `[ERROR] Failed to process zip file ${localPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Processes a directory of files within a ZIP archive.
   * Converts each file using available parent converters.
   *
   * @param {string} extractionDir - The directory path to process
   * @param {DocumentConverter[]} parentConverters - Conversion options
   * @param {string} [parentDirName] - The name of the parent directory (if present)
   *
   * @returns {Promise<string>} The processed directory contents
   *
   * @private
   */
  private async processDirectory(
    extractionDir: string,
    parentConverters: DocumentConverter[],
    parentDirName?: string
  ): Promise<string> {
    let mdContent = "";
    // Process extracted files
    const files = fs.readdirSync(extractionDir, { withFileTypes: true });
    // Convert each file using appropriate converter
    for (const file of files) {
      if (file.isDirectory()) {
        mdContent += await this.processDirectory(
          path.join(extractionDir, file.name),
          parentConverters,
          parentDirName ? parentDirName + "/" + file.name : file.name // add parent directory name if present, else add current directory name
        );
        continue;
      }
      const filePath = path.join(extractionDir, file.name);
      const fileExt = path.extname(file.name);

      // Try each available converter
      for (const converter of parentConverters) {
        // Skip self-reference to avoid recursion
        if (converter instanceof ZipConverter) continue;

        // Attempt conversion
        const result = await converter.convert(filePath, {
          fileExtension: fileExt,
          parentConverters,
        });

        // Add successful conversion to output
        if (result) {
          mdContent += `\n## File: `;
          mdContent += parentDirName ? parentDirName + "/" : ""; // add parent directory name if present
          mdContent += `${file.name}\n\n`; // add filename
          mdContent += `${result.textContent}\n\n`; // add conversion result
          break;
        }
      }
    }

    return mdContent;
  }
}
