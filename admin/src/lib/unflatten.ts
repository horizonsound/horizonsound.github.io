// src/lib/unflatten.ts

export function unflatten(flat: Record<string, any>): any {
  const result: any = {};

  for (const flatKey in flat) {
    const value = flat[flatKey];
    const path = flatKey.split(".");
    let target = result;

    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const isLast = i === path.length - 1;

      if (isLast) {
        // Final assignment
        target[key] = value;
      } else {
        const nextKey = path[i + 1];
        const shouldBeArray = /^\d+$/.test(nextKey); // numeric → array

        if (!target[key]) {
          target[key] = shouldBeArray ? [] : {};
        }

        target = target[key];
      }
    }
  }

  return result;
}
