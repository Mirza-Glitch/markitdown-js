import fs from "fs";
import kenjiunoMsgReader from "@kenjiuno/msgreader";
import DocumentConverter, {
  type ConversionOptions,
  type DocumentConverterResult,
} from "./document";

const MsgReader = ("default" in kenjiunoMsgReader ? kenjiunoMsgReader.default : kenjiunoMsgReader) as unknown as typeof kenjiunoMsgReader; // @kenjiuno/msgreader exports an object with key "default" after built which we need to handle in our cjs and esm version just like node-pptx-parser


export default class OutlookMsgConverter extends DocumentConverter {
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
