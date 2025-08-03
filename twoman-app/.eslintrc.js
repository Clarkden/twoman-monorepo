module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-native/all",
    "expo",
  ],
  plugins: ["react", "react-native"],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    // React specific rules
    "react/prop-types": "off",
    // React Native specific rules
    "react-native/no-inline-styles": "warn",
    "react-native/split-platform-components": "warn",
    "react-native/no-raw-text": "warn",
    // General JavaScript rules
    "no-unused-vars": "warn",
    "no-console": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
