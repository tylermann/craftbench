import * as path from "path";
import * as vscode from "vscode";
import { complete } from "../../openai";
import { createProposeEditCommand } from "..";

const systemPrompt = `You are a Principal Software Engineer with many years of experience in this programming language and domain.
The output of your response will be saved as a new file and expected to work as-is so make sure you only output code and no extra comments/questions.
A request is a comment that starts with "craft:".
Your task is to perform all craft requests in the code provided by updating the file to accomplish the request and returning the updated file.
The updated file that you output should be ready to commit to a production database and feel complete and follow best practices.
You should delete all comments from the original file that start with "craft:" in your response.
If you are absolutely unable to complete a request then respond with only an error like this: "ERROR: Unable to complete request because ..."
You are able to modify multiple parts of the file if needed.
Make sure imports are added in correct place (top of file most likely).
REMEMBER TO ONLY OUTPUT THE FILE CONTENTS, NO EXTRA COMMENTS, MARKDOWN, OR QUESTIONS.
`;

const command = createProposeEditCommand({
  command: "craft",
  requireOpenAIKey: true,
  acceptEditsButtonTitle: "Accept Craft",
  acceptEditsButtonTooltip: "Accepted crafted edits.",
  proposedEditsTitle: "Crafted Edits",
  shouldRun: (document) => {
    // check that the document has "craft:" in it
    const matches = Boolean(document.getText().match(/craft:/));
    if (!matches) {
      return "Please add a comment starting with 'craft:' to your file to indicate what you want to accomplish.";
    }
    return undefined;
  },
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

    // Sometimes the prompt doesn't listen and will include something like ```language
    // in the response, particularly if there is no content yet in the file other than the craft
    // comment.
    // Strip first line if it starts with ``` and strip last line if it ends with ```
    const lines = response.split("\n");
    if (lines[0].startsWith("```")) {
      lines.shift();
    }
    if (lines[lines.length - 1].endsWith("```")) {
      lines.pop();
    }

    // join the lines back together
    const responseWithoutCodeBlock = lines.join("\n");
    return responseWithoutCodeBlock;
  },
});

export default command;
