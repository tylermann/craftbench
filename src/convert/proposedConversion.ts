import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { complete } from "../openai";

const proposedChangeTempDir = path.join(
  os.tmpdir(),
  "craftbench-proposed-changes"
);

// map of temporary file path to original file URI
const pendingFiles = new Map<string, vscode.Uri>();

const systemPrompt = `You are an expert TypeScript engineer with many years of experience with both JS and TS. Please convert the following user-provided JavaScript to TypeScript.
You don't have any other options so don't ask questions. The output of your response will be saved as a new file with the correct extension and expect to work as-is. So default to using "any" or "unknown" if you
think something will break otherwise, although we would prefer to have real types. The code should function the exact same as it did previously
and for the most part should read the exact same as it did previously other than the type changes. If you have any extra feedback regarding the TypeScript conversion
you can leave it as inline comments with the prefix "// TS-CONVERSION: " and the user can read that feedback. Although ideall no extra comments are needed.
`;

export async function proposeTypeScriptConversion() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const originalUri = document.uri;
  const originalDocumentName = path.basename(originalUri.fsPath);

  const originalContent = document.getText();

  const newDocumentName = originalDocumentName.replace(/\.js$/, ".ts");

  const tempFilePath = path.join(proposedChangeTempDir, newDocumentName);
  const tempFileUri = vscode.Uri.file(tempFilePath);

  const response = await complete(originalContent, {
    systemPrompt,
  });

  if (!response) {
    return;
  }

  const newContent = Buffer.from(response);

  await vscode.workspace.fs.writeFile(tempFileUri, newContent);

  pendingFiles.set(tempFilePath, originalUri);

  // Show a diff viewer
  await vscode.commands.executeCommand(
    "vscode.diff",
    originalUri,
    tempFileUri,
    "TypeScript Conversion"
  );

  await vscode.window.showInformationMessage(
    "Click 'Convert' on the Status Bar below to apply proposed changes."
  );
}

export async function saveDraft() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  await convertDraft(editor.document);
}

const convertDraft = async (document: vscode.TextDocument) => {
  const originalUri = pendingFiles.get(document.uri.fsPath);
  if (!originalUri) {
    return;
  }

  const newContent = document.getText();

  const newContentBuffer = Buffer.from(newContent);

  // use the new document name but in the original directory
  const newDocumentUri = originalUri.with({
    path: path.join(
      path.dirname(originalUri.fsPath),
      path.basename(document.uri.fsPath)
    ),
  });
  await vscode.workspace.fs.writeFile(newDocumentUri, newContentBuffer);

  // delete the original file
  await vscode.workspace.fs.delete(originalUri);

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

export const statusBarBtn = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);

statusBarBtn.text = "$(pending) Convert";
statusBarBtn.command = "craftbench.saveDraft";
statusBarBtn.tooltip = "Save TypeScript Conversion";
statusBarBtn.backgroundColor = new vscode.ThemeColor(
  "statusBarItem.warningBackground"
);

// This function updates the visibility of the status bar button based on the current file path.
export const updateButtonVisibility = (
  editor: vscode.TextEditor | undefined
) => {
  if (editor && pendingFiles.has(editor.document.uri.fsPath)) {
    statusBarBtn.show();
  } else {
    statusBarBtn.hide();
  }
};
