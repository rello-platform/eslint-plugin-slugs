"use strict";

const noLegacyLiteral = require("./lib/rules/no-legacy-literal");

const plugin = {
  meta: {
    name: "@rello-platform/eslint-plugin-slugs",
    version: require("./package.json").version,
  },
  rules: {
    "no-legacy-literal": noLegacyLiteral,
  },
  configs: {},
};

plugin.configs.recommended = {
  plugins: { "@rello-platform/slugs": plugin },
  rules: {
    "@rello-platform/slugs/no-legacy-literal": "error",
  },
};

module.exports = plugin;
module.exports.default = plugin;
