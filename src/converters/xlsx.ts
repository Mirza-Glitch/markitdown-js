import XLSX from "xlsx";
import type { ConversionOptions, DocumentConverterResult } from "./document";
import HtmlConverter from "./html";

export default class XlsxConverter extends HtmlConverter {
  /**
   * Converts XLSX, XLS files to Markdown, with each sheet presented as a separate Markdown table.
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

    const workbook = XLSX.readFile(localPath, { bookVBA: true });
    let mdContent = "";

    // Iterate over each sheet in the workbook
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return;
      mdContent += `## ${sheetName}\n`;
      // Get the table content from the worksheet
      const tableContent = XLSX.utils.sheet_to_json(worksheet, {});

      // Get the first row of the table
      const firstRow = tableContent[0] as Record<string, unknown>;
      // Get the table header
      const tableHead = Object.keys(firstRow);
      // Get the table body
      const tableBody = tableContent.map((row: any) => {
        // Get the table row, map the row to a string, and join the row to a string
        const tableRow = Object.values(row)
          .map((cell: any) => `${cell}`)
          .join(" | ");
        return tableRow;
      });

      // Create the markdown table
      const mdTable = [
        `|${tableHead.join("|")}`,
        `${tableHead.map((key) => "-".repeat(key.length)).join("|")}`,
        `${tableBody.map((row) => `|${row}|`).join("\n")}`,
      ].join("\n");

      mdContent += mdTable + "\n\n";
    });

    return {
      title: null,
      textContent: mdContent.trim(),
    };
  }
}
