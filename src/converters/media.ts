import { exiftool } from "exiftool-vendored";
import DocumentConverter, {
  type ConversionOptions,
  type DocumentConverterResult,
} from "./document";

export default class MediaConverter extends DocumentConverter {
  convert(
    localPath: string,
    options?: ConversionOptions
  ): Promise<DocumentConverterResult> {
    throw new Error("Method not implemented.");
  }

  async _getMetadata(localPath: string): Promise<Record<string, any> | null> {
    try {
      const metadata = await exiftool.read(localPath);
      return metadata;
    } catch (error) {
      console.error("Error reading metadata:", error);
      return null;
    } finally {
      exiftool.end();
    }
  }
}
