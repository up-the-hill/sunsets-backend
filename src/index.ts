import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { sunsetsTable } from './db/schema.js';
import { db } from './db/db.js';
import { s3Client } from './aws.js';
import { toGeoJSON } from './utility.js';

// s3 imports
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
// import { sql } from 'drizzle-orm';


// s3 helper functions
type CreatePresignedUrlWithClientParams = {
  client: S3Client;
  bucket: string;
  key: string;
};

export const createPresignedPutUrl = async ({
  client,
  bucket,
  key,
}: CreatePresignedUrlWithClientParams): Promise<string> => {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

export const createPresignedGetUrl = async ({
  client,
  bucket,
  key,
}: CreatePresignedUrlWithClientParams): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

function parseLngLatPair(str: string | undefined) {
  if (!str) return null
  const parts = str.split(',').map(s => s.trim())
  if (parts.length !== 2) return null
  const lng = Number(parts[0])
  const lat = Number(parts[1])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lng, lat }
}

// main
const app = new Hono()

type formData = {
  longitude: number,
  latitude: number,
}

// app.get('/', serveStatic({ path: './public/index.html' }))

app.get('/styles/sunset', serveStatic({ path: './public/sunset_min.json' }))

// old api endpoint, gets all rows from table
app.get('/api/sunsets', async (c) => {
  const sunsets = await db.select().from(sunsetsTable)
  return c.json(toGeoJSON(sunsets))
})

// newer location-based queries
// app.get('/api/sunsets', async (c) => {
//   const centreRaw = c.req.query('centre')
//   const zoomRaw = c.req.query('zoom')
//
//   const centre = parseLngLatPair(centreRaw)
//   const zoom = Number(zoomRaw);
//
//   if (!centre || !zoom) {
//     return c.json({ error: 'Invalid or missing query parameters.' }, 400);
//   }
//
//   if (zoom < 5) {
//     return c.json({ error: 'Zoom too low.' }, 400);
//   }
//
//   const radius = (36864 * 2 ** (1 - zoom))
//
//   const sunsets = await db.select().from(sunsetsTable).where(sql`ST_DWithin(
//     ${sunsetsTable.geo}, ST_SetSRID(ST_MakePoint(${centre.lng}, ${centre.lat}), 4326)::geography, ${radius * 1000}
//   )`)
//
//   return c.json(toGeoJSON(sunsets))
// })

// get image
app.get('/api/sunsets/:id', async (c) => {
  const id = c.req.param('id')
  const url = await createPresignedGetUrl({
    client: s3Client,
    bucket: process.env.AWS_BUCKET_NAME!,
    key: id,
  });
  return c.text(url);
})

// upload image
app.post('/api/sunsets', async (c) => {
  let fd: formData = await c.req.parseBody();
  try {
    // generate a uuidv4
    let uuid = uuidv4();

    // create s3 presigned POST
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: uuid,
      Conditions: [
        ["content-length-range", 0, 5242880], // up to 5 MB
      ],
      Expires: 3600,
    });

    const s: typeof sunsetsTable.$inferInsert = {
      id: uuid,
      geo: [fd.longitude, fd.latitude],
    };

    await db.insert(sunsetsTable).values(s)

    c.status(201)
    return c.json({ url, fields })
  } catch (e) {
    console.error(e)
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
