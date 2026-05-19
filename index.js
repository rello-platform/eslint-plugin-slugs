"use strict";

const noLegacyLiteral = require("./lib/rules/no-legacy-literal");
const noWildcardApikeyPermissions = require("./lib/rules/no-wildcard-apikey-permissions");

const plugin = {
  meta: {
    name: "@rello-platform/eslint-plugin-slugs",
    version: require("./package.json").version,
  },
  rules: {
    "no-legacy-literal": noLegacyLiteral,
    "no-wildcard-apikey-permissions": noWildcardApikeyPermissions,
  },
  configs: {},
};

plugin.configs.recommended = {
  plugins: { "@rello-platform/slugs": plugin },
  rules: {
    "@rello-platform/slugs/no-legacy-literal": "error",
    "@rello-platform/slugs/no-wildcard-apikey-permissions": "error",
  },
};

module.exports = plugin;
module.exports.default = plugin;
