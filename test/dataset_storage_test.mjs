#!/usr/bin/env node

import { strict as assert } from 'assert';
import { existsSync, mkdirSync, openSync, readSync, closeSync, unlinkSync } from 'fs';
import { join } from 'path';
import h5wasm from "h5wasm/node";

// Reading the bytes at the reported locations must give back the dataset's values
function readBytes(filepath, position, length) {
  const fd = openSync(filepath, 'r');
  const buf = Buffer.alloc(length);
  readSync(fd, buf, 0, length, position);
  closeSync(fd);
  return new Float32Array(buf.buffer, buf.byteOffset, length / 4);
}

async function dataset_storage() {
  await h5wasm.ready;
  const PATH = join(".", "test", "tmp");
  const FILEPATH = join(PATH, "storage.h5");
  if (!existsSync(PATH)) {
    mkdirSync(PATH);
  }

  const values = Float32Array.from({ length: 6 * 4 }, (_, i) => i);
  const write_file = new h5wasm.File(FILEPATH, "w");
  write_file.create_dataset({ name: "contiguous", data: values, shape: [6, 4], dtype: "<f4" });
  write_file.create_dataset({ name: "chunked", data: values, shape: [6, 4], dtype: "<f4", chunks: [4, 2] });
  write_file.create_dataset({ name: "compressed", data: values, shape: [6, 4], dtype: "<f4", chunks: [3, 4], compression: "gzip" });
  write_file.create_group("group");
  write_file.close();

  const f = new h5wasm.File(FILEPATH, "r");

  const contiguous = f.get("contiguous").storage;
  assert.equal(contiguous.layout, "contiguous");
  assert.equal(contiguous.nfilters, 0);
  assert.equal(contiguous.chunks, null);
  assert.equal(contiguous.storage_size, values.byteLength);
  assert.deepEqual(readBytes(FILEPATH, contiguous.offset, values.byteLength), values);

  const chunked = f.get("chunked").storage;
  assert.equal(chunked.layout, "chunked");
  assert.equal(chunked.offset, null);
  assert.deepEqual(chunked.chunks.shape, [4, 2]);
  assert.equal(chunked.chunks.addrs.length, 4); // 2 x 2 chunks, edge chunks included
  assert.deepEqual([...chunked.chunks.offsets], [0, 0, 0, 2, 4, 0, 4, 2]);
  assert.deepEqual([...chunked.chunks.sizes], [32, 32, 32, 32]); // edge chunks are stored in full
  assert.deepEqual([...chunked.chunks.filter_masks], [0, 0, 0, 0]);
  const [, addr1] = chunked.chunks.addrs; // chunk at [0, 2]: rows 0-3, columns 2-3
  assert.deepEqual([...readBytes(FILEPATH, addr1, 32)], [2, 3, 6, 7, 10, 11, 14, 15]);

  const compressed = f.get("compressed").storage;
  assert.equal(compressed.nfilters, 1);
  assert.equal(compressed.chunks.addrs.length, 2);
  assert.ok(compressed.chunks.sizes[0] < 3 * 4 * 4);

  f.close();
  unlinkSync(FILEPATH);
}

export const tests = [
  { description: "Get location of dataset storage in file", test: dataset_storage },
];
export default tests;
