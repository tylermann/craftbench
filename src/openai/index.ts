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

  let model = getUseGPT4Setting() ? "gpt-4" : "gpt-3.5-turbo";

  let attempt = 1;

  while (true) {
    console.log("CraftBench Info: Using model", model);

    const response = await instance.chat.completions.create({
      model,
      messages,
      functions: options.func ? [options.func] : undefined,
    });

    const firstChoice = response.choices[0];
    const ranOutOfTokens = firstChoice.finish_reason === "length";

    if (ranOutOfTokens) {
      if (attempt > 1) {
        throw new Error("Ran out of tokens");
      }
      // use larger context model
      model = getUseGPT4Setting() ? "gpt-4-32k" : "gpt-3.5-turbo-16k";

      attempt++;

      console.log(
        "CraftBench Info: Ran out of tokens, trying again with increased context model"
      );
      continue;
    }

    if (!options.func) {
      return firstChoice.message.content;
    }

    throw new Error("Not implemented");
  }
}
