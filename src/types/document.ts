import type { AxiosInstance } from "axios";
import type DocumentConverter from "../converters/document";
import type { MarkItDownOptions } from "./markitdown";

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
} & MarkItDownOptions;
