import * as vscode from "vscode";

export function getUseLargeModelSetting(): boolean {
  return vscode.workspace
    .getConfiguration()
    .get("craftbench.useLargeModel", false);
}

export function getAllowLargerRetrySetting(): boolean {
  // if we are already using the large model, don't allow a retry
  if (getUseLargeModelSetting()) {
    return false;
  }
  return vscode.workspace
    .getConfiguration()
    .get("craftbench.allowLargerRetry", true);
}
