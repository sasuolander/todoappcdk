import * as cdk from 'aws-cdk-lib';
import { AppInfo } from "./appInfo";
import { Construct } from 'constructs';
import {NatProvider, SecurityGroup, SubnetType, Vpc} from "aws-cdk-lib/aws-ec2";
import {StringParameter} from "aws-cdk-lib/aws-ssm";


export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AppInfo) {
    super(scope, id, props);

      // Create a new VPC
      const vpc = new Vpc(this, 'MyVPC_'+ props?.envName, {
          vpcName:'MyVPC_'+ props?.envName,
          maxAzs: 2,  // Default is all available AZs
          natGateways: 1,  // Number of NAT gateways
          subnetConfiguration: [
              {
                  name: 'public-subnet-'+ props?.envName,
                  subnetType: SubnetType.PUBLIC ,
                  cidrMask: 24,
              },
              {
                  name: 'private-subnet-'+ props?.envName,
                  subnetType: SubnetType.PRIVATE_WITH_EGRESS ,
                  cidrMask: 24,
              },
              {
                  name: 'isolated-subnet-1'+ props?.envName,
                  subnetType: SubnetType.PRIVATE_ISOLATED,
                  cidrMask: 28,
              },
          ],
      });

      // Example: Create a security group in the VPC
      const securityGroup = new SecurityGroup(this, 'MySecurityGroup', {
          securityGroupName: 'MySecurityGroup_'+ props?.envName,
          vpc,
          allowAllOutbound: true,
          description: 'Security group for my resources',
      });

      new StringParameter(this,"vpcid",{stringValue: vpc.vpcId,parameterName:"vpcid_"+ props?.envName})
      new StringParameter(this,"vpcArn",{stringValue: vpc.vpcArn,parameterName:"vpcArn_"+ props?.envName})
      new StringParameter(this,"securityGroupId",{stringValue: securityGroup.securityGroupId,parameterName:"securityGroupId_"+ props?.envName})

  }
}
