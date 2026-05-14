<!-- source: https://developers.figma.com/docs/plugins/api/VectorPath -->

- Plugins
- [Data Types](data-types.md)
- VectorPath

On this page

The `VectorPath` API is the recommended way to change the geometry of a vector object. While [vector networks](VectorNetwork.md) are more powerful, they are significantly more complicated and very easy to get wrong. Paths are usually sufficient and much easier to work with. Creating a vector path looks like this:

```
// Set the geometry to a triangle  
node.vectorPaths = [{  
  windingRule: "EVENODD",  
  data: "M 0 100 L 100 100 L 50 0 Z",  
}]
```

## VectorPath[​](#vectorpath "Direct link to VectorPath")

### [windingRule](properties/VectorPath-windingrule.md): [WindingRule](properties/VectorPath-windingrule.md#winding-rule) | 'NONE' [readonly]

The winding rule for the path (same as in SVGs). This determines whether a given point in space is inside or outside the path.

[View more →](properties/VectorPath-windingrule.md)

---

### [data](properties/VectorPath-data.md): string [readonly]

A series of path commands that encodes how to draw the path.

[View more →](properties/VectorPath-data.md)

---

## VectorPaths[​](#vectorpaths "Direct link to VectorPaths")

Vector nodes can be composed of multiple VectorPath(s).

```
type VectorPaths = ReadonlyArray<VectorPath>
```

[Previous

VariableWidthStrokeProperties](VariableWidthStrokeProperties.md)[Next

data](properties/VectorPath-data.md)

- [VectorPath](#vectorpath)
- [VectorPaths](#vectorpaths)
