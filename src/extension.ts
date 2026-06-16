import * as vscode from "vscode";
import { refreshProjects } from "./refresh";
import MyPanel from "./panel";
import { MySidebarProvider } from "./sidebar";

export async function activate(context: vscode.ExtensionContext) {
	const myPanel = new MyPanel();
	// console.log("Welcome to Local Project Dashboard!");

	// on startup panel open
	const config = vscode.workspace.getConfiguration("localProjectDashboard");
	const showOnStartup = config.get("showOnStartup", false);
	if (showOnStartup && !myPanel.panel) {
		myPanel.showProjectsPanel(context);
	}

	// disposables
	context.subscriptions.push(
		// refreshProjects command
		vscode.commands.registerCommand(
			"localProjectDashboard.refreshProjects",
			() => refreshProjects(context),
		),

		// showProjects command
		vscode.commands.registerCommand(
			"localProjectDashboard.showProjectsPanel",
			() => myPanel.showProjectsPanel(context),
		),

		// sidebar view provider
		vscode.window.registerWebviewViewProvider(
			"localProjectDashboard.sidebarView",
			new MySidebarProvider(context, myPanel),
		),

		// if user closes vscode while panel was opened, so to restore the panel UI
		vscode.window.registerWebviewPanelSerializer(
			"localProjectDashboardPanel",
			{
				async deserializeWebviewPanel(webviewPanel, _state) {
					if (myPanel.panel) {
						// if already exists, no need for the one that was recovered
						webviewPanel.dispose();
						return;
					}

					myPanel.setupPanel(context, webviewPanel, true); // rehydrate the recovered panel
				},
			},
		),
	);
}

export function deactivate() {}

export const genNonce = () => {
	return Math.ceil(Math.random() * 1234213438).toString();
};
