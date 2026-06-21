import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});

function getImageBucketName() {
  const bucketName = process.env.IMAGE_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("IMAGE_BUCKET_NAME environment variable is not set.");
  }

  return bucketName;
}

export async function getImageUrl(imageKey?: string | null) {
  if (!imageKey) {
    return null;
  }

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: getImageBucketName(),
      Key: imageKey,
    }),
    {
      expiresIn: 3600,
    }
  );
}