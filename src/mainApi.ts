import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    GetCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {APIGatewayEvent} from "aws-lambda/trigger/api-gateway-proxy";
import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";

interface TaskInput {
    taskId: string,
    task: string,
    status: string,
    dueDate: string,
    assignedTo: string,
}

export interface ReturnValue {
    statusCode:Number,
    body:string
}

export const handler = async (event: APIGatewayEvent):Promise<ReturnValue> => {

    const dynamoDb = new DynamoDBClient();
    const dynamo = DynamoDBDocumentClient.from(dynamoDb);
    const s3 = new S3Client()
    const tableName = process.env.TABLE_NAME as string;

    async function makePut(body:string,bucketName:string) {
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: "file1.txt",
            Body: body,
            ContentType: 'text/plain'
        }));
    }

    async function post() {
        if  (event.path =="/update" && event.body != null) {
            return  await updateItem(JSON.parse(event.body) as TaskInput, tableName, dynamo)
        } else if (event.path =="/update2" && event.body != null ) {
            return await insertItem(JSON.parse(event.body) as TaskInput, tableName, dynamo)
        } else if (event.path =="/trigger1" && event.body != null ) {
            await makePut(event.body,process.env.BUCKET_NAME1 as string);
            return {
                statusCode: 200,
                body: JSON.stringify({message: 'OK'}),
            };

        } else if (event.path =="/trigger2" && event.body != null ) {
            await makePut(event.body,process.env.BUCKET_NAME2 as string);
            return {
                statusCode: 200,
                body: JSON.stringify({message: 'OK'}),
            };

        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({message: 'Invalid path'}),
            };
        }
    }

    async function get() {
        if (event.path == "/all") {
            return await getAll(tableName, dynamo)
        } else if (event.path == "/item" && event.body != null) {
            return await getItem(JSON.parse(event.body) as TaskInput, tableName, dynamo)
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({message: 'Invalid HTTP method'}),
            };
        }
    }

    const testApiKey = event.headers["X-API-Key"]
    if (testApiKey == undefined) {
        return {
            statusCode: 401,
            body: JSON.stringify({message: ''}),
        };
    }

    switch (event.httpMethod) {
        case 'POST':
            return await post();
        case 'GET':
            return await get();
        default:
            return {
                statusCode: 400,
                body: JSON.stringify({message: 'Invalid HTTP method'}),
            };
    }
  };

async function getItem(event : TaskInput,tableName:string, client: DynamoDBDocumentClient) {
    const params = {
        TableName: tableName,
        Key: {
            taskId: event.taskId,
            task: event.task,
        },
    };
    try {
        const result = await client.send( new GetCommand(params));
        if (result.Item) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Item retrieved successfully', item: result.Item }),
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Item not found' }),
            };
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve item', error }),
        };
    }


}
async function getAll(tableName:string, client: DynamoDBDocumentClient):Promise<ReturnValue> {
    try {
        const result = await client.send(new ScanCommand({
            TableName: tableName,
            Limit: 10,
        }))

        if (result.Items) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Item retrieved successfully', item: result.Items }),
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Item not found' }),
            };
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve item', error }),
        };
    }


}

async function insertItem(event : TaskInput,tableName:string, client: DynamoDBDocumentClient):Promise<ReturnValue> {
    const item = {
        taskId: event.taskId,
        task: event.task,
        status: event.status,
        dueDate: event.dueDate,
        assignedTo: event.assignedTo,
    };

    const params = {
        TableName: tableName,
        Item: item,
    };

    try {
         await client.send( new PutCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Item inserted successfully', item }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to insert item', error }),
        };
    }
}


async function updateItem(event : TaskInput,tableName:string,client: DynamoDBDocumentClient):Promise<ReturnValue> {
    const command = new UpdateCommand({
        TableName: tableName,
        Key: {
            taskId: event.taskId,
            task: event.task,
        },
        UpdateExpression: 'set #s = :s, dueDate = :d, assignedTo = :a',
        ExpressionAttributeValues: {
            ':s': event.status,
            ':d': event.dueDate,
            ':a': event.assignedTo,
        },
        ReturnValues: 'UPDATED_NEW',
    });

    try {
        const result = await client.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Item updated successfully', updatedAttributes: result.Attributes }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update item', error }),
        };
    }

}