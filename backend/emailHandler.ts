import nodemailer from 'nodemailer';
import { IncomingMessage, ServerResponse } from 'http';

// POST /backend/emailHandler
// { treeId, treeName, message, email }
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
      const { treeId, treeName, message, email } = parsed;
      const safeTreeName = (treeName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const toAddress = `${safeTreeName}${treeId}@customemailaddress.com`;
      try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toAddress,
        subject: `Message for Tree ${treeName || treeId}`,
        text: `From: ${email}\n\n${message}`,
      };
      await transporter.sendMail(mailOptions);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('Failed to send email:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Failed to send email' }));
    }
    });
  } else {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Method not allowed' }));
  }
}
