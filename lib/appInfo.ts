
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';


export interface AppInfo extends cdk.StackProps {
    stageName:string
    envName:string
}