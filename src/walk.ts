import path from "path";
import fs from "fs/promises";
import {
  ACCEPT_EXTS,
  IGNORE_FOLDERS,
  MAX_DIRENTS_TO_LOOP_OVER,
} from "./constants";

// sub-files check
export async function walkHelper(itemPath: string, depth = 4) {
  const extDist: Record<string, number> = {}; // probability distribution of file extensions used
  let totalCount = 0;
  const gitIgnoreSet = new Set<string>(); // todo: ...

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
        const direntNames = new Set(dirents.map((d) => d.name));

        if (direntNames.has("composer.json")) {
          if (direntNames.has("artisan") && direntNames.has("vendor")) {
            framework = "laravel";
          } else {
            framework = "php";
          }
        }

        if (direntNames.has("pubspec.yaml")) {
          framework = "flutter";
        } else if (direntNames.has("build.gradle.kts")) {
          framework = "kotlin";
        } else if (
          direntNames.has("build.gradle") ||
          direntNames.has("pom.xml")
        ) {
          framework = "java";
        } else if (direntNames.has("package.json")) {
          isNodeApp = true; // fallback

          if (direntNames.has("android") && direntNames.has("ios")) {
            framework = "react-native";
          } else if (
            direntNames.has("next.config.js") ||
            direntNames.has("next.config.ts") ||
            direntNames.has("next.config.mjs")
          ) {
            isNextApp = true;
            framework = "next";
          } else if (direntNames.has("angular.json")) {
            framework = "angular";
          } else if (
            direntNames.has("astro.config.mjs") ||
            direntNames.has("astro.config.js") ||
            direntNames.has("astro.config.ts")
          ) {
            framework = "astro";
          } else if (
            direntNames.has("nuxt.config.ts") ||
            direntNames.has("nuxt.config.js") ||
            direntNames.has("nuxt.config.mjs")
          ) {
            framework = "nuxt";
          } else if (
            direntNames.has("svelte.config.js") ||
            direntNames.has("svelte.config.ts")
          ) {
            framework = "svelte";
          }

          if (direntNames.has("tsconfig.json")) isTypescriptApp = true; // fallback
        } else if (
          direntNames.has("pyproject.toml") ||
          direntNames.has("requirements.txt")
        ) {
          isPythonApp = true;
          framework = "python";
        }
      }

      for (let dirent of dirents.slice(0, MAX_DIRENTS_TO_LOOP_OVER)) {
        if (dirent.isFile()) {
          const ext = path.extname(dirent.name).toLowerCase();
          if (shouldIgnoreFile(dirent.name, ext, gitIgnoreSet)) continue;
          // console.log("-> ", dirent.name);
          extDist[ext] = (extDist[ext] || 0) + 1;
          totalCount++;
        } else if (
          dirent.isDirectory() &&
          !shouldIgnoreFolder(dirent.name, gitIgnoreSet)
        ) {
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
    if (isNodeApp && extDist[".vue"] > 20) framework = "vue";
    else if (
      isNodeApp &&
      !isNextApp &&
      (extDist[".jsx"] > 10 || extDist[".tsx"] > 10)
    )
      framework = "react";
    else if (extDist[".html"] > 40) framework = "html";
    else if (extDist[".css"] > 40) framework = "css";
    else if (isNodeApp) framework = "node";
    else {
      if (isTypescriptApp && extDist[".ts"] > 40) framework = "typescript";
      else if (!isTypescriptApp && extDist[".js"] > 40)
        framework = "javascript";
      else if (extDist[".c"] > 40 || extDist[".h"] > 40) framework = "c";
      else if (extDist[".cpp"] > 40) framework = "cpp";
      else if (extDist[".cs"] > 40 || extDist[".csproj"] > 40) framework = "cs";
      else if (extDist[".java"] > 40) framework = "java";
      else if (extDist[".dart"] > 40) framework = "flutter";
      else if (extDist[".kt"] > 20 || extDist[".kts"] > 20)
        framework = "flutter";
      else if (extDist[".py"] > 20) framework = "python";
    }
  }

  return { extDist, framework };
}

function shouldIgnoreFile(
  direntName: string,
  ext: string,
  gitIgnoreSet: Set<string>
) {
  return (
    !ext ||
    direntName.startsWith(".") ||
    direntName.endsWith(".config.ts") ||
    direntName.endsWith(".config.js") ||
    direntName.endsWith(".config.mjs") ||
    !ACCEPT_EXTS.has(ext) ||
    isGitIgnored(gitIgnoreSet, direntName)
  );
}

function shouldIgnoreFolder(direntName: string, gitIgnoreSet: Set<string>) {
  return (
    direntName.startsWith(".") ||
    IGNORE_FOLDERS.has(direntName) ||
    isGitIgnored(gitIgnoreSet, direntName)
  );
}

// todo: the following
function isGitIgnored(gitIgnoreSet: Set<string>, dirent: string) {
  return false;
}

// walkHelper("C:\\Users\\DC\\codes\\flights", 4).then((a) => console.log(a));
