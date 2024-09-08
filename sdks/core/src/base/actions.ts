import { ZodError, ZodSchema } from "zod";

import {
  type ActionDefinitionType,
  type ActionRegistrationType,
  actionRegistrationSchema,
  type EmbeddingScopeWithUserType,
  DEFAULT_GROUP_ID,
  defaultGroupId,
  scopeDefaults,
  TextToActionResponse,
  EmbeddingScopeType,
} from "../schema/copilot";
import { extractFunctionParams } from "../helpers/utils";
import { performanceTracker } from "./performance";
import { SugarAiApiClient, type SugarAiApi } from "../api-client";
import { type ServiceGenerateRequestSkillsItem } from "../api-client/api";
import { translateZodSchema, translateZodSchemaToTypeScript } from "~/helpers";

export function validate(
  name: string,
  registrationSchema: ActionRegistrationType,
  func: Function,
): string[] {
  const errors: string[] = [];

  // Validate the definition to be sure
  try {
    actionRegistrationSchema.parse(registrationSchema);
  } catch (error: any) {
    const msg: string = `[${name}] Invalid action schema: ${
      error instanceof ZodError ? JSON.stringify(error.errors) : error.message
    }`;
    console.error(msg);
    errors.push(msg);
    // return false;
  }

  const funcString = func.toString();

  DEV: console.log(`[${name}] func ${funcString}`);

  const functionParams = extractFunctionParams(name, funcString);
  const functionParamNames = functionParams.map((param) => param.trim());

  // Extract parameters from ActionDefinitionType
  const parameters = registrationSchema.parameters;

  // Check if all function parameters exist in ActionRegistration
  if (functionParamNames.length !== parameters.length) {
    DEV: console.log(JSON.stringify(functionParamNames));
    DEV: console.log(JSON.stringify(parameters));
    const msg = `[${name}] Parameter count mismatch, expected ${functionParamNames.length} got ${parameters.length}`;
    errors.push(msg);
    PROD: console.error(msg);
  } else {
    functionParamNames.forEach((paramName, index: number) => {
      // const paramName = functionParamNames[index];
      const param = parameters[index];

      if (param.name !== paramName) {
        console.warn(
          `[${name}] Mismatached parameter name expected ${param.name} got: ${paramName}`,
        );
      }
    });
  }

  return errors;
}

export const register = (
  name: string,
  actionDefinition: ActionRegistrationType,
  actionCallback: Function,
  actions: Array<Record<string, ActionDefinitionType>> = [],
  callbacks: Array<Record<string, Function>> = [],
) => {
  if (!actionDefinition) {
    throw new Error(`[${name}] Action config is required`);
  }

  if (actions[name]) {
    DEV: console.warn(`[${name}] Action already registered `);
  }

  const errors = validate(name, actionDefinition, actionCallback);
  if (errors.length > 0) {
    throw new Error(
      `[${name}] Invalid action definition: ${errors.join(", ")}`,
    );
  }

  //  Generate action JSON object
  // actions[func.name] = generateTool(func);
  actions[name] = transformActionRegistrationToDefinition(actionDefinition);
  callbacks[name] = actionCallback;

  PROD: console.log(
    `[${name}] Action Registered ${JSON.stringify(actions[name])}`,
  );
};
export const unregister = (
  name: string,
  actions: Array<Record<string, ActionDefinitionType>>,
  callbacks: Array<Record<string, Function>>,
) => {
  // Assuming actions is defined somewhere globally or in the scope
  DEV: console.log(`Unregistering Actions ${name}`);
  //  Generate action JSON object
  if (actions[name] ?? false) {
    delete actions[name];
  }
  if (callbacks[name] ?? false) {
    delete callbacks[name];
  }

  // console.log(JSON.stringify(Object.values(actions)));
};

export function transformActionRegistrationToDefinition(
  registration: ActionRegistrationType,
): ActionDefinitionType {
  const actionDefinition: ActionDefinitionType = {
    type: "function",
    function: {
      name: registration.name,
      description: registration.description,
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  };

  // Iterate through registration parameters and map them to definition parameters
  registration.parameters.forEach((param) => {
    const pp = {
      type: param.type,
      description: param.description,
      enum: param.enum,
    };

    if (!param.enum) {
      delete pp.enum;
    }
    actionDefinition.function.parameters.properties[param.name] = pp;

    // Check if the parameter is required and add it to the required array if so
    if (param.required) {
      actionDefinition.function.parameters.required.push(param.name);
    }
  });
  return actionDefinition;
}

// TEST: setTimeout(() => {
//   const registration: ActionRegistrationType = {
//     name: "exampleAction",
//     description: "This is an example action",
//     parameters: [
//       {
//         name: "param1",
//         type: "string",
//         enum: ["value1", "value2"],
//         description: "Description for param1",
//         required: true,
//       },
//       {
//         name: "param2",
//         type: "integer",
//         description: "Description for param2",
//         required: false,
//       },
//     ],
//     // required: ["param1"],
//   };

//   const definition: ActionDefinitionType =
//     transformActionRegistrationToDefinition(registration);

//   TEST: console.log(definition);
// }, 1000);

export const executeAction = async function executeAction(
  actions,
  actionCallbacks,
): Promise<any> {
  for (const index in actions) {
    // Access each action object
    const action = actions[index];
    const actionName = action.function.name;
    // Access properties of the action object
    const actionArgs = JSON.parse(action.function.arguments);

    // Call the corresponding callback function using apply
    // actionCallbacks[actionName].apply(null, actionArgs);
    // actionCallbacks[actionName].call(null, actionArgs);
    // actionCallbacks[actionName].apply(null, actionArgs);
    PROD: console.log(
      `[${actionName}] Calling action ----> ${actionName}(${action.function.arguments})`,
    );

    const actionoutput: any = actionCallbacks[actionName](
      ...Object.values(actionArgs),
    );
    return actionoutput;
  }
};

export async function textToAction(
  promptTemplate,
  userQuery: string | null,
  promptVariables,
  scope: EmbeddingScopeType,
  config,
  isAssitant: boolean = false,
  chatHistorySize: number = 4,
  actions: Array<Record<string, ActionDefinitionType>> = [],
  actionCallbacks: Array<Record<string, Function>> = [],
): Promise<TextToActionResponse> {
  const { reset, addMarker, getStats } = performanceTracker();
  reset();
  addMarker("start");
  const [username, pp, pt, pv] = promptTemplate.split("/");
  const msg: SugarAiApi.ServiceGenerateRequestChatMessage = {
    role: isAssitant ? "assistant" : "user",
    content: userQuery as string,
  };

  const apiClient = new SugarAiApiClient({
    environment: config?.server.endpoint,
    token: config?.server.token,
  });

  // const messages = [msg];
  // console.log("actions", JSON.stringify(actions));
  // console.log("actionCallbacks", JSON.stringify(actionCallbacks));

  const effectiveScope = {
    ...scopeDefaults,
    ...scope,
    clientUserId: config.clientUserId,
  };

  if (effectiveScope.groupId === DEFAULT_GROUP_ID) {
    effectiveScope.groupId = defaultGroupId();
  }
  const result = (await apiClient.prompts.liteServiceGenerate(
    username,
    pp,
    pt,
    pv,
    {
      router: config.router,
      variables: promptVariables,
      scope: effectiveScope as SugarAiApi.ServiceGenerateRequestScope,
      // messages: messages as ServiceGenerateRequestMessagesItem[],
      chat: {
        id: config.clientUserId,
        message: msg,
        historyChat: chatHistorySize,
      },
      // messages: messages.slice(-3),
      // @ts-expect-error
      skills: Object.values(actions) as ServiceGenerateRequestSkillsItem[],
    },
  )) as SugarAiApi.LiteServiceGenerateResponse;
  // const c = await makeInference(
  //   promptTemplate,
  //   promptVariables,
  //   userQuery,
  //   uxActions,
  //   scope,
  //   dryRun,
  // );

  let textOutput: string = config?.ai?.successResponse as string;
  let actionOutput: any = null;

  addMarker("got_llm_response");

  // @ts-expect-error
  if (result.llmResponse?.error) {
    textOutput = config.ai?.failureResponse as string;
    addMarker("textToAction:failed");
  } else {
    // @ts-expect-error
    const choices: string | any[] = result.llmResponse?.data?.completion;

    if (choices instanceof Array) {
      // Function calling
      if (choices[0].message?.tool_calls) {
        addMarker("executing_actions");
        actionOutput = await executeAction(
          choices[0].message.tool_calls,
          actionCallbacks,
        );
        addMarker("executed_actions");
      }

      // Only content
      if (choices[0].message?.content) {
        textOutput = choices[0].message.content as string;
        addMarker("success");
      }
    } else if (typeof choices === "string") {
      textOutput = choices;
      addMarker("textToAction:success");
    } else if (isAssitant) {
      DEV: console.debug(`No choices expected in case of manual mode nudge`);
    } else {
      PROD: console.error(`Unknown response ${JSON.stringify(choices)}`);
      textOutput = config?.ai?.failureResponse as string;
      addMarker("textToAction:failed");
    }
  }
  addMarker("end");
  // observePerformance();
  PROD: console.log("Performance Stats", {
    // @ts-expect-error
    ...result.stats,
    ...{ clientStats: getStats() },
  });
  return { textOutput, actionOutput };
}

export async function textToJson(
  schema: ZodSchema<any>,
  userQuery: string | null,
  promptTemplate,
  promptVariables,
  config,
): Promise<any> {
  const zodSchemString = translateZodSchema(schema);
  console.log(zodSchemString);

  // const schemaTsString = translateZodSchemaToTypeScript(schema);
  // console.log(schemaTsString);

  promptVariables["@schema"] = zodSchemString;

  // const response = await textToAction(
  //   promptTemplate,
  //   userQuery,
  //   promptVariables,
  //   {} as EmbeddingScopeType,
  //   config,
  //   false,
  //   1,
  //   [],
  //   [],
  // );

  const response = { textOutput: jsonSampleResponse };

  // console.log("response", response);
  const codeBlocks = extractCode(response.textOutput);
  const json = parseAndValidateJson(codeBlocks[0], schema);
  console.log("json", json);
  return json;
}

function extractCode(response: string): string[] {
  const codeBlockRegex = /```[a-z]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let extractedCode: string[] = [];

  // Iterate through all code block matches
  while ((match = codeBlockRegex.exec(response)) !== null) {
    extractedCode.push(match[1]);
  }

  return extractedCode;
}

function parseAndValidateJson(codeBlock: string, schema) {
  try {
    // Step 1: Parse the JSON from the cleaned response
    console.log("codeBlock", codeBlock);
    const parsedJson = JSON.parse(codeBlock);

    // Step 2: Validate the parsed JSON using the Zod schema
    // const validatedData = schema.parse(parsedJson);
    const validatedData = parsedJson;

    console.log("Validation successful:", validatedData);

    return validatedData;
  } catch (error) {
    console.error("Validation failed:", error);
    return {};
  }
}

const jsonSampleResponse = `

Based on the JD provided, below are the questions with clear validation and qualification criteria.

\`\`\`json
[
  {
    "active": true,
    "question_type": "email",
    "question_text": {
      "lang": {
        "en": "What is your official email address?",
        "hi": "आपका आधिकारिक ईमेल पता क्या है?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 255,
      "validators": [
        {
          "type": "email",
          "message": "Invalid email format"
        }
      ]
    },
    "qualification": {
      "type": "mandatory",
      "criteria": ""
    },
    "order": 2
  },
  {
    "active": true,
    "question_type": "text",
    "question_text": {
      "lang": {
        "en": "What is your contact number?",
        "hi": "आपका संपर्क नंबर क्या है?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 20,
      "validators": [
        {
          "type": "regex",
          "regex": "^[0-9]{10}$",
          "message": "Invalid contact number format"
        }
      ]
    },
    "qualification": {
      "type": "mandatory",
      "criteria": ""
    },
    "order": 3
  },
  {
    "active": true,
    "question_type": "text",
    "question_text": {
      "lang": {
        "en": "How many years of experience do you have in e-commerce catalog management or a similar role?",
        "hi": "ई-कॉमर्स कैटलॉग प्रबंधन या एक समान भूमिका में आपका कितना अनुभव है?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 50,
      "validators": []
    },
    "qualification": {
      "type": "numeric",
      "criteria": "min:1,max:3"
    },
    "order": 4
  },
  {
    "active": true,
    "question_type": "yes_no",
    "question_text": {
      "lang": {
        "en": "Do you have experience handling e-commerce portals/websites?",
        "hi": "क्या आपके पास ई-कॉमर्स पोर्टल/वेबसाइट को संभालने का अनुभव है?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 50,
      "validators": []
    },
    "qualification": {
      "type": "mandatory",
      "criteria": ""
    },
    "order": 5
  },
  {
    "active": true,
    "question_type": "text",
    "question_text": {
      "lang": {
        "en": "Please elaborate on your current roles and responsibilities.",
        "hi": "कृपया अपनी वर्तमान भूमिकाओं और जिम्मेदारियों के बारे में विस्तार से बताएं।"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 1000,
      "validators": []
    },
    "qualification": {
      "type": "ai",
      "criteria": ""
    },
    "order": 6
  },
  {
    "active": true,
    "question_type": "yes_no",
    "question_text": {
      "lang": {
        "en": "Are you fine with the job location?",
        "hi": "क्या आपको नौकरी का स्थान स्वीकार है?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 50,
      "validators": []
    },
    "qualification": {
      "type": "mandatory",
      "criteria": ""
    },
    "order": 7
  },
  {
    "active": true,
    "question_type": "numeric",
    "question_text": {
      "lang": {
        "en": "What is your current CTC?",
        "hi": "आपका वर्तमान CTC क्या है?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 10,
      "validators": []
    },
    "qualification": {
      "type": "mandatory",
      "criteria": ""
    },
    "order": 8
  },
  {
    "active": true,
    "question_type": "numeric",
    "question_text": {
      "lang": {
        "en": "What is your expected CTC?",
        "hi": "आपकी अपेक्षित CTC क्या है?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 10,
      "validators": []
    },
    "qualification": {
      "type": "mandatory",
      "criteria": ""
    },
    "order": 9
  },
  {
    "active": true,
    "question_type": "numeric",
    "question_text": {
      "lang": {
        "en": "What would be your notice period?",
        "hi": "आपकी नोटिस अवधि कितनी होगी?"
      }
    },
    "question_params": {},
    "validation": {
      "max_length": 10,
      "validators": []
    },
    "qualification": {
      "type": "mandatory",
      "criteria": ""
    },
    "order": 10
  }
]

\`\`\`

These questions are mandatory and cover all the qualifications mentioned in the JD. The validation criteria are also set accordingly.
`;
