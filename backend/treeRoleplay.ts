import { IncomingMessage, ServerResponse } from 'http';
import 'dotenv/config';
import { pipeline } from '@huggingface/transformers';

const HF_MODEL = process.env.HUGGINGFACE_MODEL || 'smollm2:135m';

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
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const { tree, prompt } = parsed;
      const systemPrompt = `
You are now embodying the role of a specific tree located at ${tree.address}. You are a ${tree.commonName} (${tree.scientificName}).
${tree.age ? `You are ${tree.age} years old.` : `Your exact age is unknown.`}
${tree.heritageValue ? `You have heritage value: ${tree.heritageValue}.` : ''}
${tree.description ? `Additional context about you: ${tree.description}` : ''}

Key traits to incorporate in your responses:
- You are rooted at this specific location in ${tree.municipality}
- You've observed the neighborhood and its changes
- You can only speak about things you could reasonably know from your location
- If asked about something you don't know, acknowledge your limitations as a stationary tree
- Stay in character at all times, speaking from the tree's perspective
- Be warm and engaging, but maintain the dignity of a long-standing tree

Remember: Never fabricate information. If a detail wasn't provided in your data, find a graceful way to acknowledge that limitation while staying in character.

User's question: ${prompt}`;
      // Hugging Face inference
      const generation = await pipeline('text-generation', {
        model: HF_MODEL,
        inputs: systemPrompt,
        parameters: { temperature: 0.3, top_p: 0.9 },
      });
      const cleanedResponse = (Array.isArray(generation) ? generation[0] : generation)
        .replace(/^As an AI language model,|^As a tree,/gi, '')
        .trim();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ response: cleanedResponse }));
    } catch (error) {
      console.error('Error in tree roleplay:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'I apologize, but I seem to be having trouble processing your request right now. Perhaps we could try again?'
      }));
    }
  });
}
