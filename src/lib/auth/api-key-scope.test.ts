import { describe, expect, it } from "vitest";

import {
  ALL_API_KEY_SCOPES,
  API_KEY_SCOPE,
  isApiKeyScope,
} from "./api-key-scope";

describe("isApiKeyScope", () => {
  it.each(["client", "gateway"])("accepts the known scope %s", (value) => {
    expect(isApiKeyScope(value)).toBe(true);
  });

  it.each(["CLIENT", "admin", "", "gateways"])(
    "rejects the unknown string %s",
    (value) => {
      expect(isApiKeyScope(value)).toBe(false);
    },
  );

  it.each([null, undefined, 1, {}, []])(
    "rejects the non-string %s",
    (value) => {
      expect(isApiKeyScope(value)).toBe(false);
    },
  );
});

describe("API_KEY_SCOPE", () => {
  it("exposes exactly the two scopes", () => {
    expect(ALL_API_KEY_SCOPES).toEqual([
      API_KEY_SCOPE.CLIENT,
      API_KEY_SCOPE.GATEWAY,
    ]);
  });
});
