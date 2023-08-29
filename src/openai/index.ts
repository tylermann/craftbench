import OpenAI from "openai";
import AuthSettings from "../config/authSettings";

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

  const response = await instance.chat.completions.create({
    model: "gpt-3.5-turbo", // TODO: make this configurable
    messages,
    functions: options.func ? [options.func] : undefined,
  });

  if (!options.func) {
    return response.choices[0].message.content;
  }

  throw new Error("Not implemented");
}
