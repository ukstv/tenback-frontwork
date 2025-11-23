/**
 * A type that represents an array with at least one element. This ensures
 * that the array is never empty at compile time.
 *
 * @template T The type of elements in the array.
 *
 * @example
 * ```ts
 * const items: NonEmptyArray<string> = ["first"]; // Valid
 * const moreItems: NonEmptyArray<string> = ["first", "second"]; // Valid
 * const empty: NonEmptyArray<string> = []; // Type error
 * ```
 */
export type NonEmptyArray<T> = [T, ...T[]];
