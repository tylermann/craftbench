import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import AuthSettings from "../config/authSettings";
import { getAllowLargerRetrySetting } from "../config/settings";
import { getDefaultModel, largerModel } from "../openai";

export type ProposeEditCommandConfig = {
  command: string;

  // propose the edit by returning the new content
  proposeEdit: (
    document: vscode.TextDocument,
    newFileName: string,
    suggestedModel: string
  ) => Promise<undefined | string>;

  // Defaults to 'Accept Edits'
  acceptEditsButtonTitle?: string;

  // Defaults to 'Accept Edits and Save'
  acceptEditsButtonTooltip?: string;

  // Whether or not to require an OpenAI key to run this command. Will prompt the user
  // to enter a key if they haven't already and otherwise abort the command.
  requireOpenAIKey?: boolean;

  // Optional callback to prevent running this command on documents that don't match
  // the criteria. If not provided, will run on all documents. Returning a string will trigger
  // a warning message with the string to be shown to the user.
  shouldRun?: (document: vscode.TextDocument) => string | undefined;

  // Optional function to override new filename. if provided will delete the original
  // file and create a new one in the same folder with the new filename on accepting the edits.
  // If not provided, will just save the edits to the original file.
  newFileName?: (document: vscode.TextDocument) => Promise<string>;

  // Optional title that shows in the tab for the diff between the old and new files.
  proposedEditsTitle?: string;
};

const proposedTempDir = path.join(os.tmpdir(), "craftbench-proposed");

type PendingFile = {
  originalUri: vscode.Uri;
  command: string;
};

// map of temporary file path to PendingFile
const pendingFiles = new Map<string, PendingFile>();

export type ProposeEditCommand = {
  command: string;
  config: ProposeEditCommandConfig;
  subscriber: vscode.Disposable;
};

export const createProposeEditCommand = (
  config: ProposeEditCommandConfig
): ProposeEditCommand => {
  const fullCommand = `craftbench.${config.command}`;
  console.log("CraftBench Info: Registering command", fullCommand);

  const subscriber = vscode.commands.registerCommand(fullCommand, async () => {
    await proposeEdits(config);
  });

  return {
    command: config.command,
    config,
    subscriber,
  };
};

export function createRetryProposeEditCommand(commands: ProposeEditCommand[]): vscode.Disposable {
  return vscode.commands.registerCommand(
    "craftbench.retryProposeEditLargerModel",
    async () => {
      // get current pendingFile
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const pendingFile = pendingFiles.get(editor.document.uri.fsPath);
      if (!pendingFile) {
        return;
      }

      const config = commands.find(
        (c) => c.command === pendingFile.command
      )?.config;
      if (!config) {
        return;
      }

      await proposeEdits(config, largerModel);
    }
  );
};

export async function saveDraft() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  await convertDraft(editor.document);
}

// This function updates the visibility of the status bar button based on the current file path.
export const updateButtonVisibility = (
  commands: ProposeEditCommand[],
  editor: vscode.TextEditor | undefined
) => {
  const pendingFile = editor && pendingFiles.get(editor.document.uri.fsPath);

  if (!pendingFile) {
    acceptBarItem.hide();
    retryWithLargerModelBarItem.hide();
    return;
  }

  const command = commands.find((c) => c.command === pendingFile.command);
  if (!command) {
    acceptBarItem.hide();
    retryWithLargerModelBarItem.hide();
    return;
  }

  updateAcceptBarItem(acceptBarItem, command.config);
  acceptBarItem.show();

  if (getAllowLargerRetrySetting()) {
    retryWithLargerModelBarItem.show();
  } else {
    retryWithLargerModelBarItem.hide();
  }
};

function updateAcceptBarItem(
  statusBarItem: vscode.StatusBarItem,
  config: ProposeEditCommandConfig
) {
  statusBarItem.text = `$(pending) ${
    config.acceptEditsButtonTitle || "Accept Edits"
  }`;
  statusBarItem.tooltip =
    config.acceptEditsButtonTooltip || "Save Proposed Edits";
}

function createAcceptStatusBarItem() {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  statusBarItem.command = "craftbench.saveDraft";
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.warningBackground"
  );

  return statusBarItem;
}

export const acceptBarItem = createAcceptStatusBarItem();

function createRetryWithLargerModelBarItem() {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99
  );

  statusBarItem.text = "Retry w/ gpt-4";
  statusBarItem.command = "craftbench.retryProposeEditLargerModel";
  statusBarItem.tooltip =
    "Retry with larger gpt-4 to see if it can complete the request better.";
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.errorBackground"
  );

  return statusBarItem;
}

export const retryWithLargerModelBarItem = createRetryWithLargerModelBarItem();

async function proposeEdits(config: ProposeEditCommandConfig, model?: string) {
  if (config.requireOpenAIKey) {
    const hasKey = await promptForOpenAITokenIfNeeded();
    if (!hasKey) {
      return;
    }
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;

  const shouldRun = config.shouldRun ? config.shouldRun(document) : undefined;
  if (shouldRun) {
    vscode.window.showWarningMessage(shouldRun);
    return;
  }

  const originalUri = document.uri;

  const newFileName = config.newFileName
    ? await config.newFileName(document)
    : path.basename(originalUri.fsPath);

  let suggestedModel = model || getDefaultModel();

  const newContent = await config.proposeEdit(
    document,
    newFileName,
    suggestedModel
  );
  if (!newContent) {
    return;
  }

  const newContentBuffer = Buffer.from(newContent);

  // use the new document name but in the original directory
  const tempFilePath = path.join(proposedTempDir, newFileName);
  const tempFileUri = vscode.Uri.file(tempFilePath);

  await vscode.workspace.fs.writeFile(tempFileUri, newContentBuffer);

  pendingFiles.set(tempFilePath, {
    originalUri,
    command: config.command,
  });

  // show the diff
  const title = config.proposedEditsTitle || "Proposed Edits";

  await vscode.commands.executeCommand(
    "vscode.diff",
    originalUri,
    tempFileUri,
    title
  );

  const buttonTitle = config.acceptEditsButtonTitle || "Accept Edits";

  await vscode.window.showInformationMessage(
    `Click '${buttonTitle}' on the Status Bar below to apply proposed changes.`
  );
}

const convertDraft = async (document: vscode.TextDocument) => {
  const pendingFile = pendingFiles.get(document.uri.fsPath);
  if (!pendingFile) {
    return;
  }

  const newContent = document.getText();

  const newContentBuffer = Buffer.from(newContent);

  const originalUri = pendingFile.originalUri;

  // use the new document name but in the original directory
  const newDocumentUri = originalUri.with({
    path: path.join(
      path.dirname(originalUri.fsPath),
      path.basename(document.uri.fsPath)
    ),
  });
  await vscode.workspace.fs.writeFile(newDocumentUri, newContentBuffer);

  // delete the original file if the new file is not the same
  if (newDocumentUri.fsPath !== originalUri.fsPath) {
    await vscode.workspace.fs.delete(originalUri);
  }

  // delete the temp file
  await vscode.workspace.fs.delete(document.uri);

  pendingFiles.delete(document.uri.fsPath);

  // close the diff editor
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");

  // show the original document so we can close it
  await vscode.window.showTextDocument(originalUri);
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");

  // show the newly converted document
  await vscode.window.showTextDocument(newDocumentUri);
};

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
