import fs from "fs";
import tmp from "tmp";
import Ffmpeg from "fluent-ffmpeg";
import AudioConverter from "./audio";
import type { ConversionOptions } from "./document";

export default class VideoConverter extends AudioConverter {
  override async convert(localPath: string, options: ConversionOptions) {
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
