import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { serve } from '@hono/node-server'
// import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { sunsetsTable } from './db/schema.js';
import { db } from './db/db.js';
import { s3Client } from './aws.js';
import { toGeoJSON } from './utility.js';

// s3 imports
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  getSignedUrl,
  S3RequestPresigner,
} from "@aws-sdk/s3-request-presigner";


// s3 helper functions
type CreatePresignedUrlWithClientParams = {
  client: S3Client;
  bucket: string;
  key: string;
};

export const createPresignedUrlWithClient = async ({
  client,
  bucket,
  key,
}: CreatePresignedUrlWithClientParams): Promise<string> => {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};


// main
const app = new Hono()

type formData = {
  longitude: number,
  latitude: number,
}

// app.get('/', serveStatic({ path: './public/index.html' }))

app.get('/api/sunsets', async (c) => {
  const sunsets = await db.select().from(sunsetsTable)
  return c.json(toGeoJSON(sunsets))
})

app.post('/api/sunsets', async (c) => {
  let fd: formData = await c.req.parseBody();
  console.log(fd)
  try {
    // generate a uuidv4
    let uuid = uuidv4();

    // create s3 presigned url
    const clientUrl = await createPresignedUrlWithClient({
      client: s3Client,
      bucket: process.env.AWS_BUCKET_NAME!,
      key: uuid,
    });

    const s: typeof sunsetsTable.$inferInsert = {
      id: uuid,
      geo: [fd.longitude, fd.latitude],
    };

    await db.insert(sunsetsTable).values(s)

    c.status(201)
    return c.text(clientUrl)
  } catch {
    c.status(500)
    return c.text("Internal Server Error")
  }
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
