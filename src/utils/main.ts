import * as vscode from "vscode";
import fs from "fs/promises";
import { walkHelper } from "./walk";
import path from "path";

let dirs: Record<string, string[]> = { "C:\\Users\\DC\\codes": [] };
let arr: (vscode.QuickPickItem & { path: string })[] = [];

export async function refreshDirectories() {
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

export async function openProject() {
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

export const genNonce = () => {
  return Math.ceil(Math.random() * 1234213430);
};
