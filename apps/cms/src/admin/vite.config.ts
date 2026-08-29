import { mergeConfig, type UserConfig } from "vite";

const codeMirrorModules = [
  "react",
  "react-dom",
  "react-router-dom",
  "styled-components",
  "@codemirror/autocomplete",
  "@codemirror/commands",
  "@codemirror/lang-json",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/theme-one-dark",
  "@codemirror/view",
  "@uiw/codemirror-extensions-basic-setup",
  "@uiw/react-codemirror",
  "codemirror",
];

export default (config: UserConfig) =>
  mergeConfig(config, {
    resolve: {
      dedupe: codeMirrorModules,
    },
    server: {
      allowedHosts: true,
      host: "0.0.0.0",
      hmr: {
        host: "localhost",
        clientPort: 5173,
      },
    },
  });
