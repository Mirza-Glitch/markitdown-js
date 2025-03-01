import fs from "fs";
import { parse } from "node-html-parser";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";
import DocumentConverter from "./document";

/**
 * YouTubeConverter handles the conversion of YouTube video pages to Markdown format.
 * Extracts video metadata, description, and transcript when available.
 * Supports both regular YouTube videos and YouTube Shorts.
 * @extends DocumentConverter
 */
export default class YouTubeConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts a YouTube video page to Markdown format.
   * Extracts video title, metadata, description, and transcript (if available).
   *
   * @param {string} localPath - The local file path to the YouTube page HTML file
   * @param {ConversionOptions} options - Conversion options including file extension and URL
   * @returns {Promise<DocumentConverterResult>} Object containing the converted markdown content, or null if the file is not a YouTube video page
   *
   * @example
   * ```typescript
   * const converter = new Markitdown();
   * const result = await converter.convert("https://www.youtube.com/watch?v=abc123");
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
    if (
      !url.startsWith("https://www.youtube.com/watch?") &&
      !url.startsWith("https://www.youtube.com/shorts/")
    ) {
      return null;
    }

    // Parse the file
    const htmlContent = fs.readFileSync(localPath, "utf-8");
    const root = parse(htmlContent);

    // Extract and process metadata
    const metadata: Record<string, string> = {
      title: root.querySelector("title")?.text || "",
    };
    root.querySelectorAll("meta").forEach((meta) => {
      const attr =
        meta.getAttribute("property") ||
        meta.getAttribute("name") ||
        meta.getAttribute("itemprop");
      // Only allow known metadata keys to be set
      if (attr && attr in metadata) {
        metadata[attr as keyof typeof metadata] =
          meta.getAttribute("content") || "";
      }
    });

    // Extract description from embedded script data
    try {
      root.querySelectorAll("script").forEach((script) => {
        const content = script.text;
        if (content && content.includes("ytInitialData")) {
          // Use a non-greedy match to get the first complete JSON object
          const match = content.match(/var ytInitialData = ({.+?});/);
          if (match && match[1]) {
            try {
              const data = JSON.parse(match[1]);
              const attrdesc = this._findKey(
                data,
                "attributedDescriptionBodyText"
              );
              if (attrdesc) {
                metadata["description"] = attrdesc.content;
              }
            } catch (parseError) {
              // Silently skip invalid JSON
              console.debug("Failed to parse script content:", parseError);
            }
          }
        }
      });
    } catch (err) {
      console.error("Error parsing description:", err);
    }

    // Construct markdown output
    let webpageText = "# YouTube\n";

    const title = this._get(metadata, ["title", "og:title", "name"]) || "";
    if (title) {
      webpageText += `\n## ${title}\n`;
    }

    // Add video statistics
    let stats = "";
    const views = this._get(metadata, ["interactionCount"]);
    if (views) stats += `- **Views:** ${views}\n`;

    const keywords = this._get(metadata, ["keywords"]);
    if (keywords) stats += `- **Keywords:** ${keywords}\n`;

    const runtime = this._get(metadata, ["duration"]);
    if (runtime) stats += `- **Runtime:** ${runtime}\n`;

    if (stats) webpageText += `\n### Video Metadata\n${stats}\n`;

    // Add video description
    const description = this._get(metadata, ["description", "og:description"]);
    if (description) {
      webpageText += `\n### Description\n${description}\n`;
    }

    // Get transcript if Possible
    let transcriptText = "";
    const parsedUrl = new URL(url);
    const videoId = parsedUrl.searchParams.get("v");
    const shortId = parsedUrl.pathname.split("/").pop();
    if (videoId || shortId) {
      try {
        await this.retryOperation(
          async () => {
            const response = await options.requestsSession?.get(
              `https://www.youtubetranscript.com/?server_vid2=${
                videoId || shortId
              }`
            );
            const transcript = parse(response?.data);
            const transcriptTexts: string[] = [];
            transcript.querySelectorAll("transcript text").forEach((text) => {
              transcriptTexts.push(text.innerText);
            });
            transcriptText = transcriptTexts.join(" ");
          },
          3,
          2000
        );
      } catch (err) {
        console.error("Error fetching transcript after retries:", err);
      }
    }

    if (transcriptText) {
      webpageText += `\n### Transcript\n${transcriptText}\n`;
    }

    return {
      title,
      textContent: webpageText,
    };
  }

  /**
   * Retries an operation with specified number of attempts and delay between retries
   *
   * @param {Function} operation - The async function to retry
   * @param {number} retries - Number of retry attempts
   * @param {number} delay - Delay between retries in milliseconds
   * @returns {Promise<any>} Result of the operation if successful
   * @throws {Error} If all retry attempts fail
   * @private
   */
  private async retryOperation(
    operation: Function,
    retries: number = 3,
    delay: number = 2000
  ): Promise<void> {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const err = error as Error;
        console.log(`Attempt ${attempt + 1} failed: ${err.message}`);
        lastError = err;
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error(
      `Operation failed after ${retries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Retrieves a value from metadata using a list of possible keys.
   *
   * @param {Record<string, any>} metadata - The metadata object to search in
   * @param {string[]} keys - Array of possible keys to look for
   * @param {any} defaultValue - Value to return if no key is found
   * @returns {any} The first found value or the default value
   * @private
   */
  private _get(
    metadata: Record<string, any>,
    keys: string[],
    defaultValue: any = null
  ): string {
    // Iterate over each key in the keys array
    // If the key exists in the metadata, return the value
    for (const key of keys) {
      if (metadata[key]) {
        return metadata[key];
      }
    }
    return defaultValue;
  }

  /**
   * Recursively searches for a specific key in a nested object or array.
   *
   * @param {any} obj - The object or array to search in
   * @param {string} key - The key to search for
   * @returns {any} The value associated with the key if found, null otherwise
   * @private
   */
  private _findKey(obj: any, key: string): Record<string, any> | null {
    // If the object is an array, iterate over each item in the array
    // If the item is an object, recursively search for the key in the item
    // If the key is found, return the value
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = this._findKey(item, key);
        if (result) return result;
      }
    } else if (typeof obj === "object" && obj !== null) {
      for (const k in obj) {
        if (k === key) return obj[k];
        const result = this._findKey(obj[k], key);
        if (result) return result;
      }
    }
    return null;
  }
}
