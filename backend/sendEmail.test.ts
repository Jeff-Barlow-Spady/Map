import handler from './emailHandler';
import { IncomingMessage, ServerResponse } from 'http';

jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

describe('/backend/emailHandler API Endpoint', () => {
  function createMockReqRes(method: string, body?: object) {
    const req = new IncomingMessage(null as any);
    req.method = method;
    let resBody = Buffer.from('');
    const res = new ServerResponse(req);
    res.write = (chunk: any) => {
      resBody = Buffer.concat([resBody, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      return true;
    };
    res.end = (chunk?: any) => {
      if (chunk) res.write(chunk);
      res.finished = true;
      return res as any;
    };
    (res as any).getBody = () => resBody.toString();
    return { req, res };
  }

  it('should return 405 if method is not POST', done => {
    const { req, res } = createMockReqRes('GET');
    res.on('finish', () => {
      expect(res.statusCode).toBe(405);
      expect(JSON.parse((res as any).getBody())).toEqual({ message: 'Method not allowed' });
      done();
    });
    handler(req, res);
  });

  it('should return 200 and success true for valid POST', done => {
    const { req, res } = createMockReqRes('POST');
    const body = JSON.stringify({
      treeId: 'tree123',
      treeName: 'Oak',
      message: 'Hello from the tree!',
      email: 'user@example.com',
    });
    process.nextTick(() => {
      req.emit('data', Buffer.from(body));
      req.emit('end');
    });
    res.on('finish', () => {
      expect(res.statusCode).toBe(200);
      expect(JSON.parse((res as any).getBody())).toEqual({ success: true });
      done();
    });
    handler(req, res);
  });
});
