import * as vscode from "vscode";

export function getUseGPT4Setting(): boolean {
  return vscode.workspace.getConfiguration().get("craftbench.useGPT4", false);
}
