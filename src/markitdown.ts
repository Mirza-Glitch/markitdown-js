import path from "path";
import fs from "fs";
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import tmp from "tmp";
import Ffmpeg from "fluent-ffmpeg";
import type { LlmCall, MarkItDownOptions } from "./types/markitdown";
import type { DocumentConverterResult } from "./types/document";
import DocumentConverter from "./converters/document";
import PlainTextConverter from "./converters/plainText";
import HtmlConverter from "./converters/html";
import RSSConverter from "./converters/rss";
import WikipediaConverter from "./converters/wikipedia";
import YouTubeConverter from "./converters/youtube";
import BingSerpConverter from "./converters/bingSerp";
import DocxConverter from "./converters/docx";
import XlsxConverter from "./converters/xlsx";
import PptxConverter from "./converters/pptx";
import AudioConverter from "./converters/audio";
import VideoConverter from "./converters/video";
import ImageConverter from "./converters/image";
import IpynbConverter from "./converters/ipynb";
import PdfConverter from "./converters/pdf";
import ZipConverter from "./converters/zip";
import OutlookMsgConverter from "./converters/outlookMsg";
import DocumentIntelligenceConverter from "./converters/documentIntelligence";

declare global {
  var IS_FFMPEG_CAPABLE: boolean;
}

// Ffmpeg Support
global.IS_FFMPEG_CAPABLE = false;

/**
 * MarkItDown is a document conversion utility that supports multiple file formats
 * and provides conversion to markdown format.
 *
 * @class
 *
 * @example
 * ```typescript
 * const markitdown = new MarkItDown({
 *   llmCall: async (params) => {
 *     const openai = new OpenAI();
 *     if(params.file) {
 *       const completion = await openai.audio.transcriptions.create({
 *         model: "whisper-1",
 *         file: params.file
 *       });
 *       return completion.text;
 *     } else if(params.messages) {
 *       const completion = await openai.chat.completions.create({
 *         model: "gpt-4o",
 *         messages: params.messages
 *       });
 *       return completion.text;
 *     } else {
 *       return null;
 *     }
 *   },
 *   styleMap: [
 *     "p[style-name='Section Title'] => h1:fresh",
 *     "p[style-name='Subsection Title'] => h2:fresh"
 *   ],
 *   docintelEndpoint: 'https://your-endpoint.cognitiveservices.azure.com/'
 * });
 * let docxResult = await markitdown.convert('document.docx');
 * let pdfResult = await markitdown.convert('invoice.pdf');
 * let pptxResult = await markitdown.convert('presentation.pptx');
 * let imageOcrResult = await markitdown.convert('image.png');
 * ```
 */
export default class MarkItDown {
  private _requestsSession: AxiosInstance;
  private _llmCall: LlmCall;
  private _styleMap: any;
  private _pageConverters: DocumentConverter[];

  /**
   * Creates a new instance of MarkItDown.
   * @param {Object} options - Configuration options for the converter
   * @param {AxiosInstance} [options.requestsSession=axios.create()] - Custom axios instance for HTTP requests
   * @param {LlmCall} [options.llmCall=null] - Language model callback function
   * @param {Object} [options.styleMap=null] - Custom style mapping for docx conversions
   * @param {string} [options.docintelEndpoint=null] - Document intelligence API endpoint
   */
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

  /**
   * Checks if FFmpeg is available in the system.
   * @private
   */
  private _checkFfmpeg(): void {
    Ffmpeg.getAvailableFormats((err, _formats) => {
      if (err)
        console.warn(
          "Ffmpeg not installed! Audio transcription will not work."
        );
      else global.IS_FFMPEG_CAPABLE = true;
    });
  }

  /**
   * Registers all default document converters.
   * @private
   */
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

  /**
   * Converts a source to markdown format.
   * @param {string | fs.ReadStream} source - The source to convert (URL, file path, or ReadStream)
   * @param {Object} [options={}] - Conversion options
   * @returns {Promise<DocumentConverterResult>} The conversion result
   * @throws {Error} When the source type is unsupported
   */
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

  /**
   * Converts a File ReadStream to markdown.
   * @param {fs.ReadStream} stream - The input stream to convert
   * @param {Object} [options={}] - Conversion options
   * @param {string} [options.fileExtension] - Optional file extension to help determine the converter
   * @returns {Promise<DocumentConverterResult>} The conversion result
   */
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

  /**
   * Converts a local file to markdown.
   * @param {string} filePath - Path to the local file
   * @param {Object} [options={}] - Conversion options
   * @returns {Promise<DocumentConverterResult>} The conversion result
   */
  async convertLocal(
    filePath: string,
    options: Record<string, any> = {}
  ): Promise<DocumentConverterResult> {
    const extensions = this._determineExtensions(filePath, options);
    return this._convert(filePath, extensions, options);
  }

  /**
   * Fetches a URL as a stream and converts it into markdown using convertResponse.
   * @param {string} url - The URL to convert
   * @param {Object} [options={}] - Conversion options
   * @returns {Promise<DocumentConverterResult>} The conversion result
   */
  async convertUrl(
    url: string,
    options: Record<string, any> = {}
  ): Promise<DocumentConverterResult> {
    const response = await this._requestsSession.get(url, {
      responseType: "stream",
    });
    return this.convertResponse(response, options);
  }

  /**
   * Converts an Axios response to markdown.
   * @param {AxiosResponse} response - The Axios response to convert
   * @param {Object} [options={}] - Conversion options
   * @returns {Promise<DocumentConverterResult>} The conversion result
   */
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

  /**
   * Internal method to convert a file using the appropriate converter.
   * @private
   * @param {string} filePath - Path to the file to convert
   * @param {string[]} extensions - Array of possible file extensions
   * @param {Object} options - Conversion options
   * @returns {Promise<DocumentConverterResult>} The conversion result
   * @throws {Error} When no suitable converter is found
   */
  private async _convert(
    filePath: string,
    extensions: string[],
    options: Record<string, any>
  ): Promise<DocumentConverterResult> {
    // Create a copy of the _pageConverters list, sorted by priority.
    const sortedConverters = [...this._pageConverters].sort(
      (a, b) => a.priority - b.priority
    );
    for (const ext of extensions) {
      for (const converter of sortedConverters) {
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

  /**
   * Determines the file extensions to try for conversion.
   * @private
   * @param {string} filePath - Path to the file
   * @param {Object} options - Options containing potential file extension
   * @returns {string[]} Array of possible file extensions
   */
  private _determineExtensions(
    filePath: string,
    options: Record<string, any>
  ): string[] {
    const ext = options.fileExtension || path.extname(filePath);
    return ext ? [ext] : [];
  }

  /**
   * Registers a new document converter.
   * @param {DocumentConverter} converter - The converter to register
   */
  registerConverter(converter: DocumentConverter): void {
    this._pageConverters.unshift(converter);
  }
}

export {
  MarkItDown,
  DocumentConverter,
  PlainTextConverter,
  HtmlConverter,
  RSSConverter,
  WikipediaConverter,
  YouTubeConverter,
  BingSerpConverter,
  DocxConverter,
  XlsxConverter,
  PptxConverter,
  AudioConverter,
  VideoConverter,
  ImageConverter,
  IpynbConverter,
  PdfConverter,
  ZipConverter,
  OutlookMsgConverter,
  DocumentIntelligenceConverter,
};
export { default as CustomMarkdownConverter } from "./converters/customMarkdown";
export { default as MediaConverter } from "./converters/media";
