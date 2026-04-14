// MinIO (S3-compatible) client + bucket bootstrap
const Minio = require('minio');

const BUCKET = process.env.MINIO_BUCKET || 'product-images';

const client = new Minio.Client({
  endPoint:        process.env.MINIO_ENDPOINT   || 'localhost',
  port:            parseInt(process.env.MINIO_PORT || '9000'),
  useSSL:          process.env.MINIO_USE_SSL === 'true',
  accessKey:       process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey:       process.env.MINIO_SECRET_KEY || 'minioadmin',
});

/**
 * Ensure the product-images bucket exists with public read policy.
 * Called once at startup.
 */
async function ensureBucket() {
  const exists = await client.bucketExists(BUCKET);
  if (!exists) {
    await client.makeBucket(BUCKET, 'us-east-1');
    console.log(`[minio] Created bucket: ${BUCKET}`);

    // Set anonymous read policy so images are publicly accessible
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect:    'Allow',
        Principal: { AWS: ['*'] },
        Action:    ['s3:GetObject'],
        Resource:  [`arn:aws:s3:::${BUCKET}/*`],
      }],
    });
    await client.setBucketPolicy(BUCKET, policy);
    console.log(`[minio] Set public-read policy on: ${BUCKET}`);
  } else {
    console.log(`[minio] Bucket already exists: ${BUCKET}`);
  }
}

/**
 * Generate a pre-signed GET URL valid for 7 days.
 * Falls back to a direct URL if signing fails.
 */
async function getPresignedUrl(objectKey) {
  try {
    return await client.presignedGetObject(BUCKET, objectKey, 7 * 24 * 60 * 60);
  } catch {
    const host = `${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`;
    return `http://${host}/${BUCKET}/${objectKey}`;
  }
}

/**
 * Upload a Buffer/stream as an object.
 * Returns the object key.
 */
async function uploadObject(objectKey, dataBuffer, contentType = 'image/png') {
  await client.putObject(BUCKET, objectKey, dataBuffer, dataBuffer.length, {
    'Content-Type': contentType,
  });
  return objectKey;
}

module.exports = { client, BUCKET, ensureBucket, getPresignedUrl, uploadObject };
