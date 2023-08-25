import * as vscode from "vscode";
import {
  proposeTypeScriptConversion,
  updateButtonVisibility,
  saveDraft,
  statusBarBtn,
} from "./convert/proposedConversion";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "entype" is now active!');

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "entype.convertToTS",
      proposeTypeScriptConversion
    )
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
