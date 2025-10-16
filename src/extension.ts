import * as vscode from "vscode";
import { refreshProjects } from "./utils/main";
import { showProjectsPanel } from "./utils/panel";
import { SidebarProvider } from "./utils/sidebar";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Welcome to LocalHub — Project Explorer!");

  const disposable1 = vscode.commands.registerCommand(
    "localhub.refreshProjects",
    () => refreshProjects(context)
  );

  const disposable2 = vscode.commands.registerCommand(
    "localhub.showProjectsPanel",
    () => showProjectsPanel(context)
  );

  const disposable3 = vscode.window.registerWebviewViewProvider(
    "sidebarView",
    new SidebarProvider(context)
  );

  context.subscriptions.push(disposable1, disposable2, disposable3);
}

export function deactivate() {}
