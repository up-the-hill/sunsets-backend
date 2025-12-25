import type { FeatureCollection } from "geojson";
import { sunsetsTable } from "./db/schema.js";

export function toGeoJSON(items: (typeof sunsetsTable.$inferInsert)[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items.map(item => ({
      type: "Feature",
      properties: {
        s3Url: item.id
      },
      geometry: {
        type: "Point",
        coordinates: [Number(item.geo[0]), Number(item.geo[1])]
      }
    }))
  };
}
