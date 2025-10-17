import { Dirent } from "fs";

// detecting before getting extensions distribution, when we only have dirents
export function detectFrameworkBefore(dirents: Dirent[]) {
  let isNodeApp = false;
  let isPythonApp = false;
  let isTypescriptApp = false;
  let isNextApp = false;
  let framework = "";

  const direntNames = new Set(dirents.map((d) => d.name));

  if (direntNames.has("composer.json")) {
    if (direntNames.has("artisan") && direntNames.has("vendor")) {
      framework = "laravel";
    } else {
      framework = "php";
    }
  }

  if (!framework) {
    if (direntNames.has("pubspec.yaml")) {
      framework = "flutter";
    } else if (direntNames.has("build.gradle.kts")) {
      framework = "kotlin";
    } else if (direntNames.has("build.gradle") || direntNames.has("pom.xml")) {
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

  return { framework, isNodeApp, isPythonApp, isTypescriptApp, isNextApp };
}

// detecting after getting extensions distribution
export function detectFrameworkAfter({
  extDist,
  isNodeApp,
  isPythonApp,
  isTypescriptApp,
  isNextApp,
}: {
  extDist: Record<string, number>;
  isNodeApp: boolean;
  isPythonApp: boolean;
  isTypescriptApp: boolean;
  isNextApp: boolean;
}) {
  let framework = "";
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
    else if (!isTypescriptApp && extDist[".js"] > 40) framework = "javascript";
    else if (extDist[".c"] > 40 || extDist[".h"] > 40) framework = "c";
    else if (extDist[".cpp"] > 40) framework = "cpp";
    else if (extDist[".cs"] > 40 || extDist[".csproj"] > 40) framework = "cs";
    else if (extDist[".java"] > 40) framework = "java";
    else if (extDist[".dart"] > 40) framework = "flutter";
    else if (extDist[".kt"] > 20 || extDist[".kts"] > 20) framework = "flutter";
    else if (extDist[".py"] > 20) framework = "python";
  }

  return framework;
}
