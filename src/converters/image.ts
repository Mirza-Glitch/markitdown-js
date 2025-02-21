import fs from "fs";
import mime from "mime-types";
import tesseract from "node-tesseract-ocr";
import type { ConversionOptions, DocumentConverterResult } from "./document";
import MediaConverter from "./media";
import type { LlmCall, Message } from "../markitdown";

export default class ImageConverter extends MediaConverter {
  /**
   * Converts images to markdown via extraction of metadata,
   * image text extracted via tesseract api (if installed)
   * and description via a multimodal LLM (if an llmClient is configured).
   */
  override async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    // Bail if not an image
    const extension = options.fileExtension || "";
    if (![".jpg", ".jpeg", ".png"].includes(extension.toLowerCase())) {
      return null;
    }

    let mdContent = "";

    // Add metadata
    const metadata = await this._getMetadata(localPath);
    if (metadata) {
      const fields = [
        "ImageSize",
        "Title",
        "Caption",
        "Description",
        "Keywords",
        "Artist",
        "Author",
        "DateTimeOriginal",
        "CreateDate",
        "GPSPosition",
      ];

      fields.forEach((field) => {
        if (metadata[field]) {
          mdContent += `- **${field}**: ${metadata[field]}\n`;
        }
      });
    }

    try {
      const text = await tesseract.recognize(localPath); // works only if user has tesseract installed on their system
      if (text) mdContent += `\n# Text:\n\n${text.trim()}`;
    } catch (error) {
      // User doesn't have tesseract installed
    }

    const description = await this._getLlmDescription({
      localPath,
      fileExtension: extension,
      llmCall: options.llmCall,
    });
    if (description) mdContent += `\n\n# Description:\n\n${description.trim()}`;

    return {
      title: null,
      textContent: mdContent,
    };
  }

  async _getLlmDescription({
    localPath,
    fileExtension,
    llmCall,
  }: {
    localPath: string;
    fileExtension: string;
    llmCall: LlmCall;
  }) {
    if (typeof llmCall !== "function") return null;
    try {
      const imageBase64 = fs.readFileSync(localPath, { encoding: "base64" });
      const contentType = mime.lookup(fileExtension) || "image/jpeg";
      const dataUri = `data:${contentType};base64,${imageBase64}`;

      const messages: Message[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Write a detailed caption for this base64 image string.",
            },
            { type: "image_url", image_url: { url: dataUri } },
          ],
        },
      ];

      const response = await llmCall({
        messages,
        imageBase64: imageBase64,
      });

      return response;
    } catch (err) {
      console.error("error making llmCall: ", err);
      return null;
    }
  }
}
