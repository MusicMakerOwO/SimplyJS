/** Flattens an intersection/mapped type into a single plain object shape for cleaner hover tooltips */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Union of an object's value types, typically used to derive a string-literal union from a `const` object */
export type ObjectValues<T extends object> = T[keyof T];

/** Recursively makes every property of `T`, and every nested object property, optional */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** A value of `T`, or a `Promise` resolving to one, for APIs that accept sync or async handlers */
export type Awaitable<T> = T | Promise<T>;