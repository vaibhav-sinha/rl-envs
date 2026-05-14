<!-- source: https://developers.figma.com/docs/widgets/api/type-SyncedMap -->

- Widgets
- Data Types
- SyncedMap

The return value of [`useSyncedMap`](properties/widget-usesyncedmap.md).

```
interface SyncedMap<T = any> {  
  readonly size: number  
  has(key: string): boolean  
  get(key: string): T | undefined  
  set(key: string, value: T): void  
  delete(key: string): void  
  keys(): string[]  
  values(): T[]  
  entries(): [string, T][]  
}
```

### length: number [readonly]

**DEPRECATED:** Use size instead.

---

### size: number [readonly]

Returns the number of keys in this map.

---

### has(key: string): boolean

Returns whether the given key exists.

---

### get(key: string): T | undefined

Returns the value of the given key if one exists.

---

### set(key: string, value: T): void

Persist the given key/value pair on the map.

info

Note: value has to be JSON-serializable.

---

### delete(key: string): void

Removes the given key and its value from the map if it exists.

---

### keys(): string[]

Returns an array of keys in the map.

---

### values(): T[]

Returns an array of values in the map.

---

### entries(): [string, T][]

Returns an array of [key, value] tuples in the map.

---

[Previous

StrokeCap](type-StrokeCap.md)[Next

TextEditEvent](type-TextEditEvent.md)
