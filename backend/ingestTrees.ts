import { IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import db from '../../lib/db';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
    const filePath = path.join(process.cwd(), 'public/uniqueTrees.geojson');

    if (!existsSync(filePath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Tree data file not found' }));
      return;
    }
    const data = await fs.readFile(filePath, 'utf8');
    const geojson = JSON.parse(data);

    const insert = db.prepare(`
      INSERT INTO trees (
        tree_name, scientific_name, common_name, latitude, longitude,
        heritage_value, municipality, address, age, planted_year,
        death_year, description, condition, status, ngwId
      ) VALUES (
        $treeName, $scientificName, $commonName, $latitude, $longitude,
        $heritageValue, $municipality, $address, $age, $plantedYear,
        $deathYear, $description, $condition, $status, $ngwId
      ) ON CONFLICT(ngwId) DO NOTHING
    `);

    geojson.features.forEach((feature: any) => {
      const { properties, geometry } = feature;

      if (!geometry?.coordinates || !Array.isArray(geometry.coordinates)) {
        console.warn('Skipping feature with invalid geometry:', properties?.ngwId);
        return;
      }

      insert.run({
        treeName: properties['Tree Name'] || 'Unnamed Tree',
        scientificName: properties['Genus species'] || 'Unknown Species',
        commonName: properties['Common Name'] || 'Unknown Tree',
        latitude: geometry.coordinates[1],
        longitude: geometry.coordinates[0],
        heritageValue: properties['Heritage Value'] || null,
        municipality: properties.Municipality || 'Unknown Municipality',
        address: properties.Address || 'Unknown Location',
        age: Number(properties.Age) || null,
        plantedYear: Number(properties['Planted (Year)']) || null,
        deathYear: Number(properties['Death (Year)']) || null,
        description: properties.Description?.slice(0, 500) || null,
        condition: properties.Condition || null,
        status: properties.Status || 'Unknown',
        ngwId: Number(properties.ngwId) || null
      });
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, count: geojson.features.length }));
  } catch (error) {
    console.error('Ingestion failed:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Tree ingestion failed' }));
  }
  });
}
