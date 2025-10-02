import * as vscode from "vscode";
import path from "path";
import { genNonce } from "./main";
import { GlobalStateDirs } from "./sidebar";

export let panel: vscode.WebviewPanel | undefined;
let panelDisposed = false;

export function showProjectsPanel(context: vscode.ExtensionContext) {
  if (panel && !panelDisposed) {
    panel.reveal();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    "localProjectOpenerWebview",
    "LocalHub: Project Explorer",
    vscode.ViewColumn.One,
    {
      retainContextWhenHidden: true,
      enableScripts: true,
      // localResourceRoots: [
      //   vscode.Uri.file(path.join(context.extensionPath, "media")),
      // ],
    }
  );

  panel.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "media",
    "icon.png"
  );

  panel.onDidDispose(() => {
    panelDisposed = true;
    panel = undefined;
  });

  const getUri = (file: string) => {
    return panel?.webview
      .asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, "media", file))
      )
      .toString();
  };

  panel.webview.html = getWebviewPanelHTML(getUri);

  sendUpdateMessageToPanelUI(context, panel);

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
      } else if (name === "toggleStar") {
        const dirs = context.globalState.get<GlobalStateDirs>("dirs", {});
        const [base, proj] = data as [string, string];
        const starred = dirs[base][proj].starred;

        await context.globalState.update("dirs", {
          ...dirs,
          [base]: {
            ...dirs[base],
            [proj]: {
              ...dirs[base][proj],
              starred: !starred,
            },
          },
        });

        sendUpdateMessageToPanelUI(context, panel);
      }
    }
  );
}

function sendUpdateMessageToPanelUI(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel | undefined
) {
  const dirs: GlobalStateDirs = context.globalState.get("dirs", {});
  if (dirs) {
    panel?.webview.postMessage({
      name: "globalStateLoad",
      data: dirs,
    });
  }
}

export function getWebviewPanelHTML(getUri: (file: string) => any) {
  const nonce = genNonce();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource:; style-src vscode-resource: 'unsafe-inline'; script-src 'nonce-${nonce}';
">
    <title>LocalHub: Project Explorer</title>
    <link rel="stylesheet" href="${getUri("styles.css")}" />
  </head>
  <body>
    <h1>👋 Hello Coder. Welcome to LocalHub!</h1>

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
              section.innerHTML += \`<p class="msg-2">No project found yet. Click "Scan" from sidebar after adding a directory.</p>\`;
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
                    <button class="project-star-btn \${project.starred ? 'starred' : ''}">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free 7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="currentColor" d="M341.5 45.1C337.4 37.1 329.1 32 320.1 32C311.1 32 302.8 37.1 298.7 45.1L225.1 189.3L65.2 214.7C56.3 216.1 48.9 222.4 46.1 231C43.3 239.6 45.6 249 51.9 255.4L166.3 369.9L141.1 529.8C139.7 538.7 143.4 547.7 150.7 553C158 558.3 167.6 559.1 175.7 555L320.1 481.6L464.4 555C472.4 559.1 482.1 558.3 489.4 553C496.7 547.7 500.4 538.8 499 529.8L473.7 369.9L588.1 255.4C594.5 249 596.7 239.6 593.9 231C591.1 222.4 583.8 216.1 574.8 214.7L415 189.3L341.5 45.1z"/></svg>
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


              const entries = Object.entries(project.languages);
              entries.sort((a, b) => b[1] - a[1]);
              for (let [key, value] of entries) {
                languages.innerHTML += \`
                  <div class="language">
                  <div class="language-icon \${key.slice(1)}"></div>
                  <p>\${value.toFixed(1)}% \${key.slice(1)}</p>
                  </div>\`;
                }

              // todo: edit name

              article.querySelector('.project-star-btn').onclick = () => {
                vscode.postMessage({ name: "toggleStar", data: [key, projectKey] })
              }

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
