import * as vscode from "vscode";
import { genNonce } from "./main";

export type GlobalStateDirs = Record<
  string,
  Record<
    string,
    {
      languages: Record<string, number>;
      starred: boolean;
    }
  >
>;

export class SidebarProvider implements vscode.WebviewViewProvider {
  public _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

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
        console.debug(`\n========== ${name} received`, data, '\n');
        if (name === "addDirectory") {
          const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Select Folder",
          });

          if (!result || result.length === 0) return;
          const oldDirs = this._context.globalState.get<GlobalStateDirs>(
            "dirs",
            {}
          );
          this._context.globalState.update("dirs", {
            ...oldDirs,
            [result[0].fsPath]: {},
          });

          this._view?.webview.postMessage({
            name: "directoryAdded",
            data: result[0].fsPath,
          });
        } else if (name === "removeDirectory") {
          const oldDirs = this._context.globalState.get<GlobalStateDirs>(
            "dirs",
            {}
          );
          await this._context.globalState.update("dirs", {
            ...oldDirs,
            [data]: undefined,
          });
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
        name: "globalStateLoad",
        data: Object.keys(this._context.globalState.get("dirs", {})),
      });
    }, 50);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = genNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline'">
    <title>Local Project Opener</title>
    <style nonce="${nonce}">
      * {margin: 0; padding: 0; box-sizing: border-box;}

      button {
        cursor: pointer;
        background: #1553ffff;
        padding: 10px 10px;
        color: white;
        border-radius: 5px;
        width: 100%;
        outline: none;
        border: none;

        &.remove-btn {
          font-size: 12px !important;
          padding: 5px !important;
          width: max-content !important;
        }
      }

      body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: 5px;
      
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: rgba(0,0,0,0.5);
          list-style: none;
          border-radius: 5px;
        }
      }
    </style>
  </head>
  <body>
    <button id="open-projects-btn">Show Projects</button>
    
    <hr>
    
    <h3>Base Directories</h3>
    <ul id="directories"></ul>
    <button id="add-btn">+ Add Base Directory</button>
    <button id="refresh-dirs-btn">Load/Refresh Projects</button>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();

      document.getElementById("add-btn").onclick = () => {
        vscode.postMessage({ name: "addDirectory" });
      };

      const ul = document.getElementById("directories");
      window.addEventListener("message", ({data: {name, data}}) => {
        if (name === "directoryAdded") {
          addDirectoryToUI(data);
        } else if (name === "directoryRemoved") {
          ul.querySelector(\`li[data-dir="\${CSS.escape(data)}"]\`)?.remove();
        } else if (name === "globalStateLoad") {
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
        button.className = "remove-btn";
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
