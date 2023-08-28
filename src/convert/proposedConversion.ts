import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

const proposedChangeTempDir = path.join(os.tmpdir(), "entype-proposed-changes");

// map of temporary file path to original file URI
const pendingFiles = new Map<string, vscode.Uri>();

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

  const newContent = Buffer.from(originalContent);

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
    "Click 'Convert' on the Status Bar below to apply the changes."
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
    console.log(`DEBUG: saving other file: ${document.uri}`);
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
statusBarBtn.command = "entype.saveDraft";
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
