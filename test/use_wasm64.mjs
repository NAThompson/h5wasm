// Preload for `npm run test:wasm64`: redirects the tests' `h5wasm/node`
// (and `h5wasm`, `h5wasm/lazy_file`) imports to the wasm64 (MEMORY64) build so the same suite runs on both.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'h5wasm/node' || specifier === 'h5wasm' || specifier === 'h5wasm/lazy_file') {
      specifier = specifier.replace(/^h5wasm/, 'h5wasm/wasm64');
    }
    return nextResolve(specifier, context);
  },
});
