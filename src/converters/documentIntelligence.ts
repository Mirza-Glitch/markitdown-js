import fs from "fs";
import { DefaultAzureCredential } from "@azure/identity";
import createDocIntelClient, {
  getLongRunningPoller,
  isUnexpected,
  type DocumentIntelligenceClient,
  type AnalyzeOperationOutput,
} from "@azure-rest/ai-document-intelligence";
import DocumentConverter from "./document";
import type { ConversionOptions, DocumentConverterResult } from "./document";

export default class DocumentIntelligenceConverter extends DocumentConverter {
  docIntelClient: DocumentIntelligenceClient;

  constructor({
    endpoint,
    apiVersion = "2024-07-31-preview",
  }: {
    endpoint: string;
    apiVersion?: string;
  }) {
    super();
    this.docIntelClient = createDocIntelClient(
      endpoint,
      new DefaultAzureCredential(),
      {
        apiVersion,
      }
    );

    // DocumentIntelligenceClient(endpoint, new DefaultAzureCredential())
    //   .path("/documentModels/{modelId}:analyze")
    //   .post({
    //     contentType: "application/json",
    //     body: { base64Source},
    //   });
  }

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

    // Certain document analysis features are not available for office filetypes (.xlsx, .pptx, .html, .docx)
    let analysisFeatures: string[] = [];
    if (
      ![".xlsx", ".pptx", ".html", ".docx"].includes(extension.toLowerCase())
    ) {
      analysisFeatures.push("formulas", "ocrHighResolution", "styleFont"); // enable formula extraction, high resolution OCR, and font style extraction
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

    const poller = getLongRunningPoller(this.docIntelClient, initialResponse); // create poller
    const result = (await poller.pollUntilDone())
      .body as AnalyzeOperationOutput; // get result body when the poll is finished

    const markdownText =
      result.analyzeResult?.content ||
      `\n## Document Data:\nError. Could not generate data because api ended with status ${result.status}.`;

    return {
      title: null,
      textContent: markdownText,
    };
  }
}
