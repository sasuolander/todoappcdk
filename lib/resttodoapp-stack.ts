import * as cdk from 'aws-cdk-lib';
import {AppInfo} from "./appInfo";
import {Construct} from 'constructs';
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Table} from "aws-cdk-lib/aws-dynamodb";
import {StringParameter} from "aws-cdk-lib/aws-ssm";
import {ApiKey, ApiKeySourceType, LambdaIntegration, RestApi, UsagePlan} from "aws-cdk-lib/aws-apigateway";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ResttodoappStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AppInfo) {
      super(scope, id, props);


    const table = Table.fromTableArn(this,"mainTable",
        StringParameter.fromStringParameterName(this,"mainTable_name",
        "mainTable_"+ props?.envName).stringValue)

// Create the Lambda function
      const myFunction = new NodejsFunction(this, "myFunction", {
          entry: 'src/mainApi.ts', // entry point to your Lambda function
          handler: 'handler', // the name of the exported handler in the entry file
          runtime:  cdk.aws_lambda.Runtime.NODEJS_20_X, // or another supported Node.js runtime
          environment: {
              TABLE_NAME: table.tableName,
          }
      });

      // Grant the Lambda function read/write permissions on the DynamoDB table
      table.grantReadWriteData(myFunction);


      const api = new RestApi(this, "testApi",{
          apiKeySourceType: ApiKeySourceType.HEADER,
          deployOptions : {stageName: "testApi_"+ props?.envName}
      })
      const lambdaIntegration = new LambdaIntegration(myFunction)
      api.root.addMethod('POST', lambdaIntegration)
      api.root.addMethod('GET', lambdaIntegration)

      const apiKey = new ApiKey(this, 'ApiKey',{
          apiKeyName:'ApiKey',
          enabled:true
      });

      const usagePlan = new UsagePlan(this, 'UsagePlan', {
          name: 'Usage Plan',
          apiStages: [
              {
                  api,
                  stage: api.deploymentStage,
              },
          ],
      });
      usagePlan.addApiKey(apiKey);
  }
}
