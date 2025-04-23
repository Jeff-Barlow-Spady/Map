import handler from './trees';
import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

jest.mock('fs/promises');
jest.mock('fs');

describe('/backend/trees API Endpoint', () => {
  const mockFilePath = path.join(process.cwd(), 'uniqueTrees.geojson');

  function createMockReqRes(method: string, url: string = '/') {
    const req = new IncomingMessage(null as any);
    req.method = method;
    req.url = url;
    let resBody = Buffer.from('');
    const res = new ServerResponse(req);
    res.write = (chunk: any) => {
      resBody = Buffer.concat([resBody, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      return true;
    };
    res.end = (chunk?: any) => {
      if (chunk) res.write(chunk);
      res.finished = true;
      res.emit('finish');
      return res as any;
    };
    (res as any).getBody = () => resBody.toString();
    return { req, res };
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return 405 if method is not GET', done => {
    const { req, res } = createMockReqRes('POST');
    res.on('finish', () => {
      expect(res.statusCode).toBe(405);
      expect(res.getHeader('Allow')).toBe('GET');
      done();
    });
    handler(req, res);
  });

  it('should return 404 if file does not exist', done => {
    (existsSync as jest.Mock).mockReturnValue(false);
    const { req, res } = createMockReqRes('GET');
    res.on('finish', () => {
      expect(res.statusCode).toBe(404);
      expect(JSON.parse((res as any).getBody())).toEqual([]);
      done();
    });
    handler(req, res);
  });

  it('should return 500 if file content is invalid', done => {
    (existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFile as jest.Mock).mockResolvedValue('invalid json');
    const { req, res } = createMockReqRes('GET');
    res.on('finish', () => {
      expect(res.statusCode).toBe(500);
      expect(JSON.parse((res as any).getBody())).toEqual([]);
      done();
    });
    handler(req, res);
  });

  it('should return 200 and a list of trees if file content is valid', done => {
    const mockGeoJSON = {
      features: [
        {
          type: 'Feature',
          properties: {
            "Tree Name": "Oak",
            Age: 100,
            "Planted (Year)": 1920,
            "Death (Year)": null,
            "Heritage Value": "High",
            Municipality: "Sample City",
            Address: "123 Tree St",
            "Common Name": "Oak",
            Description: "A very old oak tree",
            Condition: "Good",
            Status: "Alive",
            ngwId: 1,
          },
          geometry: {
            type: 'Point',
            coordinates: [12.34, 56.78],
          },
        },
      ],
    };
    (existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockGeoJSON));
    const { req, res } = createMockReqRes('GET');
    res.on('finish', () => {
      expect(res.statusCode).toBe(200);
      expect(JSON.parse((res as any).getBody())).toEqual([
        {
          treeName: 'Oak',
          age: 100,
          plantedYear: 1920,
          deathYear: null,
          heritageValue: 'High',
          municipality: 'Sample City',
          address: '123 Tree St',
          latitude: 56.78,
          longitude: 12.34,
          commonName: 'Oak',
          description: 'A very old oak tree',
          condition: 'Good',
          status: 'Alive',
          iconUrls: [],
          ngwId: 1,
          speciesScore: 0,
          uniquenessScore: 3,
        },
      ]);
      done();
    });
    handler(req, res);
  });
});
