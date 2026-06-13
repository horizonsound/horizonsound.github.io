import Paragraph from "@tiptap/extension-paragraph";

export const ParagraphWithDataType = Paragraph.extend({
  addAttributes() {
    return {
      "data-type": {
        default: "lyrics-text",
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => {
          return {
            "data-type": attributes["data-type"],
          };
        },
      },
    };
  },
});
