import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  DatadogLambda,
  ENABLE_DD_TRACING_ENV_VAR,
  INJECT_LOG_CONTEXT_ENV_VAR,
  FLUSH_METRICS_TO_LOGS_ENV_VAR,
  LOG_LEVEL_ENV_VAR,
  ENABLE_DD_LOGS_ENV_VAR,
  CAPTURE_LAMBDA_PAYLOAD_ENV_VAR,
  DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING,
  DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING,
  DD_HANDLER_ENV_VAR,
  DD_TAGS,
  ENABLE_XRAY_TRACE_MERGING_ENV_VAR,
  SITE_URL_ENV_VAR,
  API_KEY_ENV_VAR,
  filterAndFormatGitRemote,
} from "../src/index";

const NODE_LAYER_VERSION = 91;

jest.mock("child_process", () => {
  return {
    execSync: () => "1234",
  };
});

describe("applyEnvVariables", () => {
  it("applies default values correctly", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      forwarderArn: "arn:test:forwarder:sa-east-1:12345678:1",
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [ENABLE_XRAY_TRACE_MERGING_ENV_VAR]: "false",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
        },
      },
    });
  });

  it("gives all environment variables the correct names", () => {
    const EXAMPLE_LOG_LEVEL = "debug";
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      forwarderArn: "arn:test:forwarder:sa-east-1:12345678:1",
      logLevel: EXAMPLE_LOG_LEVEL,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          ["DD_LAMBDA_HANDLER"]: "hello.handler",
          ["DD_FLUSH_TO_LOG"]: "true",
          ["DD_TRACE_ENABLED"]: "true",
          ["DD_SERVERLESS_APPSEC_ENABLED"]: "false",
          ["DD_MERGE_XRAY_TRACES"]: "false",
          ["DD_SERVERLESS_LOGS_ENABLED"]: "true",
          ["DD_CAPTURE_LAMBDA_PAYLOAD"]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          ["DD_LOGS_INJECTION"]: "true",
          ["DD_LOG_LEVEL"]: "debug",
        },
      },
    });
  });

  it("correctly enables AppSec", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      enableDatadogASM: true,
      extensionLayerVersion: 50,
      apiKey: "test",
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          ["AWS_LAMBDA_EXEC_WRAPPER"]: "/opt/datadog_wrapper",
          ["DD_LAMBDA_HANDLER"]: "hello.handler",
          ["DD_TRACE_ENABLED"]: "true",
          ["DD_SERVERLESS_APPSEC_ENABLED"]: "true",
          ["DD_MERGE_XRAY_TRACES"]: "false",
          ["DD_SERVERLESS_LOGS_ENABLED"]: "true",
          ["DD_CAPTURE_LAMBDA_PAYLOAD"]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
        },
      },
    });
  });
});

describe("setDDEnvVariables", () => {
  it("sets additional environment variables if provided", () => {
    const EXAMPLE_LOG_LEVEL = "debug";
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      forwarderArn: "arn:test:forwarder:sa-east-1:12345678:1",
      logLevel: EXAMPLE_LOG_LEVEL,
      enableColdStartTracing: false,
      minColdStartTraceDuration: 80,
      coldStartTraceSkipLibs: "skipLib1,skipLib2",
      enableProfiling: true,
      encodeAuthorizerContext: false,
      decodeAuthorizerContext: false,
      apmFlushDeadline: "20",
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          ["DD_LAMBDA_HANDLER"]: "hello.handler",
          ["DD_FLUSH_TO_LOG"]: "true",
          ["DD_TRACE_ENABLED"]: "true",
          ["DD_MERGE_XRAY_TRACES"]: "false",
          ["DD_SERVERLESS_LOGS_ENABLED"]: "true",
          ["DD_CAPTURE_LAMBDA_PAYLOAD"]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          ["DD_LOGS_INJECTION"]: "true",
          ["DD_LOG_LEVEL"]: "debug",
          ["DD_COLD_START_TRACING"]: "false",
          ["DD_MIN_COLD_START_DURATION"]: "80",
          ["DD_COLD_START_TRACE_SKIP_LIB"]: "skipLib1,skipLib2",
          ["DD_PROFILING_ENABLED"]: "true",
          ["DD_ENCODE_AUTHORIZER_CONTEXT"]: "false",
          ["DD_DECODE_AUTHORIZER_CONTEXT"]: "false",
          ["DD_APM_FLUSH_DEADLINE_MILLISECONDS"]: "20",
        },
      },
    });
  });
});

describe("ENABLE_DD_TRACING_ENV_VAR", () => {
  it("disables Datadog tracing when set to false", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      enableDatadogTracing: false,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "false",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });

  it("enables Datadog tracing by default if value is undefined", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", { nodeLayerVersion: NODE_LAYER_VERSION });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("ENABLE_XRAY_TRACE_MERGING_ENV_VAR", () => {
  it("enables Datadog xray trace merging when set to true", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      enableMergeXrayTraces: true,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [ENABLE_XRAY_TRACE_MERGING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });

  it("disables Datadog xray trace merging by default if value is undefined", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", { nodeLayerVersion: NODE_LAYER_VERSION });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [ENABLE_XRAY_TRACE_MERGING_ENV_VAR]: "false",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("INJECT_LOG_CONTEXT_ENV_VAR", () => {
  it("disables log injection when set to false", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      forwarderArn: "arn:test:forwarder:sa-east-1:12345678:1",
      injectLogContext: false,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "false",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });

  it("enables log injection by default if value is undefined", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      forwarderArn: "arn:test:forwarder:sa-east-1:12345678:1",
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("LOG_LEVEL_ENV_VAR", () => {
  it("sets the log level", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      forwarderArn: "arn:test:forwarder:sa-east-1:12345678:1",
      logLevel: "debug",
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [LOG_LEVEL_ENV_VAR]: "debug",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("ENABLE_DD_LOGS_ENV_VAR", () => {
  it("disables Datadog logs when set to false", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      enableDatadogLogs: false,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "false",
        },
      },
    });
  });

  it("enables Datadog logs by default if value is undefined", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", { nodeLayerVersion: NODE_LAYER_VERSION });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("DD_TAGS_ENV_VAR", () => {
  it("sets git.commit.sha and git.repository_url in DD_TAGS by default", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      captureLambdaPayload: true,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "true",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
          [DD_TAGS]: "git.commit.sha:1234,git.repository_url:1234",
        },
      },
    });
  });

  it("doesn't overwrite DD_TAGS when adding source code integration data", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      nodeLayerVersion: NODE_LAYER_VERSION,
      captureLambdaPayload: true,
      tags: "key:value",
      // the below fields are needed or DD_TAGS won't get set
      extensionLayerVersion: 10,
      apiKey: "test",
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "false",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "true",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "false",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
          [DD_TAGS]: "key:value,git.commit.sha:1234,git.repository_url:1234",
          [ENABLE_XRAY_TRACE_MERGING_ENV_VAR]: "false",
          [SITE_URL_ENV_VAR]: "datadoghq.com",
          [API_KEY_ENV_VAR]: "test",
        },
      },
    });
  });

  it("doesn't overwrite DD_TAGS when adding source code integration data with custom extension arn", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      nodeLayerVersion: NODE_LAYER_VERSION,
      captureLambdaPayload: true,
      tags: "key:value",
      // the below fields are needed or DD_TAGS won't get set
      extensionLayerArn: "arn:aws:lambda:us-west-2:123456789012:layer:Datadog-Extension-custom:10",
      apiKey: "test",
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "false",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "true",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "false",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
          [DD_TAGS]: "key:value,git.commit.sha:1234,git.repository_url:1234",
          [ENABLE_XRAY_TRACE_MERGING_ENV_VAR]: "false",
          [SITE_URL_ENV_VAR]: "datadoghq.com",
          [API_KEY_ENV_VAR]: "test",
        },
      },
    });
  });

  it("doesnt add source code integration when config is set to false", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      captureLambdaPayload: true,
      sourceCodeIntegration: false,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "true",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("CAPTURE_LAMBDA_PAYLOAD_ENV_VAR", () => {
  it("sets captureLambdaPayload to true when specified by the user", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      captureLambdaPayload: true,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "true",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });

  it("sets default value to false when variable is undefined", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      captureLambdaPayload: undefined,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("captureCloudServicePayload", () => {
  it("sets DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING and DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING to 'all' when captureCloudServicePayload is set to true", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      captureCloudServicePayload: true,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "all",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "all",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });

  it("sets DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING and DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING to '$.*' when captureCloudServicePayload is set to true", () => {
    const app = new App();
    const stack = new Stack(app, "stack", {
      env: {
        region: "us-west-2",
      },
    });
    const hello = new lambda.Function(stack, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline("test"),
      handler: "hello.handler",
    });
    const datadogLambda = new DatadogLambda(stack, "Datadog", {
      captureCloudServicePayload: undefined,
      nodeLayerVersion: NODE_LAYER_VERSION,
    });
    datadogLambda.addLambdaFunctions([hello]);
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          [DD_HANDLER_ENV_VAR]: "hello.handler",
          [FLUSH_METRICS_TO_LOGS_ENV_VAR]: "true",
          [ENABLE_DD_TRACING_ENV_VAR]: "true",
          [CAPTURE_LAMBDA_PAYLOAD_ENV_VAR]: "false",
          [DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING]: "$.*",
          [DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING]: "$.*",
          [INJECT_LOG_CONTEXT_ENV_VAR]: "true",
          [ENABLE_DD_LOGS_ENV_VAR]: "true",
        },
      },
    });
  });
});

describe("filterAndFormatGitRemote", () => {
  it("should correctly format a Github repository URL", () => {
    expect(filterAndFormatGitRemote("https://github.com/username/repository")).toBe("github.com/username/repository");
    expect(filterAndFormatGitRemote("git@github.com:username/repository")).toBe("github.com/username/repository");
    expect(filterAndFormatGitRemote("https://user:pass@github.com/username/repository")).toBe(
      "github.com/username/repository",
    );
  });

  it("should correctly format a Gitlab repository URL", () => {
    expect(filterAndFormatGitRemote("https://gitlab.com/username/repository")).toBe("gitlab.com/username/repository");
    expect(filterAndFormatGitRemote("git@gitlab.com:username/repository")).toBe("gitlab.com/username/repository");
    expect(filterAndFormatGitRemote("https://user:pass@gitlab.com/username/repository")).toBe(
      "gitlab.com/username/repository",
    );
  });
});
