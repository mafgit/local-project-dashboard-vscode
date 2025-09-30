import * as vscode from "vscode";
import { genNonce } from "./main";

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(public readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): Thenable<void> | void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._view?.webview.onDidReceiveMessage(
      async ({ name, data }: { name: string; data: any }) => {
        console.debug(`${name} received`);
        if (name === "addDirectory") {
          const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Select Folder",
          });

          if (!result || result.length === 0) return;
          // add to global state

          this._view?.webview.postMessage({
            name: "directoryAdded",
            data: result[0].fsPath,
          });
        } else if (name === "removeDirectory") {
          // remove from global state
          this._view?.webview.postMessage({
            name: "directoryRemoved",
            data,
          });
        } else if (name === "showProjects") {
          await vscode.commands.executeCommand(
            "local-project-opener.openProjectsView"
          );
        } else if (name === "refreshDirectories") {
          await vscode.commands.executeCommand(
            "local-project-opener.refreshDirectories"
          );
        }
      }
    );

    setTimeout(() => {
      this._view?.webview.postMessage({
        name: "directoriesLoaded",
        data: ["C:\\Users\\DC\\codes"],
      });
    }, 50);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = genNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
    <title>Local Project Opener</title>
  </head>
  <body>
    <button id="open-projects-btn">Show Projects</button>
    <button id="refresh-dirs-btn">Refresh Directories</button>
    
    <ul id="directories"></ul>
    <button id="add-btn">+ Add Base Directory</button>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      document.getElementById("add-btn").onclick = () => {
        vscode.postMessage({ name: "addDirectory" });
      };

      const ul = document.getElementById("directories");
      window.addEventListener("message", ({data: {name, data}}) => {
        if (name === "directoryAdded") {
          alert("directoryAdded received");
          addDirectoryToUI(data);
        } else if (name === "directoryRemoved") {
          alert("directoryRemoved received");
          ul.querySelector(\`li[data-dir="\${CSS.escape(data)}"]\`)?.remove();
        } else if (name === "directoriesLoaded") {
          alert("directoryLoaded received");
          ul.innerHTML = "";
          for (let dir of data) {
            addDirectoryToUI(dir);
          }
        }
      });

      function addDirectoryToUI(dir) {
        const li = document.createElement("li");
        li.dataset.dir = dir;

        const p = document.createElement("p");
        p.textContent = dir;
        
        const button = document.createElement("button");
        button.textContent = "Remove";
        button.onclick = () => {
          vscode.postMessage({ name: "removeDirectory", data: dir });
        };

        li.appendChild(p);
        li.appendChild(button);
        ul.appendChild(li);
      }

      // -----------------------
      document.getElementById("open-projects-btn").onclick = () => {
        vscode.postMessage({ name: "showProjects" })
      }

      document.getElementById("refresh-dirs-btn").onclick = () => {
        vscode.postMessage({ name: "refreshDirectories" })
      }
    </script>
  </body>
</html>
`;
  }
}
