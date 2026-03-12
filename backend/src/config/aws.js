// src/config/aws.js

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const env = require('./env');

const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId:     env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

/**
 * Upload a buffer to S3.
 * @returns {string} Public URL of the uploaded object
 */
const uploadToS3 = async ({ key, buffer, contentType = 'application/pdf' }) => {
  await s3Client.send(new PutObjectCommand({
    Bucket:      env.aws.bucketName,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));

  return `https://${env.aws.bucketName}.s3.${env.aws.region}.amazonaws.com/${key}`;
};

/**
 * Generate a time-limited signed URL for private file access.
 * Default expiry: 1 hour.
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: env.aws.bucketName,
    Key:    key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

module.exports = { s3Client, uploadToS3, getPresignedUrl };
