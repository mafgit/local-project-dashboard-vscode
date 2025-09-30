import * as vscode from "vscode";
import { openProject, refreshDirectories } from "./utils/main";
import { openProjectsView } from "./utils/webviewPanel";
import { SidebarProvider } from "./utils/sidebarProvider";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Welcome to Local Project Opener!");

  const disposable1 = vscode.commands.registerCommand(
    "local-project-opener.openProject",
    openProject
  );

  const disposable2 = vscode.commands.registerCommand(
    "local-project-opener.refreshDirectories",
    () => refreshDirectories(context)
  );

  const disposable3 = vscode.commands.registerCommand(
    "local-project-opener.openProjectsView",
    () => openProjectsView(context)
  );

  const disposable4 = vscode.window.registerWebviewViewProvider(
    "sidebarView",
    new SidebarProvider(context)
  );

  context.subscriptions.push(
    disposable1,
    disposable2,
    disposable3,
    disposable4
  );
}

export function deactivate() {}
