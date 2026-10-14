// Emscripten 4.0.23 bug workaround (wasm64 only): a requested heap size above
// 2^53 reaches `emscripten_resize_heap` as NaN, which slips past its checks, so
// the resize "succeeds" and malloc returns a block past the end of memory (and
// traps). Refuse such sizes instead, so malloc returns NULL as for any other
// size that can't be allocated.
#if MEMORY64 && ALLOW_MEMORY_GROWTH
addToLibrary({
  $h5wasmResizeHeap__deps: LibraryManager.library.emscripten_resize_heap__deps,
  $h5wasmResizeHeap: LibraryManager.library.emscripten_resize_heap,

  emscripten_resize_heap__deps: ['$h5wasmResizeHeap', '$getHeapMax'],
  emscripten_resize_heap: (requestedSize) => {
    if (!Number.isSafeInteger(requestedSize) || requestedSize > getHeapMax()) {
      return false;
    }
    return h5wasmResizeHeap(requestedSize);
  },
});
#endif
