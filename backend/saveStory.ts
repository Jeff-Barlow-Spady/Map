import { IncomingMessage, ServerResponse } from 'http';
import { saveMessage } from './db';
import Airtable from 'airtable';
import 'dotenv/config';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const { treeId, message, contact } = parsed;
      // Save to SQLite
      await saveMessage(treeId, 'user', `${message} [Contact: ${contact}]`);
      // Save to Airtable
      const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
        process.env.AIRTABLE_BASE_ID || ''
      );
      const table = process.env.AIRTABLE_STORIES_TABLE_NAME || 'Stories';
      try {
        await base(table).create([{ fields: { treeId, message, contact } }]);
      } catch (err) {
        console.error('Airtable save error:', err);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    });
  } else {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Method not allowed' }));
  }
}
