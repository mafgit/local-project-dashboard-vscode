import * as vscode from "vscode";
import path from "path";
import { genNonce } from "./main";
import { GlobalStateDirs } from "./sidebar";

export let panel: vscode.WebviewPanel | undefined;
// let panelDisposed = false;

export function showProjectsPanel(context: vscode.ExtensionContext) {
  if (panel /*&& !panelDisposed*/) {
    panel.reveal();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    "localProjectOpenerWebview",
    "LocalHub — Project Explorer",
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
    "icon.svg"
  );

  // panel.onDidDispose(() => {
  //   panelDisposed = true;
  //   panel = undefined;
  // });

  const getUri = (file: string) => {
    return panel!.webview
      .asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "media", file))
      .toString();
  };

  panel.webview.html = getWebviewPanelHTML(panel.webview.cspSource, getUri);

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
        if (!dirs[base] || !dirs[base][proj]) return;

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

export function getWebviewPanelHTML(
  cspSource: string,
  getUri: (file: string) => string
) {
  const nonce = genNonce();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';
">
    <title>LocalHub — Project Explorer</title>
    <link rel="stylesheet" href="${getUri("panel.css")}" />
  </head>
  <body>
    <h1 style="font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">👋 Welcome to LocalHub!</h1>

    <p class="msg-1">No project found. From sidebar, add directory wherein your projects live directly, then click load.</p>


    <section class="projects-section" id="starred-section">
      <h2 class="section-heading">Starred</h2>
      <p class="msg-2">No starred project found.</p>
      <div class="projects">
      </div>
    </section>
    
    <main id="project-sections-container">
    </main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      const projectSectionsContainer = document.getElementById("project-sections-container")
      const starredProjectsDiv = document.querySelector('#starred-section .projects')

      window.addEventListener("message", ({ data: { name, data } }) => {
        // console.log(name, data)
        if (name === 'globalStateLoad') {
          projectSectionsContainer.innerHTML = ''
          starredProjectsDiv.innerHTML = ''
          const baseDirs = Object.keys(data)
          
          if (baseDirs.length === 0) {
            document.querySelector('.msg-1').style.display = 'block';
            return;
          } else {
            document.querySelector('.msg-1').style.display = 'none';
          }

          let atLeastOneStarred = false
          baseDirs.forEach((baseDir) => {
            const section = document.createElement("section");
            section.className = "projects-section";
            section.dataset.dir = baseDir;

            section.innerHTML = \`<h2 class="section-heading">\${baseDir}</h2>\`;

            const projectsDiv = document.createElement('div')
            projectsDiv.className = 'projects'

            const projectNames = Object.keys(data[baseDir])
            if (projectNames.length === 0) {
              section.innerHTML += \`<p class="msg-2">No project found yet. Click "Scan" from sidebar after adding a directory.</p>\`;
            }
            projectNames.forEach((projectName) => {
              const project = data[baseDir][projectName]
              const projectArticle = makeProjectArticle(project, baseDir, projectName)
              projectsDiv.appendChild(projectArticle)
              section.appendChild(projectsDiv)

              if (project.starred) {
                const projectArticle = makeProjectArticle(project, baseDir, projectName)
                starredProjectsDiv.appendChild(projectArticle);
                atLeastOneStarred = true;
              }
            });

            projectSectionsContainer.appendChild(section);
          });

          if (!atLeastOneStarred) {
            document.querySelector('#starred-section .msg-2').style.display = 'block';
          } else {
            document.querySelector('#starred-section .msg-2').style.display = 'none';
          }
        }
      })

      function makeProjectArticle(project, baseDir, projectName) {
        const projectArticle = document.createElement("article");
        projectArticle.className = "project";
        projectArticle.dataset.dir = projectName;
        projectArticle.innerHTML = \`
          <div class="project-head">
            <div class="project-head-heading">
            <img width="20" src="${getUri("folder-solid-full.svg")}"/>
            <h3></h3>
            </div>

            <div class="project-btns">
              
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

        projectArticle.querySelector("h3").textContent = projectName;

        const languages = projectArticle.querySelector(".languages");


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

        projectArticle.querySelector('.project-star-btn').onclick = () => {
          vscode.postMessage({ name: "toggleStar", data: [baseDir, projectName] })
        }

        projectArticle.querySelector(".open-btn").onclick = () => {
          vscode.postMessage({ name: "openProject", data: [baseDir, projectName] });
        };

        return projectArticle;
      }
    </script>
  </body>
</html>
`;
}

/*
<button class="project-edit-btn">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free 7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="lightblue" d="M100.4 417.2C104.5 402.6 112.2 389.3 123 378.5L304.2 197.3L338.1 163.4C354.7 180 389.4 214.7 442.1 267.4L476 301.3L442.1 335.2L260.9 516.4C250.2 527.1 236.8 534.9 222.2 539L94.4 574.6C86.1 576.9 77.1 574.6 71 568.4C64.9 562.2 62.6 553.3 64.9 545L100.4 417.2zM156 413.5C151.6 418.2 148.4 423.9 146.7 430.1L122.6 517L209.5 492.9C215.9 491.1 221.7 487.8 226.5 483.2L155.9 413.5zM510 267.4C493.4 250.8 458.7 216.1 406 163.4L372 129.5C398.5 103 413.4 88.1 416.9 84.6C430.4 71 448.8 63.4 468 63.4C487.2 63.4 505.6 71 519.1 84.6L554.8 120.3C568.4 133.9 576 152.3 576 171.4C576 190.5 568.4 209 554.8 222.5C551.3 226 536.4 240.9 509.9 267.4z"/></svg>
</button>
*/
