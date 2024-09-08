import {GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {logic} from "./mainLogic";
import {streamToString} from "./utils";
import {Readable} from "node:stream";


export const handler = async (event: any ) => {
    const s3 = new S3Client()
    const response =  await s3.send(new GetObjectCommand( {Bucket: process.env.BUCKET_NAME1 as string, Key:"file1.txt"}));
    const updated = logic(await streamToString(response.Body as Readable),1)
    await s3.send(new PutObjectCommand({
        Bucket:  process.env.BUCKET_NAME2 as string,
        Key: "file1.txt",
        Body: updated,
        ContentType: 'text/plain'
    }));
    // @ts-ignore
    return {message: "Ok"};
  };

