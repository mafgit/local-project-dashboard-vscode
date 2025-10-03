import * as vscode from "vscode";
import fs from "fs/promises";
import { walkHelper } from "./walk";
import path from "path";
import { GlobalStateDirs } from "./sidebar";

let arr: (vscode.QuickPickItem & { path: string })[] = [];

export async function refreshProjects(context: vscode.ExtensionContext) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title:
        "LocalHub — Refreshing project directories. May take a while.",
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ increment: 0, message: "..." });
      arr = [];

      const dirs = context.globalState.get<GlobalStateDirs>("dirs", {});

      for (const dir of Object.keys(dirs)) {
        const children = await fs.readdir(dir); // todo: check whether it is a folder or file

        for (let child of children) {
          const itemPath = path.join(dir, child);
          // const item = {
          //   path: path.join(dir, value),
          //   label: `$(folder) ${value}`,
          //   detail: "",
          // };

          const extCount = await walkHelper(itemPath, 4);

          // const entries = Object.entries(extCount);
          // entries.sort((a, b) => b[1] - a[1]);
          // for (let [key, value] of entries) {
          //   item.detail += `$(debug-breakpoint-data-unverified) ${value.toFixed(
          //     1
          //   )}% ${key.slice(1)}`;
          // }
          // arr.push(item);

          dirs[dir][child] = { languages: extCount, starred: false }; // todo: check if already starred
        }
      }

      await context.globalState.update("dirs", dirs);

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
  return Math.ceil(Math.random() * 1234213430).toString();
};
