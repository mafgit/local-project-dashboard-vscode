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
            "localhub.showProjectsPanel"
          );
        } else if (name === "refreshProjects") {
          await vscode.commands.executeCommand(
            "localhub.refreshProjects"
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
    <title>LocalHub: Project Explorer</title>
    <style nonce="${nonce}">
      * {margin: 0; padding: 0; box-sizing: border-box;}

    
      button:hover {
        filter: brightness(90%);
      }
      
      button {
        cursor: pointer;
        padding: 8px;
        color: white;
        border-radius: 5px;
        width: 100%;
        outline: none;
        border: none;

        &.remove-btn {
          font-size: 18px;
          width: 20px;
          height: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #ff1e0077;
          width: max-content;
        }

        &#add-btn {
          background: #00c92bb6;
        }

        &#refresh-btn {
          background: #006dc7ff;
        }

        &#show-projects-btn {
          padding: 10px;
          background: linear-gradient(45deg, #9600dbff, #0079dbff);
        }
      }

      hr {
        border: none;
        border-top: 1px solid rgba(255,255,255,0.3);
        margin: 5px 5px;
        border-radius: 5px;
        width: 95%;
      }

      body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
        align-items: center;
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
      
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 4px;
          padding: 8px 5px;
          background: rgba(0,0,0,0.5);
          list-style: none;
          border-radius: 5px;
          width: 100%;
        }
      }

      h3, h4 {
        font-weight: normal;
      }

      .two-btns {
        display: flex;
        gap:4px;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        flex-wrap: wrap;

        button {
          flex: 1;
        }
      }
    </style>
  </head>
  <body>
    <h3 style="font-weight: bold;">LocalHub</h3>
    <p>View all your local projects in one place</p>
    <button id="show-projects-btn">Show Projects</button>
    
    <hr>
    
    <h4>Base Directories</h4>
    <p>Add a directory and load projects from it</p>
    <ul id="directories"></ul>
    <div class="two-btns">
      <button id="add-btn">+ Add</button>
      <button id="refresh-btn">Load/Refresh</button>
    </div>

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
        button.textContent = "-";
        button.className = "remove-btn";
        button.onclick = () => {
          vscode.postMessage({ name: "removeDirectory", data: dir });
        };

        li.appendChild(p);
        li.appendChild(button);
        ul.appendChild(li);
      }

      // -----------------------
      document.getElementById("show-projects-btn").onclick = () => {
        vscode.postMessage({ name: "showProjects" })
      }

      document.getElementById("refresh-btn").onclick = () => {
        vscode.postMessage({ name: "refreshProjects" })
      }
    </script>
  </body>
</html>
`;
  }
}
