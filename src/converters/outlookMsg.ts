import fs from "fs";
import kenjiunoMsgReader from "@kenjiuno/msgreader";
import DocumentConverter from "../converters/document";
import type {
  DocumentConverterResult,
  ConversionOptions,
} from "../types/document";

// @kenjiuno/msgreader exports an object with key "default" for commonjs which we need to handle in our cjs version
const MsgReader = ("default" in kenjiunoMsgReader
  ? kenjiunoMsgReader.default
  : kenjiunoMsgReader) as unknown as typeof kenjiunoMsgReader;

/**
 * Converts Outlook MSG files (.msg) to markdown format.
 * Extracts email metadata (sender, receiver, subject) and content including attachments.
 *
 * @extends DocumentConverter
 *
 * @example
 * ```typescript
 * const outlookConverter = new OutlookMsgConverter();
 * let result = await outlookConverter.convert('outlook.msg', {
 *   fileExtension: '.msg'
 * });
 *
 * // Using Markitdown
 * const converter = new Markitdown();
 * let result = await converter.convert('outlook.msg');
 * ```
 */
export default class OutlookMsgConverter extends DocumentConverter {
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
  }
  /**
   * Converts an Outlook MSG file to markdown format.
   * The resulting markdown includes email metadata, body content, and attachment information.
   *
   * @param {string} localPath - Path to the .msg file
   * @param {ConversionOptions} options - Conversion options including file extension
   * @returns {Promise<DocumentConverterResult>} Object containing email subject as title and formatted markdown as textContent
   * @throws {Error} If the file cannot be read or parsed
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "";
    if (extension.toLowerCase() !== ".msg") return null;

    try {
      const msgFileBuffer = fs.readFileSync(localPath);
      const msgReader = new MsgReader(msgFileBuffer as unknown as ArrayBuffer);
      const msgData = msgReader.getFileData();

      const subject = msgData.subject || "No Subject";
      const sender = msgData.senderEmail || "Unknown Sender";
      const receiver =
        (msgData.recipients && msgData.recipients[0]?.email) ||
        "Unknown Receiver";
      const body = msgData.body || "No Message Body";
      const attachments = msgData.attachments || [];

      let mdContent = `# Email Message\n\n`;
      mdContent += `**From:** ${sender}\n\n`;
      mdContent += `**To:** ${receiver}\n\n`;
      mdContent += `**Subject:** ${subject}\n\n`;

      // Add Attachments if available
      if (attachments.length > 0) {
        mdContent += `## Attachments:\n\n`;
        attachments.forEach((attachment) => {
          mdContent += `- ${attachment.fileName} (${attachment.contentLength} bytes)\n`;
        });
      }

      mdContent += `\n## Content:\n${body}\n\n`;

      return {
        title: subject,
        textContent: mdContent.trim(),
      };
    } catch (error) {
      throw new Error(
        `Could not convert MSG file '${localPath}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
