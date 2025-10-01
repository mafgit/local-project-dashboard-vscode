import * as vscode from "vscode";
import { openProject, refreshDirectories } from "./utils/main";
import { showProjectsPanel } from "./utils/webviewPanel";
import { SidebarProvider } from "./utils/sidebarProvider";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Welcome to LocalHub!");

  const disposable1 = vscode.commands.registerCommand(
    "localhub.openProject",
    openProject
  );

  const disposable2 = vscode.commands.registerCommand(
    "localhub.refreshDirectories",
    () => refreshDirectories(context)
  );

  const disposable3 = vscode.commands.registerCommand(
    "localhub.showProjectsPanel",
    () => showProjectsPanel(context)
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
