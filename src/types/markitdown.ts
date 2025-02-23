import fs from "fs";
import type { AxiosInstance } from "axios";

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

// TODO: improve types for LlmCallInputParams so it could work with other llm sdk interfaces
export type LlmCallInputParams = {
  messages?: Message[];
  imageBase64?: string;
  file?: fs.ReadStream;
};

export type LlmCall =
  | ((params: LlmCallInputParams) => Promise<string | null>)
  | null
  | undefined;

export interface MarkItDownOptions {
  requestsSession?: AxiosInstance;
  llmCall?: LlmCall;
  styleMap?: any;
  docintelEndpoint?: string | null;
}
