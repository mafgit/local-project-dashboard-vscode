
export const MAX_PROJECTS_IN_A_DIR = 60;
export const MAX_LANGUAGES_TO_SHOW = 10;
export const MAX_DIRENTS_TO_LOOP_OVER = 22;

export const IGNORE_FOLDERS = new Set([
  "venv",
  "node_modules",
  "build",
  "dist",
  "out",
  "target",
  "vendor",
  "env",
  "dist",
  "tmp",
  "__pycache__",
  "bin",
  "obj",
  // ".next",
  // ".git",
  // ".venv",
  // ".vscode",
  // ".idea",
]);

export const ACCEPT_EXTS = new Set([
  // html/css/js/ts
  ".html", ".css", ".js", ".jsx", ".tsx", ".ts", ".cjs", ".mjs", ".cts", ".mts", ".sass", ".scss", ".less",

  // framework
  ".vue", ".svelte", ".astro", ".dart", ".kt", ".kts",

  // python
  ".py", ".pyi",

  // c/cpp/cs
  ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh", ".hxx", ".cs",

  // php
  ".php", ".phtml",

  // ruby
  ".rb", /*".rake",*/

  // shell
  ".sh", ".bash", ".zsh",

  // other
  ".go", ".rs", ".swift", ".java", ".r",
]);
