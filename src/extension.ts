import * as vscode from "vscode";
import { refreshProjects } from "./refresh";
import { showProjectsPanel } from "./panel";
import { SidebarProvider } from "./sidebar";

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

export const genNonce = () => {
  return Math.ceil(Math.random() * 1234213438).toString();
};

export const MAX_PROJECTS_IN_A_DIR = 60;
export const MAX_LANGUAGES_TO_SHOW = 10;
