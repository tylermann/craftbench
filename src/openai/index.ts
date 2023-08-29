import OpenAI from "openai";
import AuthSettings from "../config/authSettings";
import { getUseGPT4Setting } from "../config/settings";

type Message = OpenAI.Chat.Completions.CreateChatCompletionRequestMessage;
type Function = OpenAI.Chat.Completions.CompletionCreateParams.Function;

const getInstance = async () => {
  const token = await AuthSettings.instance.getOpenAIToken();
  if (!token) {
    throw new Error("OpenAI token not found");
  }
  return new OpenAI({
    apiKey: token,
  });
};

type CompleteOptions = {
  systemPrompt?: string;
  func?: Function;
};

export async function complete(prompt: string, options: CompleteOptions = {}) {
  const instance = await getInstance();

  const messages: Message[] = [];

  if (options.systemPrompt) {
    messages.push({
      role: "system",
      content: options.systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const model = getUseGPT4Setting() ? "gpt-4" : "gpt-3.5-turbo";

  console.log("CraftBench Info: Using model", model);

  const response = await instance.chat.completions.create({
    model,
    messages,
    functions: options.func ? [options.func] : undefined,
  });

  const firstChoice = response.choices[0];
  const ranOutOfTokens = firstChoice.finish_reason === "length";

  if (ranOutOfTokens) {
    throw new Error("Ran out of tokens");
  }

  if (!options.func) {
    return firstChoice.message.content;
  }

  throw new Error("Not implemented");
}
