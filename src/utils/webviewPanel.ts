import * as vscode from "vscode";
import path from "path";
import { genNonce } from "./main";

export function openProjectsView(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "localProjectOpenerWebview",
    "Local Project Opener",
    vscode.ViewColumn.One,
    {
      retainContextWhenHidden: false,
      enableScripts: true,
      // localResourceRoots: [
      //   vscode.Uri.file(path.join(context.extensionPath, "src", "media")),
      // ],
    }
  );

  const getUri = (file: string) => {
    return panel.webview
      .asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, "src", "media", file))
      )
      .toString();
  };

  panel.webview.html = getWebviewPanelHTML(panel.webview.cspSource, getUri);
}

export function getWebviewPanelHTML(
  cspSource: string,
  getUri: (file: string) => any
) {
  const nonce = genNonce()

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource}; script-src 'nonce-${nonce}'">
    <title>Local Project Opener</title>
    <link rel="stylesheet" href="${getUri("styles.css")}" />
  </head>
  <body>
    <h1>Local Project Opener</h1>

    <main id="project-sections-container">
    </main>
    <script nonce="${nonce}">
      // const vscode = acquireVsCodeApi();

const data = {
  dirs: {
    "asd/bsd/csd": [
      {
        name: "Project 1",
        languages: { ".ts": 60, ".css": 40 },
        starred: false,
      },
      {
        name: "Project 1",
        languages: { ".ts": 60, ".css": 40 },
        starred: true,
      },
    ],
  },
};

const projectSectionsContainer = document.getElementById("project-sections-container")
projectSectionsContainer.innerHTML = ''

Object.keys(data.dirs).forEach((key) => {
  const section = document.createElement("section");
  section.className = "projects-section";
  section.dataset.dir = key;

  section.innerHTML = \`<p>\${CSS.escape(key)}</p>\`;

  const projects = document.createElement('div')
  projects.className = 'projects'

  data.dirs[key].forEach((project) => {
    const article = document.createElement("article");
    article.className = "project";
    article.dataset.dir = project.name;
    article.innerHTML = \`
      <div class="project-head">
        <div class="project-head-heading">
          <img src="${getUri('folder-solid-full.svg')}" width="20" alt="folder" />
          <h3></h3>
        </div>

        <div class="project-btns">
          <button class="project-edit-btn">
            <img src="${getUri('pencil-solid-full.svg')}" alt="edit" />
          </button>
          <button class="project-star-btn">
            <img src="${getUri('star-solid-full.svg')}" alt="star" />
          </button>
        </div>
      </div>

      <div class="languages"></div>

      <div class="project-bottom">
        <button class="open-btn">Open</button>
      </div>
    \`;

    article.querySelector("h3").textContent = project.name;

    const languages = article.querySelector(".languages");
    Object.keys(project.languages).forEach((lang) => {
      languages.innerHTML += \`
        <div class="language">
          <div class="language-icon"></div>
          <p>\${project.languages[lang]}% \${lang}</p>
        </div>\`;
    });

    // todo: star
    // todo: edit name


    article.querySelector(".open-btn").onclick = () => {
      vscode.postMessage({ name: "openProject", data: [key, project.name] });
    };

    projects.appendChild(article)
    section.appendChild(projects)
    
  });

  projectSectionsContainer.appendChild(section);
});

    </script>
  </body>
</html>
`;
}
