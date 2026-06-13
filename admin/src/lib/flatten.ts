export function flatten(obj: any, prefix = ""): Record<string, any> {
  const out: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    // Arrays stay intact (even empty)
    if (Array.isArray(value)) {
      out[newKey] = value;
      continue;
    }

    // Null should be preserved
    if (value === null) {
      out[newKey] = null;
      continue;
    }

    // Recurse into objects EVEN IF EMPTY
    if (typeof value === "object") {
      const nested = flatten(value, newKey);

      // If the object was empty, still preserve the key
      if (Object.keys(nested).length === 0) {
        out[newKey] = {};
      } else {
        Object.assign(out, nested);
      }

      continue;
    }

    // Primitive values (including empty strings)
    out[newKey] = value;
  }

  return out;
}
