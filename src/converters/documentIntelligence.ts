import fs from "fs";
import { DefaultAzureCredential } from "@azure/identity";
import createDocIntelClient, {
  getLongRunningPoller,
  isUnexpected,
  type DocumentIntelligenceClient,
  type AnalyzeOperationOutput,
} from "@azure-rest/ai-document-intelligence";
import DocumentConverter from "./document";
import type {
  ConversionOptions,
  DocumentConverterResult,
} from "../types/document";

/**
 * Converts documents using Azure Document Intelligence API.
 * Supports various document formats including PDF, Office documents, and images.
 * @extends DocumentConverter
 */
export default class DocumentIntelligenceConverter extends DocumentConverter {
  /** Azure Document Intelligence client instance */
  docIntelClient: DocumentIntelligenceClient;

  /**
   * Creates a new DocumentIntelligenceConverter instance.
   * @param {Object} config - Configuration options
   * @param {string} config.endpoint - Azure Document Intelligence API endpoint
   * @param {string} [config.apiVersion='2024-07-31-preview'] - API version to use
   * @throws {Error} If authentication with Azure fails
   */
  constructor({
    endpoint,
    apiVersion = "2024-07-31-preview",
    priority = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT,
  }: {
    endpoint: string;
    apiVersion?: string;
    priority?: number;
  }) {
    super(priority);
    this.docIntelClient = createDocIntelClient(
      endpoint,
      new DefaultAzureCredential(),
      {
        apiVersion,
      }
    );
  }

  /**
   * Converts a document to markdown format using Azure Document Intelligence.
   *
   * @param {string} localPath - Path to the local file
   * @param {ConversionOptions} options - Conversion options
   * @returns {Promise<DocumentConverterResult>} Conversion result or null if file type not supported
   *
   * @remarks
   * Supported file extensions:
   * - Documents: .pdf, .docx, .xlsx, .pptx, .html
   * - Images: .jpeg, .jpg, .png, .bmp, .tiff, .heif
   *
   * Note: Some analysis features (formulas, ocrHighResolution, styleFont) are not
   * available for Office file types (.xlsx, .pptx, .html, .docx)
   *
   * @throws {Error} If the Azure API request fails
   *
   * @example
   * ```typescript
   * const converter = new Markitdown({
   *   docintelEndpoint: "https://your-endpoint.cognitiveservices.azure.com/"
   * });
   * const result = await converter.convert("document.pdf");
   * ```
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    // Bail if extension is not supported by Document Intelligence
    const extension = options.fileExtension || "";
    const docintelExtensions = [
      ".pdf",
      ".docx",
      ".xlsx",
      ".pptx",
      ".html",
      ".jpeg",
      ".jpg",
      ".png",
      ".bmp",
      ".tiff",
      ".heif",
    ];

    if (!docintelExtensions.includes(extension.toLowerCase())) {
      return null;
    }

    // Get the file buffer as base64
    const base64Source = fs.readFileSync(localPath, { encoding: "base64" });

    // Certain document analysis features are not available for office filetypes
    let analysisFeatures: string[] = [];
    if (
      ![".xlsx", ".pptx", ".html", ".docx"].includes(extension.toLowerCase())
    ) {
      analysisFeatures.push("formulas", "ocrHighResolution", "styleFont");
    }

    // Extract the text using Azure Document Intelligence
    const initialResponse = await this.docIntelClient
      .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
      .post({
        contentType: "application/json",
        body: {
          base64Source,
        },
        queryParameters: {
          outputContentFormat: "markdown",
          features: analysisFeatures,
        },
      });

    // throw error if isUnexpected
    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error;
    }

    const poller = getLongRunningPoller(this.docIntelClient, initialResponse);
    const result = (await poller.pollUntilDone())
      .body as AnalyzeOperationOutput;

    const markdownText =
      result.analyzeResult?.content ||
      `\n## Document Data:\nError. Could not generate data because api ended with status ${result.status}.`;

    return {
      title: null,
      textContent: markdownText,
    };
  }
}
