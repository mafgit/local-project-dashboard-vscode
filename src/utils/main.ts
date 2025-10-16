import * as vscode from "vscode";
import fs from "fs/promises";
import { walkHelper } from "./walk";
import path from "path";

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

          for (let proj of projects) {
            const itemPath = path.join(baseDir, proj);
            // console.log(' -- ', itemPath);

            const stats = await fs.stat(itemPath);

            if (stats.isDirectory() && !proj.startsWith(".")) {
              const extDist = await walkHelper(itemPath, 4);

              let starred = false;

              if (oldDirs[baseDir][proj]) {
                starred = oldDirs[baseDir][proj].starred;
              }

              const projectDiscovered = {
                languages: extDist,
                starred,
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

export const genNonce = () => {
  return Math.ceil(Math.random() * 1234213438).toString();
};

export type GlobalStateDirs = Record<
  string,
  Record<
    string,
    {
      languages: Record<string, number>;
      starred: boolean;
    }
  >
>;
