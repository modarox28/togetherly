// NativeWind/CSS-interop babel transforms without the worklets plugin
// (worklets requires reanimated v4; we use v3 which has its own plugin)
module.exports = function () {
  return {
    plugins: [
      require("react-native-css-interop/dist/babel-plugin").default,
      [
        "@babel/plugin-transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "react-native-css-interop",
        },
      ],
    ],
  };
};
