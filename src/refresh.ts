import * as vscode from "vscode";
import fs from "fs/promises";
import { walkHelper } from "./walk";
import path from "path";
import { GlobalStateDirs } from "./GlobalStateDirs";
import { MAX_PROJECTS_IN_A_DIR } from "./extension";

// dirs = {
// 	'C:\projs': {
// 		'app1': { languages: {}, starred: true },
// 		'app2': { languages: {}, starred: false }
// 	},
// 	'D:\codes': {}
// }

export async function refreshProjects(context: vscode.ExtensionContext) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "LocalHub — Refreshing project directories. May take a while.",
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ increment: 0, message: "..." });

      const oldDirs = context.globalState.get<GlobalStateDirs>("dirs", {});
      const newDirs: GlobalStateDirs = {};

      console.log(Object.keys(oldDirs));

      for (const baseDir of Object.keys(oldDirs)) {
        try {
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
              const { extDist, framework } = await walkHelper(itemPath, 4);

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
        } catch (err: any) {
          console.log(err); // err.code == 'ENOENT' means baseDir isn't actually available (i.e. was deleted by user in his PC)
        }
      }

      await context.globalState.update("dirs", newDirs);

      progress.report({ increment: 100, message: "Done!" });
    }
  );
}
