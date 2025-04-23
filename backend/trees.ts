import { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const query = Object.fromEntries(url.searchParams.entries());
    const filePath = path.join(process.cwd(), 'uniqueTrees.geojson');

    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify([]));
      return;
    }

    fs.readFile(filePath, 'utf8').then(data => {
      const geojson = JSON.parse(data);
      if (!geojson?.features || !Array.isArray(geojson.features)) {
        throw new Error('Invalid GeoJSON format');
      }
      const trees = geojson.features
        .filter((feature: any) => {
          if (!feature.geometry || !Array.isArray(feature.geometry.coordinates)) {
            return false;
          }
          if (query.bounds) {
            const bounds = JSON.parse(query.bounds as string);
            const [lng, lat] = feature.geometry.coordinates;
            if (lng < bounds.west || lng > bounds.east || lat < bounds.south || lat > bounds.north) {
              return false;
            }
          }
          return true;
        })
        .map((feature: any) => {
          const { properties, geometry } = feature;
          const coordinates = geometry.coordinates;
          return {
            treeName: properties["Tree Name"] || "",
            age: properties.Age || null,
            plantedYear: properties["Planted (Year)"] || null,
            deathYear: properties["Death (Year)"] || null,
            heritageValue: properties["Heritage Value"] || null,
            municipality: properties.Municipality || "",
            address: properties.Address || "",
            latitude: coordinates[1],
            longitude: coordinates[0],
            commonName: properties["Common Name"] || "",
            description: properties.Description || null,
            condition: properties.Condition || null,
            status: properties.Status || "Unknown",
            iconUrls: [],
            ngwId: properties.ngwId || Math.random() * 1000000,
            speciesScore: 0,
            uniquenessScore: 3
          };
        });
      if (query.page && query.pageSize) {
        const page = parseInt(query.page as string);
        const pageSize = parseInt(query.pageSize as string);
        const start = (page - 1) * pageSize;
        const paginatedTrees = trees.slice(start, start + pageSize);
        res.setHeader('X-Total-Count', trees.length.toString());
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(paginatedTrees));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(trees));
    }).catch(error => {
      console.error('API Error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify([]));
    });
  } catch (error) {
    console.error('API Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([]));
  }
}
