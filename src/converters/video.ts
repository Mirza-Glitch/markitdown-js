import fs from "fs";
import tmp from "tmp";
import Ffmpeg from "fluent-ffmpeg";
import AudioConverter from "./audio";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";

/**
 * Converts video files to markdown format, extracting metadata and optionally transcribing audio.
 * Supports MP4, MKV, WebM, and MPEG formats.
 *
 * Features:
 * - Extracts video metadata (title, artist, date, etc.)
 * - Transcribes audio content when FFmpeg is available
 * - Inherits audio processing capabilities from AudioConverter
 *
 * @extends AudioConverter
 *
 * @example
 * ```typescript
 * const videoConverter = new VideoConverter();
 * let result = await videoConverter.convert('audio.wav', {
 *   fileExtension: ".wav",
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
 *
 * // Using Markitdown
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
 * let result = await converter.convert('audio.wav');
 * ```
 */
export default class VideoConverter extends AudioConverter {
  /**
   * Converts a video file to markdown format.
   * Extracts available metadata and optionally transcribes audio content if FFmpeg is available.
   *
   * @param {string} localPath - Path to the video file
   * @param {ConversionOptions} options - Conversion options including:
   *   - fileExtension: The file extension (must be .mp4, .mkv, .webm, or .mpeg)
   *   - llmCall: Optional function for audio transcription
   * @returns {Promise<DocumentConverterResult>} Object containing extracted metadata and optional transcript,or returns null for unsupported file types
   * @throws {Error} If file processing or transcription fails
   */
  override async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const supportedVideoExtensions = [".mp4", ".mkv", ".webm", ".mpeg"];
    if (!supportedVideoExtensions.includes(options.fileExtension)) return null;
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

    if (typeof options.llmCall === "function" && global.IS_FFMPEG_CAPABLE) {
      const tempPath = tmp.tmpNameSync({
        prefix: "markitdownjs-",
        postfix: ".wav",
      });

      try {
        await new Promise((resolve, reject) => {
          Ffmpeg(localPath)
            .toFormat("wav")
            .save(tempPath)
            .on("end", resolve)
            .on("error", reject);
        }).catch((err) => {
          console.error("Error in video conversion:", err);
        });

        const transcript = await super._transcribeAudio(
          localPath,
          options.llmCall
        );
        mdContent += `\n\n### Audio Transcript:\n${
          transcript || "[No speech detected]"
        }`;
      } catch (err) {
        mdContent +=
          "\n\n### Audio Transcript:\nError. Could not transcribe this audio.";
      } finally {
        fs.unlinkSync(tempPath);
      }
    }
    return { title: null, textContent: mdContent.trim() };
  }
}
