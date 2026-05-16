import path from "node:path";
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {
  AttributeType,
  BillingMode,
  Table,
} from "aws-cdk-lib/aws-dynamodb";

export class PokebinderStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repoRoot = path.join(__dirname, "../../..");
    const backendRoot = path.join(repoRoot, "backend");

    const bindersTable = new Table(this, "BindersTable", {
      partitionKey: {
        name: "userId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "binderId",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const binderCardsTable = new Table(this, "BinderCardsTable", {
      partitionKey: {
        name: "binderId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "slotKey",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const healthFunction = new NodejsFunction(this, "HealthFunction", {
      entry: path.join(backendRoot, "src/functions/health.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
    });

    const bindersFunction = new NodejsFunction(this, "BindersFunction", {
      entry: path.join(backendRoot, "src/functions/binders.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
      environment: {
        BINDERS_TABLE_NAME: bindersTable.tableName,
        BINDER_CARDS_TABLE_NAME: binderCardsTable.tableName,
      },
      bundling: {
        externalModules: [],
      },
    });

    const binderCardsFunction = new NodejsFunction(this, "BinderCardsFunction", {
      entry: path.join(backendRoot, "src/functions/binderCards.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
      environment: {
        BINDERS_TABLE_NAME: bindersTable.tableName,
        BINDER_CARDS_TABLE_NAME: binderCardsTable.tableName,
      },
      bundling: {
        externalModules: [],
      },
    });

    bindersTable.grantReadWriteData(bindersFunction);
    binderCardsTable.grantReadWriteData(bindersFunction);

    bindersTable.grantReadData(binderCardsFunction);
    binderCardsTable.grantReadWriteData(binderCardsFunction);

    const httpApi = new HttpApi(this, "PokebinderHttpApi", {
      apiName: "pokebinder-api",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["content-type", "authorization"],
      },
    });

    httpApi.addRoutes({
      path: "/health",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "HealthIntegration",
        healthFunction
      ),
    });

    const bindersIntegration = new HttpLambdaIntegration(
      "BindersIntegration",
      bindersFunction
    );

    httpApi.addRoutes({
      path: "/binders",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: bindersIntegration,
    });

    httpApi.addRoutes({
      path: "/binders/{binderId}",
      methods: [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE],
      integration: bindersIntegration,
    });

    const binderCardsIntegration = new HttpLambdaIntegration(
      "BinderCardsIntegration",
      binderCardsFunction
    );

    httpApi.addRoutes({
      path: "/binders/{binderId}/cards",
      methods: [HttpMethod.GET],
      integration: binderCardsIntegration,
    });

    httpApi.addRoutes({
      path: "/binders/{binderId}/cards/{slotKey}",
      methods: [HttpMethod.PUT, HttpMethod.DELETE],
      integration: binderCardsIntegration,
    });

    new CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
    });

    new CfnOutput(this, "BindersTableName", {
      value: bindersTable.tableName,
    });

    new CfnOutput(this, "BinderCardsTableName", {
      value: binderCardsTable.tableName,
    });
  }
}