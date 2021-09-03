const plugin = require("tailwindcss/plugin");
const defaultTheme = require("tailwindcss/defaultTheme");

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
    screens: {
      "2xs": "375px",
      xs: "475px",
      ...defaultTheme.screens,
      "3xl": "1600px",
    },
    extend: {},
  },
  variants: {
    position: ["responsive", "before"],
    display: ["responsive", "before", "after"],
    width: ["responsive", "important"],
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
      addVariant("important", ({ container }) => {
        container.walkRules((rule) => {
          rule.selector = `.\\!${rule.selector.slice(1)}`;
          rule.walkDecls((decl) => {
            decl.important = true;
          });
        });
      });
    }),
  ],
};
