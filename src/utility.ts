export function toGeoJSON(items) {
  return {
    type: "FeatureCollection",
    features: items.map(item => ({
      type: "Feature",
      properties: {
        s3Url: item.id
      },
      geometry: {
        type: "Point",
        // ensure coordinates are numbers and in [lng, lat] order
        coordinates: [Number(item.geo[0]), Number(item.geo[1])]
      }
    }))
  };
}
