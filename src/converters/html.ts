import { parse } from "node-html-parser";
import fs from "fs";
import CustomMarkdownConverter from "./customMarkdown";
import DocumentConverter, {
  type DocumentConverterResult,
  type ConversionOptions,
} from "./document";

/**
 * Converter for HTML files
 */
export default class HtmlConverter extends DocumentConverter {
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (![".html", ".htm"].includes(extension)) {
      return null;
    }

    const content = await fs.promises.readFile(localPath, "utf-8");
    return this._convert(content);
  }

  _convert(htmlContent: string): DocumentConverterResult {
    // Parse the HTML
    const root = parse(htmlContent);

    // Remove javascript and style blocks
    root.querySelectorAll("script, style").forEach((el) => el.remove());

    // Convert to markdown
    const markdownConverter = new CustomMarkdownConverter();
    const bodyElm = root.querySelector("body");
    const webpageText = bodyElm
      ? markdownConverter.convert(bodyElm.innerHTML)
      : markdownConverter.convert(root.innerHTML);

    return {
      title: root.querySelector("title")?.text || null,
      textContent: webpageText.trim(),
    };
  }
}
