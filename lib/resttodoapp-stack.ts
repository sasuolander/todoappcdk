import * as cdk from 'aws-cdk-lib';
import {AppInfo} from "./appInfo";
import {Construct} from 'constructs';
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Table} from "aws-cdk-lib/aws-dynamodb";
import {StringParameter} from "aws-cdk-lib/aws-ssm";
import {ApiKey, ApiKeySourceType, LambdaIntegration, RestApi, UsagePlan} from "aws-cdk-lib/aws-apigateway";
import {BlockPublicAccess, Bucket, BucketAccessControl} from "aws-cdk-lib/aws-s3";
import {selectRemovePolicy} from "./remove";
import {Rule} from "aws-cdk-lib/aws-events";
import {LambdaFunction,SfnStateMachine} from "aws-cdk-lib/aws-events-targets";
import {DefinitionBody, StateMachine} from "aws-cdk-lib/aws-stepfunctions";
import {LambdaInvoke} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {LogGroup} from "aws-cdk-lib/aws-logs";

export class ResttodoappStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: AppInfo) {
        super(scope, id, props);

        const table = Table.fromTableArn(this, "mainTable",
            StringParameter.fromStringParameterName(this, "mainTable_name",
                "mainTable_" + props?.envName).stringValue)

        const mainApi = new NodejsFunction(this, "mainApi", {
            functionName: "mainApi_" + props?.envName,
            entry: 'src/mainApi.ts', // entry point to your Lambda function
            handler: 'handler', // the name of the exported handler in the entry file
            runtime: cdk.aws_lambda.Runtime.NODEJS_20_X, // or another supported Node.js runtime
            environment: {TABLE_NAME: table.tableName,}
        });

        table.grantReadWriteData(mainApi);
        // cdk ei luonnut log group joten tehdään se nyt manuaalisesti
        const updateStateMachineStep1 = new NodejsFunction(this, "updateStateMachineStep1", {
            functionName: "updateStateMachineStep1_" + props?.envName,
            entry: 'src/updateStateMachine1.ts', // entry point to your Lambda function
            handler: 'handler', // the name of the exported handler in the entry file
            runtime: cdk.aws_lambda.Runtime.NODEJS_20_X, // or another supported Node.js runtime
            environment: {},
            logGroup: new LogGroup(this, "log1",{logGroupName: "updateStateMachineStep1_" + props?.envName})
        });

        const updateStateMachineStep2 = new NodejsFunction(this, "updateStateMachineStep2", {
            functionName: "updateStateMachineStep2_" + props?.envName,
            entry: 'src/updateStateMachine2.ts', // entry point to your Lambda function
            handler: 'handler', // the name of the exported handler in the entry file
            runtime: cdk.aws_lambda.Runtime.NODEJS_20_X, // or another supported Node.js runtime
            environment: {},
            logGroup: new LogGroup(this, "log2",{logGroupName: "updateStateMachineStep2_" + props?.envName})
        });

        const trigger1 = new NodejsFunction(this, "trigger1Function", {
            functionName: "trigger1_" + props?.envName,
            entry: 'src/trigger1.ts', // entry point to your Lambda function
            handler: 'handler', // the name of the exported handler in the entry file
            runtime: cdk.aws_lambda.Runtime.NODEJS_20_X, // or another supported Node.js runtime
            environment: {},
            logGroup: new LogGroup(this, "log3",{logGroupName: "trigger1_" + props?.envName})
        });

        const trigger2 = new NodejsFunction(this, "trigger2Function", {
            functionName: "trigger2_" + props?.envName,
            entry: 'src/trigger2.ts', // entry point to your Lambda function
            handler: 'handler', // the name of the exported handler in the entry file
            runtime: cdk.aws_lambda.Runtime.NODEJS_20_X, // or another supported Node.js runtime
            environment: {},
            logGroup: new LogGroup(this, "log4",{logGroupName: "trigger2_" + props?.envName})
        });

        const bucketForFileFinal = this.createBucket("bucketForFileFinal", props)

        const {
            bucketForFileUpdate,
            bucketForFileInitOrchestration
        } = this.Orchestration(mainApi, updateStateMachineStep1, updateStateMachineStep2, bucketForFileFinal, props)
        const {
            bucketForFileUpdateChoreography,
            bucketForFileInitChoreography
        } = this.Choreography(mainApi, trigger1, trigger2, bucketForFileFinal, props)
        mainApi.addEnvironment("BUCKET_NAME1", bucketForFileInitChoreography.bucketName)
        mainApi.addEnvironment("BUCKET_NAME2", bucketForFileInitOrchestration.bucketName)

        trigger1.addEnvironment("BUCKET_NAME1", bucketForFileInitChoreography.bucketName)
        trigger1.addEnvironment("BUCKET_NAME2", bucketForFileUpdateChoreography.bucketName)

        trigger2.addEnvironment("BUCKET_NAME1", bucketForFileUpdateChoreography.bucketName)
        trigger2.addEnvironment("BUCKET_NAME2", bucketForFileFinal.bucketName)

        updateStateMachineStep1.addEnvironment("BUCKET_NAME1", bucketForFileInitOrchestration.bucketName)
        updateStateMachineStep1.addEnvironment("BUCKET_NAME2", bucketForFileUpdate.bucketName)

        updateStateMachineStep2.addEnvironment("BUCKET_NAME1", bucketForFileUpdate.bucketName)
        updateStateMachineStep2.addEnvironment("BUCKET_NAME2", bucketForFileFinal.bucketName)

        const api = new RestApi(this, "testApi", {
            restApiName: "testApi_" + props?.envName,
            apiKeySourceType: ApiKeySourceType.HEADER,
            deployOptions: {stageName: "testApi" + props?.envName},
        })

        const lambdaIntegration = new LambdaIntegration(mainApi)
        api.root.addMethod('POST', lambdaIntegration, {
            apiKeyRequired:true
        })
        api.root.addMethod('GET', lambdaIntegration,{
            apiKeyRequired:true
        })

        const path1 = api.root.addResource("update",{})
        const path2 = api.root.addResource("update2",{})
        const path3 = api.root.addResource("trigger1",{})
        const path4 = api.root.addResource("trigger2",{})

        const path5 = api.root.addResource("all",{})
        const path6 = api.root.addResource("item",{})


        this.addMethodToApiPost(path1, lambdaIntegration);
        this.addMethodToApiPost(path2, lambdaIntegration);
        this.addMethodToApiPost(path3, lambdaIntegration);
        this.addMethodToApiPost(path4, lambdaIntegration);

        this.addMethodToApiGet(path5, lambdaIntegration);
        this.addMethodToApiGet(path6, lambdaIntegration);

        const apiKey = new ApiKey(this, 'ApiKey', {
            apiKeyName: 'ApiKey', enabled: true
        });

        const usagePlan = new UsagePlan(this, 'UsagePlan', {
            name: 'Usage Plan',
            apiStages: [{api, stage: api.deploymentStage}],
        });
        usagePlan.addApiKey(apiKey);
    }

    private addMethodToApiPost(path1: cdk.aws_apigateway.Resource, lambdaIntegration: LambdaIntegration) {
        path1.addMethod('POST', lambdaIntegration, {
            apiKeyRequired: true
        })
    }

    private addMethodToApiGet(path1: cdk.aws_apigateway.Resource, lambdaIntegration: LambdaIntegration) {
        path1.addMethod('GET', lambdaIntegration, {
            apiKeyRequired: true
        })
    }

    private Orchestration(apiStage: NodejsFunction, stage1: NodejsFunction, stage2: NodejsFunction, final: Bucket, props?: AppInfo){
        const bucketForFileInitOrchestration = this.createBucket("bucketForFileInitOrchestration", props)
        const bucketForFileUpdate = this.createBucket("bucketForFileUpdate", props)
        const bucketTriggerOrchestration = this.createRuleS3PutRule("starEventOrchestration", bucketForFileInitOrchestration, props)
        const orchestrationMachine = this.machine(stage1, stage2);
        bucketTriggerOrchestration.addTarget(orchestrationMachine)

        bucketForFileInitOrchestration.grantPut(apiStage)
        bucketForFileInitOrchestration.grantRead(stage1)
        bucketForFileUpdate.grantPut(stage1)
        bucketForFileUpdate.grantRead(stage2)
        final.grantPut(stage2)
        return {bucketForFileUpdate, bucketForFileInitOrchestration}
    }

    private Choreography(apiStage: NodejsFunction, stage1: NodejsFunction, stage2: NodejsFunction, final: Bucket, props?: AppInfo) {
        const bucketForFileInitChoreography = this.createBucket("bucketForFileChoreography", props)
        const bucketForFileUpdateChoreography = this.createBucket("bucketForFileUpdateChoreography", props)

        const bucketTriggerChoreography = this.createRuleS3PutRule("starEventChoreography", bucketForFileInitChoreography, props)
        bucketTriggerChoreography.addTarget(new LambdaFunction(stage1))

        const bucketForFileUpdateChoreographyEvent = this.createRuleS3PutRule("bucketForFileUpdateChoreographyEvent", bucketForFileUpdateChoreography, props)
        bucketForFileUpdateChoreographyEvent.addTarget(new LambdaFunction(stage2))

        bucketForFileInitChoreography.grantReadWrite(apiStage)
        bucketForFileInitChoreography.grantRead(stage1)
        bucketForFileUpdateChoreography.grantPut(stage1)
        bucketForFileUpdateChoreography.grantRead(stage2)
        final.grantPut(stage2)
        return {bucketForFileUpdateChoreography, bucketForFileInitChoreography}
    }

    private createRuleS3PutRule(name: string, bucket: Bucket, props?: AppInfo) {
        return new Rule(this, name, {
            ruleName: name + "_" + props?.envName,
            eventPattern: {
                source: ["aws.s3"],
                //detailType: [EventType.OBJECT_CREATED],
                detailType: ["Object Created"],
                detail: {bucket: {name: [bucket.bucketName]}}
            }
        });
    }

    private createBucket(bucketNameField: string, props?: AppInfo): Bucket {
        return new Bucket(this, bucketNameField, {
            //bucketName:bucketNameField+"_" + props?.envName, voidaan antaa nimi mutta ei suositeltua
            accessControl: BucketAccessControl.PRIVATE,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            removalPolicy: selectRemovePolicy(props),
            enforceSSL: true,
            eventBridgeEnabled: true,
        });
    }

    private machine(trigger: NodejsFunction, trigger1: NodejsFunction) {
        const step1 = new LambdaInvoke(this, "InvokesLambda1",{
            lambdaFunction: trigger
        })

        const step2 = new LambdaInvoke(this, "InvokesLambda2",{
            lambdaFunction: trigger1
        })

        const definition = step1.next(step2)

        const orchestrationMachine = new SfnStateMachine(
            new StateMachine(this, "OrchestrationMachine",{definitionBody: DefinitionBody.fromChainable(definition)})
        )
        return orchestrationMachine;
    }
}
