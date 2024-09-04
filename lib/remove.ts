import {AppInfo} from "./appInfo";
import {RemovalPolicy} from "aws-cdk-lib";

export function selectRemovePolicy (props?:AppInfo) {
    if (props?.envName == "prod") return  RemovalPolicy.RETAIN
    else return RemovalPolicy.DESTROY
}