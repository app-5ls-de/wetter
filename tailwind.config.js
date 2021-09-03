const plugin = require("tailwindcss/plugin");

module.exports = {
  purge: {
    content: [
      "./_includes/**/*.html",
      "./_layouts/**/*.html",
      "./_posts/*.md",
      "./*.html",
      "./*.md",
      "./*.js",
    ],
    safelist: [
      "dwd-warn-level-1",
      "dwd-warn-level-2",
      "dwd-warn-level-3",
      "dwd-warn-level-4",
      "dwd-warn-level-50",
    ],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    position: ["before"],
    display: ["before", "after"],
    extend: {},
  },
  plugins: [
    plugin(({ addVariant, e }) => {
      addVariant("before", ({ modifySelectors, separator }) => {
        modifySelectors(({ className }) => {
          return `.${e(`before${separator}${className}`)}::before`;
        });
      });
      addVariant("after", ({ modifySelectors, separator }) => {
        modifySelectors(({ className }) => {
          return `.${e(`after${separator}${className}`)}::after`;
        });
      });
    }),
  ],
};
