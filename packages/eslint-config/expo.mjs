import { defineConfig, globalIgnores } from "eslint/config";
import expoConfigPkg from "eslint-config-expo";

// eslint-config-expo is CommonJS (module.exports = config array). Under ESM
// interop it lands on `.default`; normalize either shape to an iterable.
const pkg = expoConfigPkg;
const expoConfig = Array.isArray(pkg) ? pkg : pkg && Array.isArray(pkg.default) ? pkg.default : [];

export default defineConfig([
  ...expoConfig,
  globalIgnores([
    ".expo/**",
    "android/**",
    "ios/**",
    "expo-env.d.ts",
    "nativewind-env.d.ts",
  ]),
]);