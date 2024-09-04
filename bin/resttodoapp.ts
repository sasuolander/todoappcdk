#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ResttodoappStack } from '../lib/resttodoapp-stack';
import {DatabaseStack} from "../lib/database";
import {InfraStack} from "../lib/infra";

const app = new cdk.App();
new ResttodoappStack(app, 'ResttodoappStack', {
  envName:"dev",
    stageName:""
});

new DatabaseStack(app, 'ResttodoappStack', {
    envName:"dev",
    stageName:""
});

new InfraStack(app, 'ResttodoappStack', {
    envName:"dev",
    stageName:""
});