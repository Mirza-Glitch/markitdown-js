import { parse } from "node-html-parser";
import fs from "fs";
import DocumentConverter from "./document";
import type {
  DocumentConverterResult,
  ConversionOptions,
} from "../types/document";
import CustomMarkdownConverter from "./customMarkdown";

/**
 * Represents a section in a Wikipedia document with title, level, id, and content.
 */
interface Section {
  title: string;
  level?: number;
  id?: string;
  content: string;
}

/**
 * WikipediaConverter class handles the conversion of Wikipedia HTML pages to Markdown format.
 * This class specifically focuses on extracting and formatting the main content while removing
 * unnecessary elements like references, edit sections, and other Wikipedia-specific markup.
 *
 * @extends DocumentConverter
 *
 * @example
 * ```typescript
 * const wikipediaConverter = new WikipediaConverter();
 * // first fetch and save the search results in a HTML file
 * let result = await wikipediaConverter.convert("wikipediaFile.html", {
 *   fileExtension: ".html",
 *   url: "https://en.wikipedia.org/wiki/Javascript"
 * })
 *
 * // Using Markitdown
 * const converter = new Markitdown();
 * let result = await converter.convert('https://en.wikipedia.org/wiki/Javascript');
 * ```
 */
export default class WikipediaConverter extends DocumentConverter {
  private _turndown: CustomMarkdownConverter;

  /**
   * Initializes a new instance of WikipediaConverter and configures the markdown converter.
   */
  constructor(
    priority: number = DocumentConverter.PRIORITY_SPECIFIC_FILE_FORMAT
  ) {
    super(priority);
    this._turndown = new CustomMarkdownConverter();
    this._configureTurndown();
  }

  /**
   * Configures the Turndown converter with Wikipedia-specific rules for handling
   * images and references.
   * @private
   */
  private _configureTurndown() {
    // Better image handling
    this._turndown.addRule("image", {
      filter: ["img"],
      replacement: function (content, node) {
        const alt = (node as HTMLImageElement).getAttribute("alt") || "";
        const src = (node as HTMLImageElement).getAttribute("src") || "";
        const width = (node as HTMLImageElement).getAttribute("width");
        const height = (node as HTMLImageElement).getAttribute("height");

        let markdown = `![${alt}](${
          src.startsWith("//") ? "https:" + src : src
        })`;
        if (width && height) {
          markdown += `{: width="${width}" height="${height}"}`;
        }
        return markdown;
      },
    });

    // Handle Wikipedia specific elements
    this._turndown.addRule("wikiRef", {
      filter: (node) => {
        return node.classList && node.classList.contains("reference");
      },
      replacement: function (content, node) {
        return ""; // Remove reference numbers
      },
    });
  }

  /**
   * Converts a Wikipedia HTML file to Markdown format.
   * @param {string} localPath - The local file path to the Wikipedia HTML file
   * @param {ConversionOptions} options - Conversion options including file extension and URL
   * @returns {Promise<DocumentConverterResult>} The converted document or null if conversion fails
   */
  async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    // Bail if not Wikipedia
    const extension = options.fileExtension || "";
    if (![".html", ".htm"].includes(extension.toLowerCase())) {
      return null;
    }

    const url = options.url || "";
    if (!/^https?:\/\/[a-zA-Z]{2,3}\.wikipedia\.org\//.test(url)) {
      return null;
    }

    // Parse the file
    let html: string;
    try {
      html = fs.readFileSync(localPath, "utf-8");
    } catch (error) {
      console.error("Error reading file:", error);
      return null;
    }

    const root = parse(html);
    const titleElm = root.querySelector("span.mw-page-title-main");
    const bodyElm = root.querySelector(
      "div#mw-content-text"
    ) as unknown as HTMLElement;
    this.cleanupContent(bodyElm);

    const content = {
      title: titleElm?.textContent?.trim() ?? "",
      sections: this.parseSections(bodyElm),
    };

    return {
      title: content.title,
      textContent: this.generateMarkdown(
        content,
        root as unknown as HTMLElement
      ),
    };
  }

  /**
   * Removes unwanted elements from the Wikipedia content and cleans up the HTML structure.
   * @param {HTMLElement} element - The root element containing Wikipedia content
   * @private
   */
  private cleanupContent(element: HTMLElement) {
    const selectorsToRemove = [
      ".mw-editsection",
      ".reference",
      ".error",
      ".noprint",
      "#toc",
      ".toc",
      "style",
      "script",
      "table.infobox",
    ];

    selectorsToRemove.forEach((selector) => {
      element.querySelectorAll(selector).forEach((el) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });

    // Remove content after "See also" section
    const headings = element.querySelectorAll("h2");
    let seeAlsoHeading: HTMLHeadingElement | null = null;

    for (const heading of Array.from(headings)) {
      if (heading.textContent?.trim() === "See also") {
        seeAlsoHeading = heading;
        break;
      }
    }

    if (seeAlsoHeading && seeAlsoHeading.parentNode) {
      const parentElement = seeAlsoHeading.parentNode;
      if (parentElement.parentNode) {
        let currentElement = parentElement;
        while (currentElement.nextSibling) {
          const nextElement = currentElement.nextSibling;
          if (nextElement.parentNode) {
            nextElement.parentNode.removeChild(nextElement);
          }
        }
        parentElement.parentNode.removeChild(parentElement);
      }
    }
  }

  /**
   * Creates an anchor ID from text by removing non-alphanumeric characters and converting to lowercase.
   * @param {string} text - The text to convert to an anchor ID
   * @returns {string} The formatted anchor ID
   * @private
   */
  private _createAnchorId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  /**
   * Parses the Wikipedia content into sections with titles and content.
   * @param {HTMLElement} mainContent - The main content element to parse
   * @returns {Section[]} An array of parsed sections
   * @private
   */
  private parseSections(mainContent: HTMLElement): Section[] {
    const sections: Section[] = [];
    let currentSection: Section = { title: "", content: "" };
    let inLeadSection = true;
    let currentHtml = "";

    mainContent.childNodes.forEach((element) => {
      const htmlElement = element as HTMLElement;
      if (!htmlElement.tagName) return;

      if (htmlElement.tagName.match(/^H[1-6]$/i)) {
        if (currentHtml) {
          if (inLeadSection) {
            sections.push({
              title: "Introduction",
              level: 2,
              id: "introduction",
              content: this._turndown.convert(currentHtml),
            });
            inLeadSection = false;
          } else {
            const content = this._turndown.convert(currentHtml);
            sections.push({
              title: currentSection.title,
              content,
            });
          }
          currentHtml = "";
        }

        const headingText =
          htmlElement.querySelector(".mw-headline")?.textContent ||
          htmlElement.textContent?.trim();
        const level =
          htmlElement.tagName && htmlElement.tagName[1]
            ? parseInt(htmlElement.tagName[1])
            : 5;
        const headingId = this._createAnchorId(headingText as string);

        currentSection = {
          title: headingText ?? "",
          level,
          id: headingId ?? "",
          content: "",
        };
      } else {
        currentHtml += htmlElement.outerHTML || "";
      }
    });

    if (currentHtml) {
      const content = this._turndown.convert(currentHtml);
      sections.push({
        ...currentSection,
        title: currentSection.title,
        content,
      });
    }

    return sections;
  }

  /**
   * Generates a table of contents from the document headings.
   * @param {HTMLElement} root - The root element containing headings
   * @returns {string} Markdown formatted table of contents
   * @private
   */
  private generateTableOfContents(root: HTMLElement): string {
    let toc = "## Table of Contents\n\n";

    root?.querySelectorAll(".mw-heading").forEach((el) => {
      const headingClassname = el.classList.toString();
      const headingLevel = headingClassname.endsWith("2") ? 1 : 2;
      const headingText = el?.textContent?.trim() ?? "";
      const headingId = this._createAnchorId(headingText);
      toc += `${"  ".repeat(headingLevel)} - [${headingText}](#${headingId
        .toLowerCase()
        .replace(/\s+/g, "-")})\n`;
    });

    return toc + "\n";
  }

  /**
   * Generates the final Markdown document from the parsed content.
   * @param {{title: string, sections: Section[]}} content - The parsed document content
   * @param {HTMLElement} root - The root HTML element
   * @returns {string} The complete Markdown document
   * @private
   */
  private generateMarkdown(
    content: { title: string; sections: Section[] },
    root: HTMLElement
  ): string {
    let markdown = "";

    markdown += `# ${content.title}\n\n`;
    markdown += this.generateTableOfContents(root);

    content.sections.forEach((section) => {
      if (section.title) {
        const headingLevel = "#".repeat(Math.min(section.level ?? 0, 6));
        markdown += `${headingLevel} [${section.title}](#${section.id})\n\n`;
      }
      markdown += section.content + "\n\n";
    });

    return markdown;
  }
}
