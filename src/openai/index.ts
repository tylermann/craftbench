import * as vscode from "vscode";
import OpenAI from "openai";
import AuthSettings from "../config/authSettings";
import { getUseLargeModelSetting } from "../config/settings";

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
  model?: string;
  func?: Function;
};

export const largerModel = "gpt-4";

const largerContextModelMap: Record<string, string> = {
  "gpt-3.5-turbo": "gpt-3.5-turbo-16k",
  "gpt-4": "gpt-4-16k",
};

export const getDefaultModel = () =>
  getUseLargeModelSetting() ? largerModel : "gpt-3.5-turbo";

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

  let model = options.model;

  if (!model) {
    model = getDefaultModel();
  }

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
      model = largerContextModelMap[model] || "";
      if (!model) {
        throw new Error("Larger context model not found");
      }

      attempt++;

      console.log(
        "CraftBench Info: Ran out of tokens, trying again with increased context model"
      );
      vscode.window.showInformationMessage(
        "Ran out of tokens. Trying again with larger context model..."
      );
      continue;
    }

    if (!options.func) {
      return firstChoice.message.content;
    }

    throw new Error("Not implemented");
  }
}
