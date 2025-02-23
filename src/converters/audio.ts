import fs from "fs";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";
import MediaConverter from "./media";
import type { LlmCall } from "../types/markitdown";

/**
 * Converter for audio files that extracts metadata and generates transcriptions.
 * Supports .m4a, .mp3, .mpga, and .wav formats.
 * @extends MediaConverter
 */
export default class AudioConverter extends MediaConverter {
  /**
   * Converts an audio file to markdown format, including metadata and transcription.
   * @param {string} localPath - Path to the local audio file
   * @param {ConversionOptions} options - Conversion options including file extension and LLM callback
   * @param {string} options.fileExtension - The file extension of the audio file
   * @param {LlmCall} [options.llmCall] - Callback function for audio transcription
   * @returns {Promise<DocumentConverterResult>} The conversion result or null if file type not supported
   *
   * @example
   * ```typescript
   * const converter = new Markitdown({
   *   llmCall: async (params) => {
   *     if(params.file) {
   *       const completion = await openai.audio.transcriptions.create({
   *         model: "whisper-1",
   *         file: params.file
   *       });
   *       return completion.text;
   *     }
   *   }
   * });
   * const result = await converter.convert('audio.wav');
   * ```
   * @override
   */
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

  /**
   * Transcribes audio content using the provided LLM callback function.
   * @param {string} localPath - Path to the local audio file
   * @param {LlmCall} llmCall - Callback function for audio transcription
   * @returns {Promise<string | null>} The transcription text or null if transcription fails or is unavailable
   */
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
