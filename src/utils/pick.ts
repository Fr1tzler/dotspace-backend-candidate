export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
     return keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {} as Pick<T, K>);
}
