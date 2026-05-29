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
	if (showOnStartup) {
		myPanel.showProjectsPanel(context);
	}

	// disposables
	context.subscriptions.push(
		// refreshProjects command
		vscode.commands.registerCommand("localProjectDashboard.refreshProjects", () =>
			refreshProjects(context),
		),

		// showProjects command
		vscode.commands.registerCommand("localProjectDashboard.showProjectsPanel", () =>
			myPanel.showProjectsPanel(context),
		),

		// sidebar view provider
		vscode.window.registerWebviewViewProvider(
			"localProjectDashboard.sidebarView",
			new MySidebarProvider(context, myPanel),
		),

		// if user closes vscode while panel was opened, so to restore the panel UI
        // but its causing two panels to be there, and not any real improvement in time, so leaving it 
        // vscode.window.registerWebviewPanelSerializer(
		// 	"localProjectDashboardPanel",
		// 	{
		// 		async deserializeWebviewPanel(webviewPanel, _state) {
		// 			myPanel.setupPanel(context, webviewPanel);
		// 		},
		// 	},
		// ),
	);
}

export function deactivate() {}

export const genNonce = () => {
	return Math.ceil(Math.random() * 1234213438).toString();
};
