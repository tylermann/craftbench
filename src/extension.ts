import * as vscode from "vscode";
import {
  saveDraft,
  updateButtonVisibility,
  ProposeEditCommand,
} from "./propose";
import toTypeScript from "./propose/commands/toTypeScript";
import craft from "./propose/commands/craft";

import AuthSettings from "./config/authSettings";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // initialize our secret store
  AuthSettings.init(context);

  console.log('"CraftBench" is active!');

  const commands = [craft, toTypeScript];

  commands.forEach((command: ProposeEditCommand) => {
    context.subscriptions.push(command.subscriber);
    context.subscriptions.push(command.statusBarItem);
  });

  updateButtonVisibility(commands, vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateButtonVisibility(commands, editor);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("craftbench.saveDraft", saveDraft)
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
