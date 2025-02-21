import fs from "fs";
import type { ConversionOptions, DocumentConverterResult } from "./document";
import MediaConverter from "./media";
import type { LlmCall } from "../markitdown";

export default class AudioConverter extends MediaConverter {
  override async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const supportedAudioExtensions = [".m4a", ".mp3", ".mpga", ".wav"];
    if (!supportedAudioExtensions.includes(options.fileExtension.toLowerCase()))
      return null;
    let mdContent = "";

    const metadata = await this._getMetadata(localPath);
    if (metadata) {
      [
        "Title",
        "Artist",
        "Author",
        "Band",
        "Album",
        "Genre",
        "Track",
        "DateTimeOriginal",
        "CreateDate",
        "Duration",
      ].forEach((field) => {
        if (metadata[field]) {
          mdContent += `- **${field}**: ${metadata[field]}\n`;
        }
      });
    }

    try {
      const transcript = await this._transcribeAudio(
        localPath,
        options.llmCall
      );
      mdContent += `\n# Audio Transcript:\n\n${
        transcript || "[No speech detected]"
      }`;
    } catch (err) {
      console.error(err);
      mdContent +=
        "\n## Audio Transcript:\nError. Could not transcribe this audio.";
    }

    return {
      title: null,
      textContent: mdContent.trim(),
    };
  }

  async _transcribeAudio(localPath: string, llmCall: LlmCall) {
    if (typeof llmCall !== "function") return null;
    try {
      const file = fs.createReadStream(localPath);

      const response = await llmCall({ file });

      return response;
    } catch (error) {
      console.error("Error in transcription:", error);
      return null;
    }
  }
}
