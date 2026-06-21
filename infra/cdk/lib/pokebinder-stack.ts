import path from "node:path";
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
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
import * as s3 from "aws-cdk-lib/aws-s3";

export class PokebinderStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repoRoot = path.join(__dirname, "../../..");
    const backendRoot = path.join(repoRoot, "backend");

    const inviteCode = process.env.POKEBINDER_INVITE_CODE;
    if (!inviteCode) {
      throw new Error(
        "Missing POKEBINDER_INVITE_CODE. Set it before running CDK deploy."
      );
    }

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

    bindersTable.addGlobalSecondaryIndex({
      indexName: "ShareIdIndex",
      partitionKey: {
        name: "shareId",
        type: AttributeType.STRING,
      },
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

    const imageBucket = new s3.Bucket(this, "PokebinderImageBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const userPool = new cognito.UserPool(this, "PokebinderUserPool", {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient("PokebinderWebClient", {
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
    });

    const authFunction = new NodejsFunction(this, "AuthFunction", {
      entry: path.join(backendRoot, "src/functions/auth.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        INVITE_CODE: inviteCode,
      },
      bundling: {
        externalModules: [],
      },
    });

    const jwtAuthorizer = new HttpJwtAuthorizer(
      "PokebinderJwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    const healthFunction = new NodejsFunction(this, "HealthFunction", {
      entry: path.join(backendRoot, "src/functions/health.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
    });

    const bindersFunction = new NodejsFunction(this, "BindersFunction", {
      entry: path.join(backendRoot, "src/functions/binders.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
      environment: {
        BINDERS_TABLE_NAME: bindersTable.tableName,
        BINDER_CARDS_TABLE_NAME: binderCardsTable.tableName,
        IMAGE_BUCKET_NAME: imageBucket.bucketName,
      },
      bundling: {
        externalModules: [],
      },
    });

    const binderCardsFunction = new NodejsFunction(this, "BinderCardsFunction", {
      entry: path.join(backendRoot, "src/functions/binderCards.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
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

    const publicBindersFunction = new NodejsFunction(
      this,
      "PublicBindersFunction",
      {
        entry: path.join(backendRoot, "src/functions/publicBinders.ts"),
        handler: "handler",
        runtime: Runtime.NODEJS_22_X,
        projectRoot: backendRoot,
        depsLockFilePath: path.join(backendRoot, "package-lock.json"),
        environment: {
          BINDERS_TABLE_NAME: bindersTable.tableName,
          BINDER_CARDS_TABLE_NAME: binderCardsTable.tableName,
          IMAGE_BUCKET_NAME: imageBucket.bucketName,
        },
        bundling: {
          externalModules: [],
        },
      }
    );

    const uploadsFunction = new NodejsFunction(this, "UploadsFunction", {
      entry: path.join(backendRoot, "src/functions/uploads.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
      environment: {
        BINDERS_TABLE_NAME: bindersTable.tableName,
        IMAGE_BUCKET_NAME: imageBucket.bucketName,
      },
      bundling: {
        externalModules: [],
      },
    });

    const slotImagesFunction = new NodejsFunction(this, "SlotImagesFunction", {
      entry: path.join(backendRoot, "src/functions/slotImages.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_22_X,
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
      environment: {
        BINDERS_TABLE_NAME: bindersTable.tableName,
        BINDER_CARDS_TABLE_NAME: binderCardsTable.tableName,
        IMAGE_BUCKET_NAME: imageBucket.bucketName,
      },
      bundling: {
        externalModules: [],
      },
    });

    bindersTable.grantReadWriteData(bindersFunction);
    binderCardsTable.grantReadWriteData(bindersFunction);

    bindersTable.grantReadData(binderCardsFunction);
    binderCardsTable.grantReadWriteData(binderCardsFunction);

    bindersTable.grantReadData(publicBindersFunction);
    binderCardsTable.grantReadData(publicBindersFunction);

    bindersTable.grantReadData(uploadsFunction);
    imageBucket.grantPut(uploadsFunction);
    imageBucket.grantRead(bindersFunction);
    imageBucket.grantRead(publicBindersFunction);
    bindersTable.grantReadData(slotImagesFunction);
    binderCardsTable.grantReadWriteData(slotImagesFunction);
    imageBucket.grantRead(slotImagesFunction);

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

    const healthIntegration = new HttpLambdaIntegration(
      "HealthIntegration",
      healthFunction
    );

    const bindersIntegration = new HttpLambdaIntegration(
      "BindersIntegration",
      bindersFunction
    );

    const authIntegration = new HttpLambdaIntegration(
      "AuthIntegration",
      authFunction
    );

    const binderCardsIntegration = new HttpLambdaIntegration(
      "BinderCardsIntegration",
      binderCardsFunction
    );

    const publicBindersIntegration = new HttpLambdaIntegration(
      "PublicBindersIntegration",
      publicBindersFunction
    );

    const uploadsIntegration = new HttpLambdaIntegration(
      "UploadsIntegration",
      uploadsFunction
    );

    const slotImagesIntegration = new HttpLambdaIntegration(
      "SlotImagesIntegration",
      slotImagesFunction
    );

    httpApi.addRoutes({
      path: "/health",
      methods: [HttpMethod.GET],
      integration: healthIntegration,
    });

    httpApi.addRoutes({
      path: "/auth/register",
      methods: [HttpMethod.POST],
      integration: authIntegration,
    });

    httpApi.addRoutes({
      path: "/binders",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: bindersIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/binders/{binderId}",
      methods: [HttpMethod.GET, HttpMethod.PUT, HttpMethod.DELETE],
      integration: bindersIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/binders/{binderId}/share",
      methods: [HttpMethod.POST, HttpMethod.DELETE],
      integration: bindersIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/binders/{binderId}/cards",
      methods: [HttpMethod.GET],
      integration: binderCardsIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/binders/{binderId}/cards/{slotKey}",
      methods: [HttpMethod.PUT, HttpMethod.DELETE],
      integration: binderCardsIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/public/binders/{shareId}",
      methods: [HttpMethod.GET],
      integration: publicBindersIntegration,
    });

    httpApi.addRoutes({
      path: "/uploads/cover-url",
      methods: [HttpMethod.POST],
      integration: uploadsIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/uploads/slot-image-url",
      methods: [HttpMethod.POST],
      integration: uploadsIntegration,
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/binders/{binderId}/slot-images/{slotKey}",
      methods: [HttpMethod.PUT, HttpMethod.DELETE],
      integration: slotImagesIntegration,
      authorizer: jwtAuthorizer,
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

    new CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, "ImageBucketName", {
      value: imageBucket.bucketName,
    });
  }
}