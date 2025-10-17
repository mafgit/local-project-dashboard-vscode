import path from "path";
import fs from "fs/promises";
import {
  ACCEPT_EXTS,
  IGNORE_FOLDERS,
  MAX_DIRENTS_TO_LOOP_OVER,
} from "./constants";
import { detectFrameworkAfter, detectFrameworkBefore } from "./framework";

export async function walkHelper(itemPath: string, depth = 4) {
  const extDist: Record<string, number> = {}; // probability distribution of file extensions used
  let totalCount = 0;
  // const gitIgnoreSet = new Set<string>();

  let framework = "";

  let isNodeApp = false;
  let isPythonApp = false;
  let isTypescriptApp = false;
  let isNextApp = false;

  async function walk(itemPath: string, depth: number) {
    if (depth <= 1) return;

    try {
      const dirents = await fs.readdir(itemPath, {
        withFileTypes: true,
      });

      if (!framework) {
        const before = detectFrameworkBefore(dirents);
        framework = before.framework;
        isNodeApp = isNodeApp || before.isNodeApp;
        isPythonApp = isPythonApp || before.isPythonApp;
        isTypescriptApp = isTypescriptApp || before.isTypescriptApp;
        isNextApp = isNextApp || before.isNextApp;
      }

      for (let dirent of dirents.slice(0, MAX_DIRENTS_TO_LOOP_OVER)) {
        if (dirent.isFile()) {
          const ext = path.extname(dirent.name).toLowerCase();
          if (shouldIgnoreFile(dirent.name, ext)) continue;
          // console.log("-> ", dirent.name);
          extDist[ext] = (extDist[ext] || 0) + 1;
          totalCount++;
        } else if (dirent.isDirectory() && !shouldIgnoreFolder(dirent.name)) {
          // console.log("Exploring ", dirent.name + "/");
          await walk(path.join(itemPath, dirent.name), depth - 1);
        }
      }
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw err;
      }
    }
  }

  await walk(itemPath, depth);

  Object.entries(extDist).forEach(([key, value]) => {
    extDist[key] = totalCount > 0 ? (value * 100) / totalCount : 0;
  });

  if (!framework) {
    framework = detectFrameworkAfter({
      extDist,
      isNodeApp,
      isPythonApp,
      isTypescriptApp,
      isNextApp,
    });
  }

  return { extDist, framework };
}

function shouldIgnoreFile(direntName: string, ext: string) {
  return (
    !ext ||
    direntName.startsWith(".") ||
    direntName.endsWith(".config.ts") ||
    direntName.endsWith(".config.js") ||
    direntName.endsWith(".config.mjs") ||
    !ACCEPT_EXTS.has(ext)
    // || isGitIgnored(gitIgnoreSet, direntName)
  );
}

function shouldIgnoreFolder(direntName: string) {
  return (
    direntName.startsWith(".") || IGNORE_FOLDERS.has(direntName)
    // || isGitIgnored(gitIgnoreSet, direntName)
  );
}
