module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          // `@` is the app's source tree; `@assets` is the Expo asset root.
          // The second alias exists because `assets/` is a sibling of `src/`,
          // and the art and sound registries reach into it with static
          // `require()`s — which only resolve if a resolver rewrites them.
          alias: {
            "@": "./src",
            "@assets": "./assets",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  }
}
