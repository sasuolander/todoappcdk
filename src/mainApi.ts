import { ALBCallback, ALBEvent, ALBResult, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    GetCommand,
    DeleteCommand, UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {APIGatewayEvent} from "aws-lambda/trigger/api-gateway-proxy";
interface Task {

    taskId: string,
        task: string,
    status: string,
    dueDate: string,
    assignedTo: string,
}


interface TaskInput {

    taskId: string,
    task: string,
    status: string,
    dueDate: string,
    assignedTo: string,
}
export const handler = async (event: APIGatewayEvent) => {

    const dynamoDb = new DynamoDBClient();
    const dynamo = DynamoDBDocumentClient.from(dynamoDb);

    const tableName = process.env.TABLE_NAME as string;
    let response = null

    switch (event.httpMethod) {
        case 'POST':
            if (event.body != null) {
                const responce = JSON.parse(event.body) as TaskInput
                response =  await insertItem(responce, tableName, dynamo)
            }
        case 'UPDATE':
            if (event.body != null) {
                const responce = JSON.parse(event.body) as TaskInput
                response = await updateItem(responce, tableName, dynamo)
            }
        case 'GET':
            if (event.body != null) {
                if (event.path =="/all") {
                    const responce = JSON.parse(event.body) as TaskInput
                    response = await getAll(responce, tableName, dynamo)
                }
                if (event.path =="/item") {
                    const responce = JSON.parse(event.body) as TaskInput
                    response = await getItem(responce, tableName,dynamo)
                }
            }
        default:
            response = {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid HTTP method' }),
            };
    }
    // @ts-ignore
    return response;
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
async function getAll(event : TaskInput,tableName:string, client: DynamoDBDocumentClient) {
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

async function insertItem(event : TaskInput,tableName:string, client: DynamoDBDocumentClient) {
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


async function updateItem(event : TaskInput,tableName:string,client: DynamoDBDocumentClient) {
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