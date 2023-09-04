import * as path from "path";
import * as vscode from "vscode";
import { complete } from "../../openai";
import { createProposeEditCommand } from "..";

const systemPrompt = `You are a Principal Software Engineer with many years of experience in this programming language and domain.
The output of your response will be saved as the new version of the file and expected to work the same.
Your peer has requested that you look over the provided code and try to make sure it looks polished.
You are specifically looking for thigns like typos in variable names/comments, inconsistent formatting, improving readability of the code, etc.
Avoid making any changes that could change the functionality of the code.
Try to match the existing style of the file, and don't do things like change all quotes to double quotes, etc.
`;

const command = createProposeEditCommand({
  command: "polish",
  requireOpenAIKey: true,
  acceptEditsButtonTitle: "Accept Edits",
  acceptEditsButtonTooltip: "Accepted polished edits.",
  proposedEditsTitle: "Polished Edits",
  proposeEdit: async (document, newFileName, suggestedModel) => {
    const originalContent = document.getText();

    const sysPrompt =
      systemPrompt +
      `The filename being worked on is "${path.basename(newFileName)}"\n`;
    const response = await complete(originalContent, {
      systemPrompt: sysPrompt,
      model: suggestedModel,
    });

    if (!response) {
      // if the response is empty then throw an error and return
      await vscode.window.showErrorMessage(
        "The response from OpenAI was empty. Please try again."
      );
      return;
    }

    return response;
  },
});

export default command;
