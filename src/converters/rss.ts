import fs from "fs/promises";
import { parse } from "node-html-parser";
import { DOMParser } from "xmldom";
import type {
  DocumentConverterResult,
  ConversionOptions,
} from "../types/document";
import HtmlConverter from "./html";

/**
 * Converts RSS, Atom, and XML feeds to markdown format.
 * Supports multiple feed formats with automatic format detection:
 * - RSS feeds (RSS 2.0)
 * - Atom feeds
 * - Generic XML documents
 *
 * @extends HtmlConverter
 */
export default class RSSConverter extends HtmlConverter {
  constructor() {
    super();
  }

  /**
   * Converts a feed file to markdown format.
   * Automatically detects the feed type (RSS, Atom, or XML) and processes accordingly.
   *
   * @param {string} localPath - Path to the feed file
   * @param {ConversionOptions} options - Conversion options including file extension
   * @returns {Promise<DocumentConverterResult>} Object containing formatted markdown with feed content, or returns null for unsupported file types or parsing failures
   *
   * @example
   * ```typescript
   * const converter = new Markitdown();
   * const xmlResult = await converter.convert('feed.xml');
   * const rssResult = await converter.convert('feed.rss');
   * const atomResult = await converter.convert('feed.atom');
   * ```
   */
  override async convert(
    localPath: string,
    options: ConversionOptions
  ): Promise<DocumentConverterResult> {
    const extension = options.fileExtension || "".toLowerCase();
    if (![".xml", ".rss", ".atom"].includes(extension)) {
      return null;
    }

    try {
      const content = await fs.readFile(localPath, "utf-8");
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/xml");

      let result: DocumentConverterResult = null;
      if (doc.getElementsByTagName("rss").length) {
        result = this._parseRssType(doc);
      } else if (doc.getElementsByTagName("feed").length) {
        const root = doc.getElementsByTagName("feed")[0];
        if (root?.getElementsByTagName("entry").length) {
          result = this._parseAtomType(doc);
        }
      } else {
        result = this._parseXmlType(doc);
      }

      return result;
    } catch (error) {
      console.error("RSS parsing error:", error);
      return null;
    }
  }

  /**
   * Parses an Atom feed document into markdown.
   * Extracts feed metadata and entries, including titles, summaries, and content.
   *
   * @param {Document} doc - Parsed XML document
   * @returns {DocumentConverterResult} Formatted markdown content
   * @private
   */
  private _parseAtomType(doc: Document): DocumentConverterResult {
    try {
      const root = doc.getElementsByTagName("feed")[0];
      const title = this._getDataByTagName(root as HTMLElement, "title");
      const subtitle = this._getDataByTagName(root as HTMLElement, "subtitle");
      const updated = this._getDataByTagName(root as HTMLElement, "updated");
      const id = this._getDataByTagName(root as HTMLElement, "id");
      const link = this._getDataByTagName(root as HTMLElement, "link");
      const entries = root?.getElementsByTagName("entry") || [];

      let mdText = `# ${title}\n`;
      if (subtitle) {
        mdText += `${subtitle}\n`;
      }
      if (updated) {
        mdText += `Updated on: ${updated}\n`;
      }
      if (id) {
        mdText += `ID: ${id}\n`;
      }
      if (link) {
        mdText += `Link: ${(link as unknown as Element).getAttribute(
          "href"
        )}\n`;
      }

      // Iterate over each entry in the Atom feed and extract the title, summary, updated, content, id, and link
      for (const entry of Array.from(entries)) {
        const entryTitle = this._getDataByTagName(
          entry as HTMLElement,
          "title"
        );
        const entrySummary = this._getDataByTagName(
          entry as HTMLElement,
          "summary"
        );
        const entryUpdated = this._getDataByTagName(
          entry as HTMLElement,
          "updated"
        );
        const entryContent = this._getDataByTagName(
          entry as HTMLElement,
          "content"
        );
        const entryId = this._getDataByTagName(entry as HTMLElement, "id");
        const entryLink = this._getDataByTagName(entry as HTMLElement, "link");

        if (entryTitle) mdText += `\n## ${entryTitle}\n`;
        if (entryUpdated) mdText += `Updated on: ${entryUpdated}\n`;
        if (entrySummary) mdText += this._parseContent(entrySummary) + "\n";
        if (entryContent) mdText += this._parseContent(entryContent) + "\n";
        if (entryId) mdText += `ID: ${entryId}\n`;
        if (entryLink)
          mdText += `Link: ${(entryLink as unknown as Element).getAttribute(
            "href"
          )}\n`;
      }

      return {
        title: title,
        textContent: mdText,
      };
    } catch (error) {
      console.error("Atom parsing error: ", error);
      return null;
    }
  }

  /**
   * Parses an RSS feed document into markdown.
   * Extracts channel metadata and items, including titles, descriptions, and content.
   *
   * @param {Document} doc - Parsed XML document
   * @returns {DocumentConverterResult} Formatted markdown content
   * @private
   */
  private _parseRssType(doc: Document): DocumentConverterResult {
    try {
      const root = doc.getElementsByTagName("rss")[0];
      const channels = root?.getElementsByTagName("channel") || [];
      if (!channels.length) return null;
      const channel = channels[0] as Element;
      const channelTitle = this._getDataByTagName(
        channel as HTMLElement,
        "title"
      );
      const channelDescription = this._getDataByTagName(
        channel as HTMLElement,
        "description"
      );
      const channelLink = this._getDataByTagName(
        channel as HTMLElement,
        "link"
      );
      const channelUpdated = this._getDataByTagName(
        channel as HTMLElement,
        "lastBuildDate"
      );
      const items = channel.getElementsByTagName("item");

      let mdText = "";
      if (channelTitle) mdText += `# ${channelTitle}\n`;
      if (channelUpdated) mdText += `Updated on: ${channelUpdated}\n`;
      if (channelDescription) mdText += `${channelDescription}\n`;
      if (channelLink) mdText += `ID: ${channelLink}\n`;
      // Iterate over each item in the RSS feed and extract the title, description, pubDate, content, and link
      for (const item of Array.from(items)) {
        const title = this._getDataByTagName(item as HTMLElement, "title");
        const description = this._getDataByTagName(
          item as HTMLElement,
          "description"
        );
        const pubDate = this._getDataByTagName(item as HTMLElement, "pubDate");
        const content = this._getDataByTagName(
          item as HTMLElement,
          "content:encoded"
        );
        const link = this._getDataByTagName(item as HTMLElement, "link");

        if (title) mdText += `\n## ${title}.\n`;
        if (pubDate) mdText += `Published on: ${pubDate}.\n`;
        if (description) mdText += this._parseContent(description) + ".\n";
        if (content) mdText += this._parseContent(content) + ".\n";
        if (link) mdText += `ID: ${link}.\n`;

        mdText += "\n";
      }

      return {
        title: channelTitle,
        textContent: mdText,
      };
    } catch (error) {
      console.error("RSS parsing error:", error);
      return null;
    }
  }

  /**
   * Parses a generic XML document into markdown.
   * Creates a hierarchical markdown representation of the XML structure.
   *
   * @param {Document} doc - Parsed XML document
   * @returns {DocumentConverterResult} Formatted markdown content
   * @private
   */
  private _parseXmlType(doc: Document): DocumentConverterResult {
    try {
      const items = doc.lastChild as Element;

      let mdText = `# ${items.tagName}\n`;
      mdText += this._parseXmlNode(items, 0);

      return {
        title: null,
        textContent: mdText,
      };
    } catch (error) {
      console.error("XML parsing error:", error);
      return null;
    }
  }

  /**
   * Recursively parses XML nodes into a markdown list structure.
   *
   * @param {Element} items - XML element to parse
   * @param {number} tabCount - Current indentation level
   * @returns {string} Formatted markdown content
   * @private
   */
  private _parseXmlNode(items: Element, tabCount: number = 0): string {
    let mdContent = "";
    let tabs = "  ".repeat(tabCount);
    const childNodes = Array.from(items.childNodes) as HTMLElement[];
    // Create a list of tag names to their corresponding text content
    childNodes.forEach((item) => {
      if (item.tagName) {
        const attributes: Record<string, string> = {};
        Object.entries(item.attributes || []).forEach(
          ([key, value]) => (attributes[key] = ` ${value}`)
        );
        if (attributes._ownerElement) delete attributes._ownerElement;
        if (attributes.length) delete attributes.length;

        const hasChildren = Array.from(item.childNodes || []).length > 1;

        mdContent += `\n ${tabs}- ${item.tagName}: ${
          !hasChildren ? item.textContent : ""
        }`;
        mdContent += Object.values(attributes)
          .map((val) => "\n " + tabs + val.replace(/=/g, " - "))
          .join("");
        if (hasChildren) {
          mdContent += this._parseXmlNode(item, tabCount + 2);
        }
      }
    });

    return mdContent;
  }

  /**
   * Parses HTML content within feed entries.
   *
   * @param {string} content - HTML content to parse
   * @returns {string} Cleaned content
   * @private
   */
  private _parseContent(content: string): string {
    try {
      const root = parse(content);
      return this._convert(root.innerHTML) as unknown as string;
    } catch (error) {
      return content;
    }
  }

  /**
   * Extracts data from the first child element with the given tag name.
   *
   * @param {HTMLElement} element - Parent element to search
   * @param {string} tagName - Tag name to find
   * @returns {string | null} Content of the first matching element or null
   * @private
   */
  private _getDataByTagName(
    element: HTMLElement,
    tagName: string
  ): string | null {
    const nodes = element.getElementsByTagName(tagName);
    if (!nodes.length) return null;

    const firstChild = nodes[0]?.firstChild;
    return firstChild ? firstChild.nodeValue : null;
  }
}
