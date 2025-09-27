import * as vscode from "vscode";
import fs from "fs/promises";
import path from "path";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Welcome to Local Project Opener!");
  let dirs: Record<string, string[]> = { "C:\\Users\\DC\\codes": [] };
  let arr: (vscode.QuickPickItem & { path: string })[] = [];

  let maxDepth = 1; // 1 or more
  const ignoreFolders = new Set([
    "venv",
    "node_modules",
    "build",
    "dist",
    "out",
    "target",
    "vendor",
    "env",
    ".venv",
    ".vscode",
    ".idea",
    "__pycache__",
    "bin",
    "obj",
  ]);

  const acceptExts = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".cjs",
    ".mjs",
    ".mts",
    ".cts",
    ".py",
    ".pyi",
    ".java",
    ".groovy",
    ".c",
    ".cpp",
    ".cc",
    ".cxx",
    ".h",
    ".hpp",
    ".hh",
    ".hxx",
    ".cs",
    ".go",
    ".rs",
    ".php",
    ".phtml",
    ".rb",
    ".rake",
    ".swift",
    ".kt",
    ".kts",
    ".sh",
    ".bash",
    ".zsh",
    ".bat",
    ".cmd",
    ".asm",
    ".s",
    ".r",
    ".R",
  ]);

  async function refreshDirectories() {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title:
          "Local Project Opener: Refreshing project directories. May take a while.",
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: '...' });
        arr = [];

        console.log('AAAAAAAAAAAAA');
        
        for (const dir of Object.keys(dirs)) {
          const data = await fs.readdir(dir);
          dirs[dir] = data;
        console.log('BBBBBBBBBBB', data);

          for (let value of data) {
            console.log(value);

            const item = {
              path: path.join(dir, value),
              label: `$(folder) ${value}`,
              detail: "",
            };

            // sub-files check
            const currentProjectFiles: string[] = [];
            for (let i = 1; i <= maxDepth; i++) {
              try {
                const dirents = await fs.readdir(item.path, {
                  withFileTypes: true,
                });
                for (let dirent of dirents) {
                  if (token.isCancellationRequested) break;
                  const pathToFile = path.join(item.path, dirent.name);
                  if (dirent.isFile()) {
                    const ext = path.extname(pathToFile);
                    if (acceptExts.has(ext)) {
                      currentProjectFiles.push(ext);
                    }
                  } else {
                    if (!ignoreFolders.has(dirent.name)) {
                    }
                  }
                }
              } catch (err) {
                continue;
              }
            }

            const uniques = new Set(currentProjectFiles);
            const percentages: Record<string, number> = {};
            uniques.forEach((item) => {
              percentages[item] =
                (currentProjectFiles.filter((x) => x === item).length /
                  currentProjectFiles.length) *
                100;
            });

            const entries = Object.entries(percentages);
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

  context.subscriptions.push(disposable1, disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}
