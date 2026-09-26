/**
 * A local stand-in for expo-modules-core's types.
 *
 * The real package ships types, but the local widget module sits outside the app's
 * tsconfig include, so tsc cannot resolve it from there and reports a missing
 * module instead of a real problem. Declaring just the two functions used keeps
 * the module's public shape honest without widening tsconfig to pull the whole
 * native tree in.
 */
declare module "expo-modules-core" {
  export function requireNativeModule<T>(name: string): T
  export function requireOptionalNativeModule<T>(name: string): T | null
}
