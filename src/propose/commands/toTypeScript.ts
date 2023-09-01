import * as path from "path";
import * as vscode from "vscode";
import { complete } from "../../openai";
import { createProposeEditCommand } from "..";

const jsToTsPrefix =
  "Please convert the following user-provided JavaScript to TypeScript.\n";

const jsxToTsxPrefix =
  "Please convert the following user-provided JSX to TSX.\n";

const systemPrompt = `You are an expert TypeScript engineer with many years of experience with both JS and TS.
You don't have any other options so don't ask questions.
The output of your response will be saved as a new file with the correct extension and expect to work as-is.
Try not to use "any" or "unknown" unless you absolutely have to.
The code should function the exact same as it did previously and for the most part should read the exact same as it did previously other than the type changes.
If you are unable to convert a line or are forced to use "any" you can leave a comment above it with prefix "TS-CONVERSION: ", although avoid doing so at all costs.
`;

const command = createProposeEditCommand({
  command: "toTypeScript",
  requireOpenAIKey: true,
  acceptEditsButtonTitle: "Convert",
  acceptEditsButtonTooltip: "Convert to TypeScript",
  proposedEditsTitle: "TypeScript Conversion",
  shouldRun: (document) => {
    const documentName = path.basename(document.uri.fsPath);
    const matches = Boolean(documentName.match(/\.jsx?$/));
    if (!matches) {
      return "This command only works on JavaScript or JSX files.";
    }
    return undefined;
  },
  newFileName: async (document) => {
    const originalDocumentName = path.basename(document.uri.fsPath);
    let isJSX = originalDocumentName.endsWith(".jsx");

    if (!isJSX) {
      // check if the contents are likely JSX
      isJSX = Boolean(document.getText().match(/<\w+/));

      // check with user if they want to convert to TSX or TS
      if (isJSX) {
        const response = await vscode.window.showQuickPick(["TSX", "TS"], {
          placeHolder: "Convert to TSX or TS?",
        });

        if (response === "TS") {
          isJSX = false;
        }
      }
    }

    const replaceSuffix = isJSX ? ".tsx" : ".ts";

    const newDocumentName = originalDocumentName.replace(
      /\.jsx?$/,
      replaceSuffix
    );

    return newDocumentName;
  },
  proposeEdit: async (document, newFileName) => {
    const originalContent = document.getText();

    const isTSX = newFileName.endsWith(".tsx");

    const sysPrompt = (isTSX ? jsxToTsxPrefix : jsToTsPrefix) + systemPrompt;

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
