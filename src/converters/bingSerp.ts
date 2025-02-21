import fs from "fs";
import { parse } from "node-html-parser";
import DocumentConverter from "./document";
import type { ConversionOptions, DocumentConverterResult } from "./document";

// Handle Bing results pages (only the organic search results).
// NOTE: It is better to use the Bing API
export default class BingSerpConverter extends DocumentConverter {
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

    root.querySelectorAll(".tptt").forEach((el) => {
      el.textContent = el.textContent + " ";
    });

    root.querySelectorAll(".algoSlug_icon").forEach((el) => {
      el.remove();
    });

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
