import * as vscode from "vscode";
import fs from "fs/promises";
import { walkHelper } from "./walk";
import path from "path";
import { GlobalStateDirs } from "./GlobalStateDirs";
import { MAX_PROJECTS_IN_A_DIR } from "./constants";

// dirs = {
// 	'C:\projs': {
// 		'app1': { languages: {}, starred: true },
// 		'app2': { languages: {}, starred: false }
// 	},
// 	'D:\codes': {}
// }

export async function refreshProjects(context: vscode.ExtensionContext) {
	const oldDirs = context.globalState.get<GlobalStateDirs>("dirs", {});
	const newDirs: GlobalStateDirs = {};

	const oldDirsArr = Object.keys(oldDirs);
	const oldDirsArrLength = oldDirsArr.length;

	if (oldDirsArrLength === 0) {
		vscode.window.showWarningMessage(
			"You haven't added any base directory yet.",
		);

		return;
	}

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Scanning",
			cancellable: true,
		},
		async (progress, token) => {
			for (let d = 0; d < oldDirsArrLength; d++) {
				const baseDir = oldDirsArr[d];

				try {
					progress.report({
						message: "..." + baseDir.slice(-30),
					});
					const projects = await fs.readdir(baseDir);

					newDirs[baseDir] = {};

					for (
						let i = 0;
						i < Math.min(projects.length, MAX_PROJECTS_IN_A_DIR);
						i++
					) {
						const proj = projects[i];
						const itemPath = path.join(baseDir, proj);
						// console.log(' -- ', itemPath);

						const stats = await fs.stat(itemPath);

						if (
							stats.isDirectory() &&
							!proj.startsWith(".") &&
							proj !== "node_modules"
						) {
							const { extDist, framework } = await walkHelper(
								itemPath,
								4,
							);

							let starred = false;

							if (oldDirs[baseDir][proj]) {
								starred = oldDirs[baseDir][proj].starred;
							}

							const projectDiscovered = {
								languages: extDist,
								starred,
								framework,
							};

							newDirs[baseDir][proj] = projectDiscovered;
						}
					}

					progress.report({
						increment: Math.ceil(100 / oldDirsArrLength),
					});
				} catch (err: any) {
					console.error(err); // err.code == 'ENOENT' means baseDir isn't actually available (i.e. was deleted by user in his PC)
					// already handled (will be removed, due to old and new dirs logic)
				}
			}

			await context.globalState.update("dirs", newDirs);

			// progress.report({ increment: 100, message: "Done" });
			vscode.window.showInformationMessage("Scanning Completed!");
		},
	);
}
