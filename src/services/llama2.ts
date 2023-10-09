import { LlmConfigSchema } from "~/validators/prompt_version";
import { fakeResponse, generateOutput } from "./llm_response";

export interface LLMConfig {
  max_tokens: number;
  temperature: number;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number,
  retryDelay: number,
) {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.error("Request failed:", error);
    }

    retryCount++;
    if (retryCount < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return null;
}

export async function run(
  prompt: string,
  llm_model: string,
  llmConfig: LlmConfigSchema,
  isDevelopment: boolean = false,
) {
  const maxRetries = 3;
  const retryDelay = 1000;

  const startTime = new Date();
  let response;
  if (isDevelopment) {
    response = fakeResponse.llama2FakeResponse;
  } else {
    const apiUrl =
      "https://api.deepinfra.com/v1/inference/meta-llama/Llama-2-7b-chat-hf";
    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPINFRA_API_TOKEN}`,
      },
      body: JSON.stringify({ input: prompt }),
    };

    response = await fetchWithRetry(
      apiUrl,
      requestOptions,
      maxRetries,
      retryDelay,
    );

    console.log(`llm response -------------- ${JSON.stringify(response)}`);
  }

  const endTime = new Date();
  const latency: number = Number(endTime) - Number(startTime);

  return generateOutput(response);
}
