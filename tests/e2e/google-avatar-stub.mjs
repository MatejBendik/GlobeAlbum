import { readFileSync } from "node:fs";

const fixture = readFileSync(new URL("../fixtures/tiny.png", import.meta.url));
const fetchFromNetwork = globalThis.fetch;

globalThis.fetch = (input, init) => {
  if (input === "https://lh3.googleusercontent.com/account-picture") {
    return Promise.resolve(
      new Response(fixture, { headers: { "Content-Type": "image/png" } }),
    );
  }
  return fetchFromNetwork(input, init);
};
