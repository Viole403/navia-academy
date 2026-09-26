/**
 * Development-only probe for the transform warning.
 *
 * A transform handed an object instead of a number is a dev-only invariant, and
 * React renders it without a component stack: the message names the offending
 * value but never the component that produced it. This wraps console.error for
 * that one message and attaches a stack captured at the call site, so the
 * component can be found by grepping logcat rather than by reading every screen
 * that animates.
 *
 * Deliberately plain: no react-native imports, no LogBox. Anything reaching into
 * react-native by path pulls in a Flow-typed file that the test transform cannot
 * parse, and a diagnostic is not worth breaking the suite for. new Error().stack
 * gives the JS call site, which is the half that matters here.
 *
 * Nothing is suppressed — the original call still runs, so the warning stays
 * visible. Dev only, and meant to be deleted once the source is found.
 */
if (__DEV__) {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    try {
      const first = args[0]
      if (
        typeof first === "string" &&
        first.includes("must be number or a percentage")
      ) {
        originalError(
          "[transform-probe] " + first,
          new Error("probe").stack ?? "no stack"
        )
      }
    } catch {
      // A probe must never be the thing that breaks a render.
    }
    originalError(...args)
  }
}
