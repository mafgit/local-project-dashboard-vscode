import * as vscode from "vscode";
import fs from "fs/promises";
import path from "path";
import { walkHelper } from "./utils/walk";
import { getWebviewHTML } from "./utils/webview";

export async function activate(context: vscode.ExtensionContext) {
  // vscode.window.registerTreeDataProvider(
  //   "local-project-opener-view",
  //   new vscode
  // )
  console.log("Welcome to Local Project Opener!");
  let dirs: Record<string, string[]> = { "C:\\Users\\DC\\codes": [] };
  let arr: (vscode.QuickPickItem & { path: string })[] = [];

  async function refreshDirectories() {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title:
          "Local Project Opener: Refreshing project directories. May take a while.",
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: "..." });
        arr = [];

        for (const dir of Object.keys(dirs)) {
          const data = await fs.readdir(dir);
          dirs[dir] = data;

          for (let value of data) {
            const item = {
              path: path.join(dir, value),
              label: `$(folder) ${value}`,
              detail: "",
            };

            const extCount = await walkHelper(item.path, 3);

            const entries = Object.entries(extCount);
            entries.sort((a, b) => b[1] - a[1]);

            for (let [key, value] of entries) {
              item.detail += `$(debug-breakpoint-data-unverified) ${value.toFixed(
                1
              )}% ${key.slice(1)}`;
            }

            arr.push(item);
          }
        }

        progress.report({ increment: 100, message: "Done!" });
      }
    );
  }

  async function openProject() {
    const picked = await vscode.window.showQuickPick(arr, {
      title: "Select Project To Open In New Tab",
      matchOnDescription: true,
    });

    if (!picked) return;
    vscode.window.showInformationMessage(picked.path);
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(picked.path),
      {
        forceNewWindow: true,
      }
    );
  }

  const disposable1 = vscode.commands.registerCommand(
    "local-project-opener.openProject",
    openProject
  );

  const disposable2 = vscode.commands.registerCommand(
    "local-project-opener.refreshDirectories",
    refreshDirectories
  );

  const disposable3 = vscode.commands.registerCommand(
    "local-project-opener.openProjectsView",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "localProjectOpenerWebview",
        "Local Project Opener",
        vscode.ViewColumn.One,
        {
          retainContextWhenHidden: false,
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath,'src', "media")),
          ],
        }
      );

      const getUri = (file: string) => {
        return panel.webview.asWebviewUri(
          vscode.Uri.file(path.join(context.extensionPath,'src', "media", file))
        ).toString()
      };

      panel.webview.html = getWebviewHTML(panel.webview.cspSource, getUri);
    }
  );

  context.subscriptions.push(disposable1, disposable2, disposable3);
}

// This method is called when your extension is deactivated
export function deactivate() {}
