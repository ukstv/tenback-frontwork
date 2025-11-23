/**
 * Represents a value that is either the awaited result of T or a promise resolving to that result.
 * This type is useful for handling values that might be synchronous or asynchronous.
 * @template T - The type to be awaited.
 */
export type Promising<T> = Awaited<T> | Promise<Awaited<T>>;