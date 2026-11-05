import { LIMITS } from "./limits";

function text(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
export function inspectPhoto(
  bytes: Uint8Array,
): "jpeg" | "png" | "webp" | "heic" {
  if (bytes.length < 12 || bytes.length > LIMITS.fileBytes)
    throw new Error(
      "The photograph is empty, incomplete or larger than 20 MB.",
    );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if (
    bytes[0] === 137 &&
    text(bytes, 1, 3) === "PNG" &&
    view.getUint32(4) === 0x0d0a1a0a
  ) {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      if (offset + length + 12 > bytes.length)
        throw new Error("The PNG is incomplete.");
      const type = text(bytes, offset + 4, 4);
      if (type === "acTL")
        throw new Error("Animated photographs are not supported.");
      offset += length + 12;
      if (type === "IEND") return "png";
    }
    throw new Error("The PNG is incomplete.");
  }
  if (text(bytes, 0, 4) === "RIFF" && text(bytes, 8, 4) === "WEBP") {
    if (view.getUint32(4, true) + 8 !== bytes.length)
      throw new Error("The WebP is incomplete.");
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = text(bytes, offset, 4),
        length = view.getUint32(offset + 4, true);
      if (offset + 8 + length > bytes.length)
        throw new Error("The WebP is incomplete.");
      if (
        type === "ANIM" ||
        type === "ANMF" ||
        (type === "VP8X" && length >= 1 && bytes[offset + 8] & 2)
      )
        throw new Error("Animated photographs are not supported.");
      offset += 8 + length + (length % 2);
    }
    return "webp";
  }
  if (text(bytes, 4, 4) === "ftyp") {
    const size = view.getUint32(0);
    if (size < 16 || size > bytes.length || size > 4096)
      throw new Error("Invalid HEIC container.");
    const brands = [text(bytes, 8, 4)];
    for (let i = 16; i + 4 <= size; i += 4) brands.push(text(bytes, i, 4));
    if (brands.some((b) => ["hevc", "hevx", "msf1", "avis"].includes(b)))
      throw new Error("Image sequences are not supported.");
    if (brands.some((b) => ["heic", "heix", "heim", "heis"].includes(b)))
      return "heic";
  }
  throw new Error("Choose a static JPEG, PNG, WebP or HEIC photograph.");
}

export async function readBounded(
  stream: ReadableStream<Uint8Array>,
  limit: number,
) {
  const reader = stream.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > limit) {
        await reader.cancel();
        throw new Error("Image exceeds the permitted size.");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function byteStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
