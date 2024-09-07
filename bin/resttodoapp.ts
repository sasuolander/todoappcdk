#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ResttodoappStack } from '../lib/resttodoapp-stack';
import {DatabaseStack} from "../lib/database";
import {InfraStack} from "../lib/infra";
require('dotenv').config()
const app = new cdk.App();
new ResttodoappStack(app, 'ResttodoappStack', {
    env: {
        account:process.env.AWS_ACCOUNT,
        region:process.env.AWS_REGION,
    },
  envName:"dev",
    stageName:"learncdk"
});

new DatabaseStack(app, 'ResttodoappDatabaseStack', {
    env: {
        account:process.env.AWS_ACCOUNT,
        region:process.env.AWS_REGION,
    },
    envName:"dev",
    stageName:"learncdk"
});

new InfraStack(app, 'ResttodoappInfraStack', {
    env: {
        account:process.env.AWS_ACCOUNT,
        region:process.env.AWS_REGION,
    },
    envName:"dev",
    stageName:"learncdk"
});