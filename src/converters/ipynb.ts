import fs from "fs";
import DocumentConverter, {
  type ConversionOptions,
  type DocumentConverterResult,
} from "./document";

// Define types for Jupyter Notebook structure
type NotebookMetadata = {
  title?: string;
  name?: string;
};

type CellOutput = {
  output_type: "stream" | "execute_result" | "display_data";
  text?: string[];
  data?: {
    "text/plain"?: string[];
    "image/png"?: string;
  };
};

type NotebookCell = {
  cell_type: "markdown" | "code";
  source: string[];
  outputs?: CellOutput[];
};

type JupyterNotebook = {
  metadata?: NotebookMetadata;
  cells: NotebookCell[];
};

export default class IpynbConverter extends DocumentConverter {
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (extension.toLowerCase() !== ".ipynb") {
      return null;
    }

    const notebookContent = JSON.parse(fs.readFileSync(localPath, "utf-8"));
    return this._convert(notebookContent);
  }

  _convert(notebookContent: JupyterNotebook): DocumentConverterResult {
    try {
      let mdOutput: string[] = [];
      let title: string | null = null;

      notebookContent.cells.forEach((cell) => {
        if (cell.cell_type === "markdown") {
          const markdownText = cell.source.join("");

          // Set the first `# Heading` as title if not already found
          if (!title) {
            for (const line of cell.source) {
              if (line.startsWith("# ")) {
                title = line.replace(/^# /, "").trim();
                break;
              }
            }
          }

          mdOutput.push(markdownText);
        } else if (cell.cell_type === "code") {
          mdOutput.push("```python\n" + cell.source.join("") + "\n```");

          // Process output (if any)
          if (cell.outputs && cell.outputs.length > 0) {
            cell.outputs.forEach((output) => {
              if (output.output_type === "stream") {
                mdOutput.push("```\n" + output.text?.join("") + "\n```");
              } else if (
                output.output_type === "execute_result" &&
                output.data &&
                output.data["text/plain"]
              ) {
                mdOutput.push(
                  "```\n" + output.data["text/plain"].join("") + "\n```"
                );
              } else if (
                output.output_type === "display_data" &&
                output.data &&
                output.data["image/png"]
              ) {
                const imgData = output.data["image/png"];
                mdOutput.push(`![Image](data:image/png;base64,${imgData})`);
              }
            });
          }
        }
      });

      const mdText = mdOutput.join("\n\n");
      title =
        notebookContent.metadata?.name ||
        notebookContent.metadata?.title ||
        title;

      return { title, textContent: mdText };
    } catch (error) {
      throw new Error(
        `Error converting .ipynb file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
