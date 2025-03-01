import XLSX from "xlsx";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";
import DocumentConverter from "./document";

/**
 * XlsxConverter handles the conversion of Excel files (XLSX/XLS) to Markdown format.
 * Each sheet in the workbook is converted to a Markdown table with proper formatting.
 * @extends DocumentConverter
 */
export default class XlsxConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts an Excel file to Markdown format.
   * Each sheet is represented as a separate section with a Markdown table.
   *
   * @override
   * @param {string} localPath - The local file path to the Excel file
   * @param {ConversionOptions} options - Conversion options including file extension
   * @returns {Promise<DocumentConverterResult>} Object containing the converted markdown content, or returns null if the file is not an Excel file
   *
   * @example
   * ```typescript
   * const converter = new Markitdown();
   * const result = await converter.convert("file.xlsx");
   * ```
   */
  override async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    // Bail if not an XLSX or XLS file
    const extension = options.fileExtension || "";
    if (![".xlsx", ".xls"].includes(extension.toLowerCase())) {
      return null;
    }

    // Read the Excel workbook with VBA support enabled
    const workbook = XLSX.readFile(localPath, { bookVBA: true });
    let mdContent = "";

    // Process each sheet in the workbook
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return;

      // Add sheet name as a heading
      mdContent += `## ${sheetName}\n`;

      // Convert sheet data to JSON format for easier processing
      const tableContent = XLSX.utils.sheet_to_json(worksheet, {});

      // Extract table structure from the first row
      const firstRow = tableContent[0] as Record<string, unknown>;
      const tableHead = Object.keys(firstRow);

      // Convert each row to a pipe-separated string for markdown table format
      const tableBody = tableContent.map((row: any) => {
        const tableRow = Object.values(row)
          .map((cell: any) => `${cell}`)
          .join(" | ");
        return tableRow;
      });

      // Construct the markdown table with headers, separator line, and content
      const mdTable = [
        // Header row with column names
        `|${tableHead.join("|")}`,
        // Separator row with dashes
        `${tableHead.map((key) => "-".repeat(key.length)).join("|")}`,
        // Data rows
        `${tableBody.map((row) => `|${row}|`).join("\n")}`,
      ].join("\n");

      mdContent += mdTable + "\n\n";
    });

    // Return the converted content without a title
    return {
      title: null,
      textContent: mdContent.trim(),
    };
  }
}
