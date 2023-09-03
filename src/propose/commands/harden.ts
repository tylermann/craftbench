import * as path from "path";
import * as vscode from "vscode";
import { complete } from "../../openai";
import { createProposeEditCommand } from "..";

const systemPrompt = `You are a Principal Software Engineer with many years of experience in this programming language and domain.
The output of your response will be saved as a new file and expected to work as-is so make sure you only output code and no extra comments/questions.
Your peer has requested that you look over the provided code and try to make sure it is robust.
This means checking for things like error handling, security issues, bugs, performance issues, and more.
If you notice any issues or ways that the code could be obviously improved then please go ahead and make the changes.
If you don't see any issues or changes that need to be made then just return the original code as-is.
Please second-guess any changes you are making and if not 100% necessary then don't make the change.
REMEMBER TO ONLY OUTPUT THE FILE CONTENTS, NO EXTRA COMMENTS, MARKDOWN, OR QUESTIONS.
`;

const command = createProposeEditCommand({
  command: "harden",
  requireOpenAIKey: true,
  acceptEditsButtonTitle: "Accept Edits",
  acceptEditsButtonTooltip: "Accepted hardened edits.",
  proposedEditsTitle: "Hardened Edits",
  proposeEdit: async (document, newFileName) => {
    const originalContent = document.getText();

    const sysPrompt =
      systemPrompt +
      `The filename being worked on is "${path.basename(newFileName)}"\n`;
    const response = await complete(originalContent, {
      systemPrompt: sysPrompt,
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
