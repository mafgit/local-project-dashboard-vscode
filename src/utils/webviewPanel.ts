import * as vscode from "vscode";
import path from "path";
import { genNonce } from "./main";
import { GlobalStateDirs } from "./sidebarProvider";

export function showProjectsPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "localProjectOpenerWebview",
    "LocalHub",
    vscode.ViewColumn.One,
    {
      retainContextWhenHidden: false,
      enableScripts: true,
      // localResourceRoots: [
      //   vscode.Uri.file(path.join(context.extensionPath, "media")),
      // ],
    }
  );

  panel.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "src",
    "media",
    "icon.svg"
  );

  const getUri = (file: string) => {
    return panel.webview
      .asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, "media", file))
      )
      .toString();
  };

  panel.webview.html = getWebviewPanelHTML(getUri);

  const dirs: GlobalStateDirs = context.globalState.get("dirs", {});
  console.log(dirs);

  if (dirs) {
    panel.webview.postMessage({
      name: "globalStateLoad",
      data: dirs,
    });
  }

  // receive message
  panel.webview.onDidReceiveMessage(
    async ({ name, data }: { name: string; data: any }) => {
      if (name === "openProject") {
        await vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(path.join(...data)),
          {
            forceNewWindow: true,
          }
        );
      }
    }
  );
}

export function getWebviewPanelHTML(getUri: (file: string) => any) {
  const nonce = genNonce();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource:; style-src vscode-resource: 'unsafe-inline'; script-src 'nonce-${nonce}';
">
    <title>LocalHub</title>
    <link rel="stylesheet" href="${getUri("styles.css")}" />
  </head>
  <body>
    <h1>LocalHub</h1>

    <p class="msg-1">No project found. From sidebar, add directory wherein your projects live directly, then click load.</p>

    <main id="project-sections-container">
    </main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      const projectSectionsContainer = document.getElementById("project-sections-container")
      window.addEventListener("message", ({ data: { name, data } }) => {
        console.log(name, data)
        if (name === 'globalStateLoad') {
          projectSectionsContainer.innerHTML = ''
          const baseDirs = Object.keys(data)
          if (baseDirs.length === 0) {
            document.querySelector('.msg-1').style.display = 'block';
            return;
          } else {
            document.querySelector('.msg-1').style.display = 'none';
          }
          baseDirs.forEach((key) => { // key = base dir
            const section = document.createElement("section");
            section.className = "projects-section";
            section.dataset.dir = key;

            section.innerHTML = \`<h2 class="section-heading">\${key}</h2>\`;

            const projects = document.createElement('div')
            projects.className = 'projects'

            const projectNames = Object.keys(data[key])
            if (projectNames.length === 0) {
              section.innerHTML += \`<p class="msg-2">No project found here. You might have forgotten to load/refresh from sidebar after adding it.</p>\`;
            }
            projectNames.forEach((projectKey) => { // projectKey = project name
              const article = document.createElement("article");
              const project = data[key][projectKey]
              article.className = "project";
              article.dataset.dir = projectKey;
              article.innerHTML = \`
                <div class="project-head">
                  <div class="project-head-heading">
                    <img src="${getUri(
                      "folder-solid-full.svg"
                    )}" width="20" alt="folder" />
                    <h3></h3>
                  </div>

                  <div class="project-btns">
                    <!-- <button class="project-edit-btn">
                      <img src="${getUri(
                        "pencil-solid-full.svg"
                      )}" alt="edit" />
                    </button> -->
                    <button class="project-star-btn">
                      <img src="${getUri("star-solid-full.svg")}" alt="star" />
                    </button>
                  </div>
                </div>

                <div class="languages"></div>

                <div class="project-bottom">
                  <button class="open-btn">Open</button>
                </div>
              \`;

              article.querySelector("h3").textContent = projectKey;

              const languages = article.querySelector(".languages");
              Object.keys(project.languages).forEach((lang) => {
                languages.innerHTML += \`
                  <div class="language">
                    <div class="language-icon \${lang.slice(1)}"></div>
                    <p>\${project.languages[lang].toFixed(1)}% \${lang.slice(1)}</p>
                  </div>\`;
              });

              // todo: star
              // todo: edit name


              article.querySelector(".open-btn").onclick = () => {
                vscode.postMessage({ name: "openProject", data: [key, projectKey] });
              };

              projects.appendChild(article)
              section.appendChild(projects)
              
            });

            projectSectionsContainer.appendChild(section);
          });
        }
      })
      
    </script>
  </body>
</html>
`;
}
