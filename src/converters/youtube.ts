import fs from "fs";
import { parse } from "node-html-parser";
import type { ConversionOptions, DocumentConverterResult } from "./document";
import DocumentConverter from "./document";

// Handle YouTube videos separately, focusing only on the main document content.
export default class YouTubeConverter extends DocumentConverter {
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

    // Read metadata
    const metadata: Record<string, string> = {
      title: root.querySelector("title")?.text || "",
    };
    root.querySelectorAll("meta").forEach((meta) => {
      const attr =
        meta.getAttribute("property") ||
        meta.getAttribute("name") ||
        meta.getAttribute("itemprop");
      if (attr) {
        // Only allow known metadata keys to be set
        if (attr in metadata) {
          metadata[attr as keyof typeof metadata] =
            meta.getAttribute("content") || "";
        }
      }
    });

    // Extract description from script
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

    let webpageText = "# YouTube\n";

    const title = this._get(metadata, ["title", "og:title", "name"]) || "";
    if (title) {
      webpageText += `\n## ${title}\n`;
    }

    let stats = "";
    const views = this._get(metadata, ["interactionCount"]);
    if (views) stats += `- **Views:** ${views}\n`;

    const keywords = this._get(metadata, ["keywords"]);
    if (keywords) stats += `- **Keywords:** ${keywords}\n`;

    const runtime = this._get(metadata, ["duration"]);
    if (runtime) stats += `- **Runtime:** ${runtime}\n`;

    if (stats) webpageText += `\n### Video Metadata\n${stats}\n`;

    const description = this._get(metadata, ["description", "og:description"]);
    if (description) {
      webpageText += `\n### Description\n${description}\n`;
    }

    // Get transcript if possible
    let transcriptText = "";
    const parsedUrl = new URL(url);
    const videoId = parsedUrl.searchParams.get("v");
    const shortId = parsedUrl.pathname.split("/").pop();
    if (videoId || shortId) {
      try {
        const response = await options.requestsSession?.get(
          `https://www.youtubetranscript.com/?server_vid2=${videoId || shortId}`
        );
        const transcript = parse(response?.data);
        const transcriptTexts: string[] = [];
        transcript.querySelectorAll("transcript text").forEach((text) => {
          transcriptTexts.push(text.innerText);
        });
        transcriptText = transcriptTexts.join(" ");
      } catch (err) {
        console.error("Error fetching transcript:", err);
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

  private _get(
    metadata: Record<string, any>,
    keys: string[],
    defaultValue = null
  ) {
    // Iterate over each key in the keys array
    // If the key exists in the metadata, return the value
    for (const key of keys) {
      if (metadata[key]) {
        return metadata[key];
      }
    }
    return defaultValue;
  }

  private _findKey(obj: any, key: string): any {
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
