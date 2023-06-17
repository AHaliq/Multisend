/**
 * Type that returns keys of T which have type U
 */
type KeyOfType<T, U> = keyof Pick<
  T,
  {[K in keyof T]: T[K] extends U
    ? K
    : never
  }[keyof T]>;

/**
 * Checks whether value is of type T and returns it if it is. Otherwise, it returns defaultValue.
 * @param value The value to check
 * @param defaultValue The value to return if value is not of type T
 * @param typeCheck The function to check whether value is of type T
 * @returns The value if it is of type T, otherwise defaultValue
 */
const getOrDefault = <T>(
  value: unknown,
  defaultValue: T,
  typeCheck: (val: unknown) => val is T,
): T => (
    typeCheck(value)
      ? value
      : defaultValue
  );

/**
 * Reduces an array of objects based on a specific property of the objects, using a reducer
 * function. The property to reduce on is determined by the key parameter. If a value of the
 * wrong type is encountered, defaultVal is used instead.
 * @param objs The array of objects to reduce
 * @param key The key to reduce on
 * @param typeCheck The type check to perform on each value. Can be a string or a custom function
 * @param reducer The reducer function to use
 * @param defaultVal The value to use when a value of the wrong type is encountered
 * @param initialVal The initial value to use for the reduction
 * @returns The result of the reduction
 */
const reduceObjs = <T, U>(
  objs: T[],
  key: KeyOfType<T, U>,
  typeCheck:string | ((val:unknown) => val is U),
  reducer: ((acc:U, val:U) => U),
  defaultVal:U,
  initialVal:U,
) => objs.reduce(
    (acc, obj) => reducer(
      acc,
      getOrDefault(
        obj[key],
        defaultVal,
        typeof typeCheck === 'string'
          ? (val): val is U => typeof val === typeCheck
          : typeCheck,
      ),
    ),
    initialVal,
  );

/**
 * Gets the largest value of a specific property of an array of objects.
 * The property to get the largest value of is determined by the key parameter.
 * @param objs The array of objects to get the largest value from
 * @param key The key to get the largest value of
 * @returns The largest value
 */
const getLargest = <T>(objs: T[], key: KeyOfType<T, number>, minimum = -Infinity) => reduceObjs(
  objs,
  key,
  'number',
  Math.max,
  minimum,
  minimum,
);

const asyncFilter = <T>(
  arr: T[],
  predicate: ((arg0: T, i: number) => Promise<boolean>),
) => Promise.all(arr.map(predicate))
    .then((results) => arr
      .filter((_v, index) => results[index]));

const splitAlias = (alias: string) => alias.matchAll(/^(.*?)(\d*)$/gm).next().value ?? [alias, ''];

export {
  reduceObjs, getLargest, asyncFilter, splitAlias,
};
