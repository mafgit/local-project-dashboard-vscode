import path from "path";
import fs from "fs/promises";

// sub-files check
export async function walkHelper(itemPath: string, depth = 4) {
  const extDist: Record<string, number> = {}; // probability distribution of file extensions used
  let totalCount = 0;
  const gitIgnoreSet = new Set<string>(); // todo: ...

  async function walk(itemPath: string, depth: number) {
    if (depth <= 1) return;

    try {
      const dirents = await fs.readdir(itemPath, {
        withFileTypes: true,
      });
      for (let dirent of dirents) {
        if (dirent.isFile()) {
          const ext = path.extname(dirent.name);
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
  return extDist;
}

function shouldIgnoreFile(
  direntName: string,
  ext: string,
  gitIgnoreSet: Set<string>
) {
  return (
    !ext ||
    direntName.endsWith(".config.ts") ||
    direntName.endsWith(".config.js") ||
    direntName.endsWith(".config.mjs") ||
    !acceptExts.has(ext) ||
    isGitIgnored(gitIgnoreSet, direntName)
  );
}

function shouldIgnoreFolder(direntName: string, gitIgnoreSet: Set<string>) {
  return (
    direntName.startsWith(".") ||
    ignoreFolders.has(direntName) ||
    isGitIgnored(gitIgnoreSet, direntName)
  );
}

// todo: the following
function isGitIgnored(gitIgnoreSet: Set<string>, dirent: string) {
  return false;
}

// walkHelper("C:\\Users\\DC\\codes\\flights", 4).then((a) => console.log(a));

// todo: optimize
// todo: for py library folder, depth is insufficient

const ignoreFolders = new Set([
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

const acceptExts = new Set([
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
