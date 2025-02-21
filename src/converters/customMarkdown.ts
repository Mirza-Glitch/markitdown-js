import TurndownService from "turndown";

interface TurndownOptions extends TurndownService.Options {
  headingStyle?: "atx" | "setext";
  hr?: string;
  bulletListMarker?: "*" | "-" | "+";
  codeBlockStyle?: "fenced" | "indented";
  emDelimiter?: "_" | "*";
  keepInlineImages?: string[];
}

export default class CustomMarkdownConverter {
  private turndownService: TurndownService;
  /**
   * A custom version of Turndown service. Changes include:
   * - Altering the default heading style to use '#', '##', etc.
   * - Removing javascript hyperlinks
   * - Truncating images with large data:uri sources
   * - Ensuring URIs are properly escaped and don't conflict with Markdown syntax
   */
  constructor(options: TurndownOptions = {}) {
    const defaultOptions: TurndownOptions = {
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "*",
      codeBlockStyle: "fenced",
      emDelimiter: "_",
      keepInlineImages: [],
      ...options,
    };

    this.turndownService = new TurndownService(defaultOptions);

    this.turndownService.addRule("heading", {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      replacement: (content: string, node: Node): string => {
        const level = Number((node as Element).nodeName.charAt(1));
        const prefix = "\n" + "#".repeat(level) + " ";
        return prefix + content.trim() + "\n";
      },
    });

    this.turndownService.addRule("link", {
      filter: "a",
      replacement: (content: string, node: Node): string => {
        const element = node as HTMLAnchorElement;
        content = content.trim();
        if (!content) return "";

        let href = element.getAttribute("href");
        const title = element.getAttribute("title");

        if (href) {
          try {
            const url = new URL(href);
            if (!["http:", "https:", "file:"].includes(url.protocol)) {
              return content;
            }
            url.pathname = encodeURI(decodeURI(url.pathname));
            href = url.toString();
          } catch (error) {
            return content;
          }
        }

        if (content.replace(/\\_/g, "_") === href && !title) {
          return `<${href}>`;
        }

        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : "";
        return href ? `[${content}](${href}${titlePart})` : content;
      },
    });

    this.turndownService.addRule("image", {
      filter: "img",
      replacement: (content: string, node: Node): string => {
        const element = node as HTMLElement;
        const alt = element.getAttribute("alt") || "";
        let src = element.getAttribute("src") || "";
        const title = element.getAttribute("title") || "";
        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : "";

        const keepInlineImages = (
          this.turndownService.options as TurndownOptions
        ).keepInlineImages;
        if (
          node.parentNode &&
          (!keepInlineImages ||
            !keepInlineImages.includes(node.parentNode.nodeName.toLowerCase()))
        ) {
          return alt;
        }

        if (src.startsWith("data:")) {
          src = src.split(",")[0] + "...";
        }

        return `![${alt}](${src}${titlePart})`;
      },
    });
  }

  convert(html: string): string {
    return this.turndownService.turndown(html);
  }

  addRule(rule: string, rules: TurndownService.Rule) {
    this.turndownService.addRule(rule, rules);
  }
}
