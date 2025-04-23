import http from 'http';
import treesHandler from './trees';
import storiesHandler from './stories';
import saveStoryHandler from './saveStory';
import emailHandler from './emailHandler';

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  const url = req.url || '';
  if (url.startsWith('/backend/trees') && req.method === 'GET') {
    treesHandler(req, res);
  } else if (url.startsWith('/backend/stories') && req.method === 'GET') {
    storiesHandler(req, res);
  } else if (url.startsWith('/backend/saveStory') && req.method === 'POST') {
    saveStoryHandler(req, res);
  } else if (url.startsWith('/backend/sendEmail') && req.method === 'POST') {
    emailHandler(req, res);
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
