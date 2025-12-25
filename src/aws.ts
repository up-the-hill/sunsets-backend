import 'dotenv/config';
import {
  S3Client,
} from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!, // Specify the AWS region from environment variables
  credentials: {
    accessKeyId: process.env.AWS_ACCESSKEYID!, // Access key ID from environment variables
    secretAccessKey: process.env.AWS_SECRETACCESSKEY! // Secret access key from environment variables
  }
});
