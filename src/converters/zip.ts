import path from "path";
import fs from "fs";
import unzipper from "unzipper";
import DocumentConverter, {
  type DocumentConverterResult,
  type ConversionOptions,
} from "./document";

/**
 * Converts zip files to Markdown by extracting the contents and passing them to the parent converters.
 */
export default class ZipConverter extends DocumentConverter {
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (extension.toLowerCase() !== ".zip") return null;

    // Get the parent markdown converters
    const parentConverters = options.parentConverters || [];
    if (!parentConverters.length) {
      return {
        title: null,
        textContent: `[ERROR] No converters available to process zip contents from: ${localPath}`,
      };
    }

    // Create a temporary directory to extract the zip file
    const extractionDir = path.join(
      path.dirname(localPath),
      `extracted_${path.basename(localPath, ".zip")}`
    );
    let mdContent = `Content from the zip file \`${path.basename(
      localPath
    )}\`:\n\n`;

    try {
      // Extract the zip file
      await fs
        .createReadStream(localPath)
        .pipe(unzipper.Extract({ path: extractionDir }))
        .promise();

      // Get the files in the extraction directory
      const files = fs.readdirSync(extractionDir, { withFileTypes: true });

      // Iterate over each file in the extraction directory
      for (const file of files) {
        const filePath = path.join(extractionDir, file.name);
        const fileExt = path.extname(file.name);

        // Iterate over each parent converter
        for (const converter of parentConverters) {
          // Skip if the converter is a ZipConverter
          if (converter instanceof ZipConverter) continue;
          // Convert the file to markdown
          const result = await converter.convert(filePath, {
            fileExtension: fileExt,
            parentConverters,
          });
          if (result) {
            mdContent +=
              `\n## File: ${file.name}\n\n` + result.textContent + "\n\n";
            break;
          }
        }
      }
      // Remove the temporary extraction directory
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
}
