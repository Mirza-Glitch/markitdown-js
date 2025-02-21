import { parse } from "node-html-parser";
import fs from "fs";
import DocumentConverter, {
  type DocumentConverterResult,
  type ConversionOptions,
} from "./document";
import CustomMarkdownConverter from "./customMarkdown";

interface Section {
  title: string;
  level?: number;
  id?: string;
  content: string;
}

/** Handle Wikipedia pages separately, focusing only on the main document content. */
export default class WikipediaConverter extends DocumentConverter {
  private _turndown: CustomMarkdownConverter;

  constructor() {
    super();
    this._turndown = new CustomMarkdownConverter();

    this._configureTurndown();
  }

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

    // Extract main content and title

    const root = parse(html);
    const titleElm = root.querySelector("span.mw-page-title-main");
    const bodyElm = root.querySelector(
      "div#mw-content-text"
    ) as unknown as HTMLElement;
    this.cleanupContent(bodyElm);

    // Parse title and sections
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

  private cleanupContent(element: HTMLElement) {
    // Remove unwanted elements first
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

    // Now remove all the elements after the "See also" heading to exclude the external links
    // Find the "See also" heading
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

      // Get the parent's parent to find siblings
      if (parentElement.parentNode) {
        // Start from the parent element
        let currentElement = parentElement;

        // Remove all next siblings of the parent
        while (currentElement.nextSibling) {
          const nextElement = currentElement.nextSibling;
          if (nextElement.parentNode) {
            nextElement.parentNode.removeChild(nextElement);
          }
        }

        // Remove the parent element containing "See also" as well
        parentElement.parentNode.removeChild(parentElement);
      }
    }
  }

  private _createAnchorId(text: string) {
    // Remove all non-alphanumeric characters and replace spaces with hyphens
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  private parseSections(mainContent: HTMLElement) {
    const sections: Section[] = [];
    let currentSection: Section = { title: "", content: "" };
    let inLeadSection = true;
    let currentHtml = "";

    // Iterate over each element in the main content
    mainContent.childNodes.forEach((element) => {
      const htmlElement = element as HTMLElement;
      if (!htmlElement.tagName) return;

      if (htmlElement.tagName.match(/^H[1-6]$/i)) {
        // Process previous section
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

        // Start new section
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

    // Add the last section
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

  private generateTableOfContents(root: HTMLElement) {
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

  private generateMarkdown(
    content: { title: string; sections: Section[] },
    root: HTMLElement
  ) {
    let markdown = "";

    // Add title with anchor
    markdown += `# ${content.title}\n\n`;

    // Add table of contents
    markdown += this.generateTableOfContents(root);

    // Add sections
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
