import path from "path";
import fs from "fs/promises";

export const ignoreFolders = new Set([
  "venv",
  "node_modules",
  "build",
  "dist",
  "out",
  "target",
  "vendor",
  "env",
  "__pycache__",
  "bin",
  "obj",
  // ".next",
  // ".git",
  // ".venv",
  // ".vscode",
  // ".idea",
]);

export const acceptExts = new Set([
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".cjs",
  ".mjs",
  ".mts",
  ".cts",
  ".py",
  ".pyi",
  ".java",
  ".groovy",
  ".c",
  ".cpp",
  ".cc",
  ".cxx",
  ".h",
  ".hpp",
  ".hh",
  ".hxx",
  ".cs",
  ".go",
  ".rs",
  ".php",
  ".phtml",
  ".rb",
  ".rake",
  ".swift",
  ".kt",
  ".kts",
  ".sh",
  ".bash",
  ".zsh",
  ".bat",
  ".cmd",
  ".asm",
  ".s",
  ".r",
  ".R",
]);

// sub-files check
export async function walkHelper(itemPath: string, depth = 4) {
  const extCount: Record<string, number> = {};
  let totalCount = 0;

  async function walk(itemPath: string, depth: number) {
    if (depth <= 1) return;

    try {
      const dirents = await fs.readdir(itemPath, {
        withFileTypes: true,
      });
      for (let dirent of dirents) {
        if (dirent.isFile()) {
          const ext = path.extname(dirent.name);
          if (
            !ext ||
            dirent.name.endsWith(".config.ts") ||
            dirent.name.endsWith(".config.js") ||
            dirent.name.endsWith(".config.mjs") ||
            !acceptExts.has(ext)
          )
            continue;

          // console.log("-> ", dirent.name);
          extCount[ext] = (extCount[ext] || 0) + 1;
          totalCount++;
        } else if (
          dirent.isDirectory() &&
          !dirent.name.startsWith(".") &&
          !ignoreFolders.has(dirent.name)
        ) {
          // console.log("Exploring ", dirent.name + "/");
          await walk(path.join(itemPath, dirent.name), depth - 1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  await walk(itemPath, depth);

  Object.entries(extCount).forEach(([key, value]) => {
    extCount[key] = totalCount > 0 ? (value * 100) / totalCount : 0;
  });
  return extCount;
}

// walkHelper("C:\\Users\\DC\\codes\\flights", 4).then((a) => console.log(a));
