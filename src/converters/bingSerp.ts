import fs from "fs";
import { parse } from "node-html-parser";
import DocumentConverter from "./document";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";

/**
 * Converts Bing Search Engine Results Pages (SERP) to markdown format.
 * Extracts and formats organic search results from Bing HTML pages.
 * @extends DocumentConverter
 * @remarks
 * This converter only handles organic Bing search results.
 * It is better to use Bing API.
 */
export default class BingSerpConverter extends DocumentConverter {
  /**
   * Converts a Bing search results page to markdown format.
   * Only processes HTML files from Bing search URLs.
   *
   * @param {string} localPath - Path to the local HTML file
   * @param {ConversionOptions} options - Conversion options
   * @param {string} [options.fileExtension] - File extension (must be .html or .htm)
   * @param {string} [options.url] - Original URL (must be a Bing search URL)
   * @returns {Promise<DocumentConverterResult>} Conversion result containing search results
   *
   * @example
   * ```typescript
   * const converter = new Markitdown();
   * const result = await converter.convert('https://www.bing.com/search?q=example');
   * ```
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (![".html", ".htm"].includes(extension.toLowerCase())) {
      return null;
    }

    const url = options.url || "";
    if (!/^https:\/\/www\.bing\.com\/search\?q=/.test(url)) {
      return null;
    }

    const parsedParams = new URL(url).searchParams;
    const query = parsedParams.get("q") || "";

    const html = fs.readFileSync(localPath, "utf-8");
    const root = parse(html);

    // Add spaces after truncated text
    root.querySelectorAll(".tptt").forEach((el) => {
      el.textContent = el.textContent + " ";
    });

    // Remove algorithm icons
    root.querySelectorAll(".algoSlug_icon").forEach((el) => {
      el.remove();
    });

    // Extract organic search results
    let results: string[] = [];
    root.querySelectorAll(".b_algo").forEach((el) => {
      let resultText = el.textContent.trim();
      results.push(resultText);
    });

    let webpageText = `## A Bing search for '${query}' found the following results:\n\n`;
    webpageText += results.join("\n\n");

    return {
      title: root.querySelector("title")?.innerText || null,
      textContent: webpageText,
    };
  }
}
