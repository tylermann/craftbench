import * as vscode from "vscode";
import {
  proposeTypeScriptConversion,
  updateButtonVisibility,
  saveDraft,
  statusBarBtn,
} from "./convert/proposedConversion";
import AuthSettings from "./config/authSettings";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // initialize our secret store
  AuthSettings.init(context);

  console.log('"entype" is active!');

  context.subscriptions.push(
    vscode.commands.registerCommand("entype.convertToTS", async () => {
      const hasKey = await promptForOpenAITokenIfNeeded();
      if (!hasKey) {
        return;
      }
      await proposeTypeScriptConversion();
    })
  );

  updateButtonVisibility(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateButtonVisibility)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("entype.saveDraft", saveDraft)
  );

  context.subscriptions.push(statusBarBtn);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function promptForOpenAITokenIfNeeded() {
  const key = await AuthSettings.instance.getOpenAIToken();
  if (key) {
    return true;
  }

  const response = await vscode.window.showInformationMessage(
    "To use this extension, you need to provide an OpenAI API token. Would you like to provide one now?",
    "Yes",
    "No"
  );

  if (response === "Yes") {
    const token = await vscode.window.showInputBox({
      prompt: "Please enter your OpenAI API token",
    });

    if (token) {
      await AuthSettings.instance.storeOpenAIToken(token);
      return true;
    }
  }

  return false;
}
