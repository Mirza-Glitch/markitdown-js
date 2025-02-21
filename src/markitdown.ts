import path from "path";
import fs from "fs";
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import tmp from "tmp";
import Ffmpeg from "fluent-ffmpeg";
import DocumentConverter, {
  type DocumentConverterResult,
} from "./converters/document.js";
import PlainTextConverter from "./converters/plainText";
import HtmlConverter from "./converters/html";
import RSSConverter from "./converters/rss";
import WikipediaConverter from "./converters/wikipedia.js";
import YouTubeConverter from "./converters/youtube.js";
import BingSerpConverter from "./converters/bingSerp.js";
import DocxConverter from "./converters/docx";
import XlsxConverter from "./converters/xlsx";
import PptxConverter from "./converters/pptx.js";
import AudioConverter from "./converters/audio.js";
import VideoConverter from "./converters/video.js";
import ImageConverter from "./converters/image";
import IpynbConverter from "./converters/ipynb.js";
import PdfConverter from "./converters/pdf.js";
import ZipConverter from "./converters/zip";
import OutlookMsgConverter from "./converters/outlookMsg.js";
import DocumentIntelligenceConverter from "./converters/documentIntelligence.js";

declare global {
  var IS_FFMPEG_CAPABLE: boolean;
}

// TODO: Fix/Improve This Typing System
type TextContent = {
  type: "text";
  text: string;
};

type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

type MessageContent = TextContent | ImageContent;

export type Message = {
  role: "user" | "assistant" | "system";
  content: MessageContent[];
};

export type LlmCallInputParams = {
  messages?: Message[];
  imageBase64?: string;
  file?: fs.ReadStream;
};

export type LlmCall =
  | ((params: LlmCallInputParams) => Promise<string | null>)
  | null;

export interface MarkItDownOptions {
  requestsSession?: AxiosInstance;
  llmCall?: LlmCall;
  styleMap?: any;
  docintelEndpoint?: string | null;
}

// Ffmpeg Support
global.IS_FFMPEG_CAPABLE = false;

export default class MarkItDown {
  private _requestsSession: AxiosInstance;
  private _llmCall: LlmCall;
  private _styleMap: any;
  private _pageConverters: DocumentConverter[];

  constructor({
    requestsSession = axios.create(),
    llmCall = null,
    styleMap = null,
    docintelEndpoint = null,
  }: MarkItDownOptions = {}) {
    this._requestsSession = requestsSession;
    this._llmCall = llmCall;
    this._styleMap = styleMap;
    this._pageConverters = [];

    this._checkFfmpeg();
    this._registerDefaultConverters();

    if (docintelEndpoint)
      this.registerConverter(
        new DocumentIntelligenceConverter({ endpoint: docintelEndpoint })
      );
  }

  private _checkFfmpeg(): void {
    Ffmpeg.getAvailableFormats((err, _formats) => {
      if (err)
        console.warn(
          "Ffmpeg not installed! Audio transcription will not work."
        );
      else global.IS_FFMPEG_CAPABLE = true;
    });
  }

  private _registerDefaultConverters(): void {
    this.registerConverter(new PlainTextConverter());
    this.registerConverter(new HtmlConverter());
    this.registerConverter(new RSSConverter());
    this.registerConverter(new WikipediaConverter());
    this.registerConverter(new YouTubeConverter());
    this.registerConverter(new BingSerpConverter());
    this.registerConverter(new DocxConverter());
    this.registerConverter(new XlsxConverter());
    this.registerConverter(new PptxConverter());
    this.registerConverter(new AudioConverter());
    this.registerConverter(new VideoConverter());
    this.registerConverter(new ImageConverter());
    this.registerConverter(new IpynbConverter());
    this.registerConverter(new PdfConverter());
    this.registerConverter(new ZipConverter());
    this.registerConverter(new OutlookMsgConverter());
  }

  async convert(
    source: string | fs.ReadStream,
    options: Record<string, any> = {}
  ): Promise<DocumentConverterResult> {
    options.parentConverters = this._pageConverters;
    options.requestsSession = this._requestsSession;
    options.llmCall = this._llmCall;
    options.styleMap = this._styleMap;

    if (typeof source === "string") {
      if (/^https?:\/\//.test(source) || source.startsWith("file://")) {
        options.url = source;

        return this.convertUrl(source, options);
      }
      return this.convertLocal(source, options);
    }
    if (source instanceof fs.ReadStream) {
      return this.convertStream(source, options);
    }
    throw new Error("Unsupported source type.");
  }

  async convertStream(
    stream: fs.ReadStream,
    options: { fileExtension?: string } = {}
  ): Promise<DocumentConverterResult> {
    const extensions = options.fileExtension ? [options.fileExtension] : [];
    const tempPath = tmp.fileSync({
      prefix: "markitdownjs-",
      postfix: ".html",
    }).name;
    let result: DocumentConverterResult = null;

    try {
      const writableStream = fs.createWriteStream(tempPath);
      await new Promise<void>((resolve, reject) => {
        stream.pipe(writableStream);
        stream.on("end", resolve);
        stream.on("error", reject);
      });

      const guessedExtensions = this._determineExtensions(tempPath, options);
      guessedExtensions.forEach((ext) =>
        this._convert(tempPath, [ext], options)
      );

      result = await this._convert(tempPath, extensions, options);
    } finally {
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.error("Error deleting temp file:", err);
      }
    }

    return result;
  }

  async convertLocal(
    filePath: string,
    options: Record<string, any> = {}
  ): Promise<DocumentConverterResult> {
    const extensions = this._determineExtensions(filePath, options);
    return this._convert(filePath, extensions, options);
  }

  async convertUrl(
    url: string,
    options: Record<string, any> = {}
  ): Promise<DocumentConverterResult> {
    const response = await this._requestsSession.get(url, {
      responseType: "stream",
    });
    return this.convertResponse(response, options);
  }

  async convertResponse(
    response: AxiosResponse,
    options: Record<string, any> = {}
  ): Promise<DocumentConverterResult> {
    const tempFile = tmp.tmpNameSync({
      prefix: "markitdownjs-",
      postfix: ".html",
    });
    try {
      const writer = fs.createWriteStream(tempFile);
      response.data.pipe(writer);
      await new Promise<void>((resolve, reject) => {
        writer.on("finish", () => resolve());
        writer.on("error", reject);
      });

      return this._convert(
        tempFile,
        this._determineExtensions(tempFile, options),
        options
      ).finally(() => {
        try {
          fs.unlinkSync(tempFile);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      });
    } catch (err) {
      console.error("Error converting response:", err);
      return null;
    }
  }

  private async _convert(
    filePath: string,
    extensions: string[],
    options: Record<string, any>
  ): Promise<DocumentConverterResult> {
    for (const ext of extensions) {
      for (const converter of this._pageConverters) {
        try {
          const result = await converter.convert(filePath, {
            ...options,
            fileExtension: ext,
          });
          if (result) return result;
        } catch (error) {
          console.error(
            `Conversion failed for ${filePath} with ${ext}:`,
            error
          );
        }
      }
    }
    throw new Error(`Cannot convert ${filePath}. No suitable converter found.`);
  }

  private _determineExtensions(
    filePath: string,
    options: Record<string, any>
  ): string[] {
    const ext = options.fileExtension || path.extname(filePath);
    return ext ? [ext] : [];
  }

  registerConverter(converter: DocumentConverter): void {
    this._pageConverters.unshift(converter);
  }
}
