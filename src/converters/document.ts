import { type AxiosInstance } from "axios";

export default abstract class DocumentConverter {
  abstract convert(
    localPath: string,
    options?: ConversionOptions
  ): Promise<DocumentConverterResult>;
}

// Represents the result of converting a document to text.
export type DocumentConverterResult = {
  title: string | null;
  textContent: string;
} | null;

// Represents the options passed to the converter for converting a document to text.
export type ConversionOptions = {
  fileExtension: string;
  parentConverters?: DocumentConverter[];
  url?: string;
  requestsSession?: AxiosInstance;
  [key: string]: any;
};
