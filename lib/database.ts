import * as cdk from 'aws-cdk-lib';
import { AppInfo } from "./appInfo";
import { Construct } from 'constructs';
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {Duration, RemovalPolicy} from "aws-cdk-lib";
import {StringParameter} from "aws-cdk-lib/aws-ssm";
import {selectRemovePolicy} from "./remove";
import {InstanceClass, InstanceSize, InstanceType, SubnetType, Vpc} from "aws-cdk-lib/aws-ec2";
import {Credentials, DatabaseInstance, DatabaseInstanceEngine, PostgresEngineVersion} from "aws-cdk-lib/aws-rds";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AppInfo) {
    super(scope, id, props);

      const table = new Table(this, 'TasksTable',
          {
              tableName: 'TasksTable'+ props?.envName,
              partitionKey: { name: 'taskId', type: AttributeType.STRING },
              sortKey: { name: 'task', type: AttributeType.STRING }, // Optional: use as sort key if tasks need ordering
              billingMode: BillingMode.PAY_PER_REQUEST, // PAY_PER_REQUEST or PROVISIONED
              removalPolicy: selectRemovePolicy(props),
      });

      // Optional: Add a Global Secondary Index (GSI)
      table.addGlobalSecondaryIndex({
          indexName: 'TaskIndex',
          partitionKey: { name: 'task', type: AttributeType.STRING },
          sortKey: { name: 'taskId', type: AttributeType.STRING },
      });

      new StringParameter(this, "mainTable_"+ props?.envName,{parameterName: "mainTable_"+ props?.envName,stringValue:table.tableArn})
        const vpc = Vpc.fromLookup(this,"import_vpcid_"+ props?.envName, {
            // https://lzygo1995.medium.com/how-to-resolve-all-arguments-to-vpc-fromlookup-must-be-concrete-no-tokens-error-in-cdk-add1c2aba97b
        vpcId :StringParameter.valueFromLookup(this,"vpcid_"+ props?.envName)
        })
      const dbInstance = new DatabaseInstance(this, 'db-instance', {
          vpc,
          vpcSubnets: {
              subnetType: SubnetType.PRIVATE_ISOLATED,
          },
          engine: DatabaseInstanceEngine.postgres({
              version: PostgresEngineVersion.VER_13,
          }),
          instanceType: InstanceType.of(
              InstanceClass.BURSTABLE3,
              InstanceSize.MICRO,
          ),
          credentials: Credentials.fromGeneratedSecret('postgres'),
          multiAz: false,
          allocatedStorage: 10,
          maxAllocatedStorage: 10,
          allowMajorVersionUpgrade: false,
          autoMinorVersionUpgrade: true,
          backupRetention: Duration.days(0),
          deleteAutomatedBackups: true,
          removalPolicy: selectRemovePolicy(props),
          deletionProtection: false,
          databaseName: 'testDb'+ props?.envName,
          publiclyAccessible: false,
      });

      new StringParameter(this, "dbInstanceEndpointAddress_"+ props?.envName,{parameterName: "dbInstanceEndpointAddress_"+ props?.envName,stringValue:dbInstance.dbInstanceEndpointAddress})
      new StringParameter(this, "dbInstanceEndpointPort_"+ props?.envName,{parameterName: "dbInstanceEndpointPort_"+ props?.envName,stringValue:dbInstance.dbInstanceEndpointPort})

  }
}
