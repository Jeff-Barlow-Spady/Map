import { IncomingMessage, ServerResponse } from 'http';
import * as Airtable from 'airtable';
import 'dotenv/config';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Method not allowed' }));
    return;
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID || ''
    );
    const table = process.env.AIRTABLE_TREES_TABLE_NAME || 'Trees';
    const view = process.env.AIRTABLE_TREES_VIEW;
    const records = await base(table).select(view ? { view } : {}).all();
    const data = records.map((r: any) => ({ id: r.id, fields: r.fields }));

    // optional bounds filtering
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const boundsParam = url.searchParams.get('bounds');
    const result = boundsParam
      ? data.filter((item: any) => {
          const lat = item.fields['Tree Latitude'] ?? item.fields.Latitude;
          const lng = item.fields['Tree Longitude'] ?? item.fields.Longitude;
          const b = JSON.parse(boundsParam);
          return lng >= b.west && lng <= b.east && lat >= b.south && lat <= b.north;
        })
      : data;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('API Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([]));
  }
}
