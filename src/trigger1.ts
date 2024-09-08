import {EventBridgeEvent} from "aws-lambda/trigger/eventbridge";
import {GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {logic} from "./mainLogic";
import {Readable} from "node:stream";
import {streamToString} from "./utils";

export const handler = async (event: EventBridgeEvent<any, any>) => {
    const s3 = new S3Client()
    const response =  await s3.send(new GetObjectCommand( {Bucket: process.env.BUCKET_NAME1 as string, Key:"file1.txt"}));
    console.log("test:"+response)
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

