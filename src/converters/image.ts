import fs from "fs";
import mime from "mime-types";
import tesseract from "node-tesseract-ocr";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";
import MediaConverter from "./media";
import type { LlmCall, Message } from "../types/markitdown";

/**
 * Converts images to markdown format with enhanced content extraction.
 * Provides three types of information:
 * 1. Image metadata (size, date, location, etc.)
 * 2. OCR-extracted text (requires Tesseract installation)
 * 3. AI-generated image description (requires LLM call as callback)
 *
 * @extends MediaConverter
 *
 * @example
 * ```typescript
 * const imageConverter = new ImageConverter();
 * let result = await imageConverter.convert('photo.jpg', {
 *   fileExtension: '.jpg',
 *   llmCall: async (params) => {
 *     if(params.base64Image) {
 *       const completion = await openai.chat.completions.create({
 *         model: "gpt-4o",
 *         messages: params.messages
 *       });
 *       return completion.choices[0].message.content;
 *     }
 *     return null;
 *   }
 * });
 *
 * // Using Markitdown
 * const converter = new Markitdown({
 *   llmCall: async (params) => {
 *     if(params.base64Image) {
 *       const completion = await openai.chat.completions.create({
 *         model: "gpt-4o",
 *         messages: params.messages
 *       });
 *       return completion.choices[0].message.content;
 *     }
 *     return null;
 *   }
 * });
 * let result = await converter.convert('photo.jpg');
 * ```
 */
export default class ImageConverter extends MediaConverter {
  /**
   * Converts an image file to markdown format with metadata, OCR text, and AI description.
   *
   * @param {string} localPath - Path to the local image file
   * @param {ConversionOptions} options - Conversion options
   * @param {string} [options.fileExtension] - File extension (must be .jpg, .jpeg, or .png)
   * @param {LlmCall} [options.llmCall] - Callback function for LLM image description
   * @returns {Promise<DocumentConverterResult>} Conversion result or null if:
   *   - File is not a supported image type
   *   - File cannot be read
   *
   * @remarks
   * The converter attempts to extract three types of information:
   * 1. Metadata fields: ImageSize, Title, Caption, Description, Keywords, Artist,
   *    Author, DateTimeOriginal, CreateDate, GPSPosition
   * 2. OCR text (requires Tesseract installation)
   * 3. AI-generated description (requires configured llmCall)
   * @override
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
      const text = await tesseract.recognize(localPath);
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

  /**
   * Gets an AI-generated description of the image using the provided LLM callback.
   *
   * @param {Object} params - Parameters for LLM description generation
   * @param {string} params.localPath - Path to the image file
   * @param {string} params.fileExtension - File extension for MIME type determination
   * @param {LlmCall} params.llmCall - Callback function for LLM processing
   * @returns {Promise<string | null>} Generated description or null if:
   *   - LLM callback is not provided
   *   - Image processing fails
   *   - LLM call fails
   *
   * @private
   */
  private async _getLlmDescription({
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
