# 📦 Markitdown-js

_A Node.js port of Microsoft's [Markitdown](https://github.com/microsoft/markitdown)_

[![npm version](https://img.shields.io/npm/v/markitdown-js.svg)](https://www.npmjs.com/package/markitdown-js)
[![Downloads](https://img.shields.io/npm/dt/markitdown-js.svg)](https://www.npmjs.com/package/markitdown-js)
[![License](https://img.shields.io/github/license/Mirza-Glitch/markitdown-js)](https://github.com/Mirza-Glitch/markitdown-js/blob/main/LICENSE)

## 🚀 Overview

**markitdown-js** is a Node.js implementation of Microsoft's [Markitdown](https://github.com/microsoft/markitdown). It provides a way to convert various document file content into Markdown Content in a seamless way using JavaScript/TypeScript.

While this library mimics the original Markitdown library, it is not a direct port. Some features like Llm calls are implemented differently to make it work easier with Node.js and JavaScript/TypeScript.

This library support all file types and content converters available in the original Markitdown library:

- **PlainText**
- **HTML**
- **RSS**
- **Wikipedia**
- **Youtube**
- **DocX**
- **Xlsx**
- **Pptx**
- **Audio**
- **Video**
- **Image**
- **Ipynb**
- **PDF**
- **ZIP**
- **Outlook Message**

Additionally this library has filtered Wikipedia's results to beautify the output and added a XML converter.

You can also register your custom converter [(View Example)](https://github.com/Mirza-Glitch/markitdown-js/blob/main/examples/customParser.ts)

## 📦 Installation

You can install the package using npm or any node.js compatible package manager:

```sh
npm install markitdown-js
```

## 📖 Usage

Here's a simple example of how to use **markitdown-js**:

```javascript
import Markitdown from "markitdown-js";
// or using require statement:
// const Markitdown = require("markitdown-js").default;

const converter = new Markitdown();
const htmlResult = converter.convert("./sample.html");
const pdfResult = converter.convert("./sample.pdf");

console.log(htmlResult);
// logs: { title: "Sample Title", textContent: "Hello World" }
console.log(pdfResult);
// logs: { title: null, textContent: "Text Present in PDF" }
```

You don't need to pass exiftool path to the constructor like the original Markitdown library. It uses [exiftool-vendored](https://www.npmjs.com/package/exiftool-vendored) to detect media files metadata. It also uses [node-tesseract-ocr](https://www.npmjs.com/package/node-tesseract-ocr) to extract text from images if [tesseract](https://github.com/tesseract-ocr/tesseract) is installed on your system.

Here's a simple example of how to use with media files

```javascript
import Markitdown from "markitdown-js";

const converter = new Markitdown();
const result = converter.convert("./sample.png");

console.log(result);
// logs:
// {
//   title: null,
//   textContent: `**Image Size**: "1024x1024"
// **Title**: null
// **Caption**: null
//
// # Text:
// Text Present in Image`
// }
```

The original Microsoft's [Markitdown](https://github.com/microsoft/markitdown) library uses Llm instance to get the description of the image, where you'd need to pass the llm client and llm model instance to the constructor. The library expects Llm instance to respond just like OpenAI's `createChatCompletion` response.

You may sometimes need to use your custom Llm client and model instance. to overcome this issue, markitdown-js takes a llmCall function as an option to the constructor which is used to get the description of the image and audio transcript.

The llmCall function should return a string or null as result. It is called with the following arguments:

- messages: The messages to be sent to the llm for image description, usually an array of objects with `role` and `content` properties.
- base64Image: The base64 encoded image.
- file: The audio file buffer object.

Here's a simple example of how to use with media files

```javascript
import Markitdown from "markitdown-js";

const converter = new Markitdown({
  llmCall: async ({ messages, base64Image, file }) => {
    if (file) {
      // handle audio file
    } else if (messages) {
      // handle image file
    } else {
      return null;
    }
  },
});

const result = converter.convert("./sample.mp4");

console.log(result);
// logs:
// {
//   title: null,
//   textContent: `**Title**: "Mp4 file title"
// **Artist**: "Artist Name"
// **Duration**: 180 seconds
//
// # Audio Transcript:
// Transcript Provided by the LLM`
// }
```

check the [media file example](https://github.com/Mirza-Glitch/markitdown-js/blob/main/examples/multi-media.ts) for better understanding.

This library includes azure document intelligence just like the original Markitdown library. You can pass the azure document intelligence endpoint to use it.

```javascript
const converter = new Markitdown({
  docintelEndpoint:
    "https://your-azure-document-intelligence-endpoint.cognitiveservices.azure.com/",
});
```

Check the [Examples Folder](https://github.com/Mirza-Glitch/markitdown-js/tree/main/examples) for more examples.

## 🤝 Contributing

Contributions are highly appreciated! If you'd like to contribute, please:

1.  Fork the repository
2.  Create a new branch (`git checkout -b feature-branch`)
3.  Commit your changes (`git commit -m "Add feature XYZ"`)
4.  Push to the branch (`git push origin feature-branch`)
5.  Open a Pull Request

Your contributions are valuable! It helps the community to improve the library and make it more useful for everyone.

## 🛠 Support

If you find a bug or need help, feel free to [open an issue](https://github.com/Mirza-Glitch/markitdown-js/issues).

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/Mirza-Glitch/markitdown-js/blob/main/LICENSE) file for details.

## 🎉 Acknowledgment

Originally inspired by [microsft/markitdown](https://github.com/microsoft/markitdown).
