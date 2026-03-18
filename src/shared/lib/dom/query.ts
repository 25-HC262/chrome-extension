// Query helpers for DOM access in content scripts.
export function qs<T extends Element>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector(selector) as T | null
}

export function qsa<T extends Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll(selector)) as T[]
}

