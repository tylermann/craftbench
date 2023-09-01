import * as vscode from "vscode";
import {
  updateButtonVisibility,
  saveDraft,
  ProposeEditCommand,
} from "./propose";
import commands from "./propose/commands";

import AuthSettings from "./config/authSettings";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // initialize our secret store
  AuthSettings.init(context);

  console.log('"CraftBench" is active!');

  commands.forEach((command: ProposeEditCommand) => {
    context.subscriptions.push(command.subscriber);
    context.subscriptions.push(command.statusBarItem);
  });

  updateButtonVisibility(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateButtonVisibility)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("craftbench.saveDraft", saveDraft)
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
