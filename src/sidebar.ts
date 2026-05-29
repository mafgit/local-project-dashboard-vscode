import * as vscode from "vscode";
import { GlobalStateDirs } from "./GlobalStateDirs";
import { genNonce } from "./extension";
import type MyPanel from "./panel";

export class MySidebarProvider implements vscode.WebviewViewProvider {
	public view?: vscode.WebviewView;
	private context: vscode.ExtensionContext;
	myPanel: MyPanel;

	constructor(context: vscode.ExtensionContext, myPanel: MyPanel) {
		this.context = context;
		this.myPanel = myPanel;
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	): Thenable<void> | void {
		webviewView.webview.options = {
			enableScripts: true,
		};

		webviewView.webview.html = this.getSidebarHTML();

		this.view = webviewView;

		this.view.webview.postMessage({
			name: "globalStateLoad",
			data: Object.keys(this.context.globalState.get("dirs", {})),
		});

		this.view.onDidChangeVisibility(() => {
			if (this.view?.visible) {
				this.view?.webview.postMessage({
					name: "globalStateLoad",
					data: Object.keys(this.context.globalState.get("dirs", {})),
				});
			}
		});

		this.view.webview.onDidReceiveMessage(
			async ({ name, data }: { name: string; data: any }) => {
				console.debug(`\n========== ${name} received`, data, "\n");
				if (name === "addDirectory") {
					const result = await vscode.window.showOpenDialog({
						canSelectFiles: false,
						canSelectFolders: true,
						canSelectMany: false,
						openLabel: "Select Folder",
					});

					if (!result || result.length === 0) return;
					const oldDirs =
						this.context.globalState.get<GlobalStateDirs>(
							"dirs",
							{},
						);
					this.context.globalState.update("dirs", {
						...oldDirs,
						[result[0].fsPath]: {},
					});

					this.view?.webview.postMessage({
						name: "directoryAdded",
						data: result[0].fsPath,
					});
				} else if (name === "removeDirectory") {
					const oldDirs =
						this.context.globalState.get<GlobalStateDirs>(
							"dirs",
							{},
						);
					await this.context.globalState.update("dirs", {
						...oldDirs,
						[data]: undefined,
					});
					this.view?.webview.postMessage({
						name: "directoryRemoved",
						data,
					});
				} else if (name === "showProjects") {
					await vscode.commands.executeCommand(
						"localProjectDashboard.showProjectsPanel",
					);
				} else if (name === "refreshProjects") {
					await vscode.commands.executeCommand(
						"localProjectDashboard.refreshProjects",
					);
					this.myPanel.panel?.webview.postMessage({
						name: "globalStateLoad",
						data: this.context.globalState.get("dirs", {}),
					});
				}
			},
		);
	}

	private getSidebarHTML() {
		const nonce = genNonce();

		return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline'">
    <title>Local Project Dashboard</title>
    <style nonce="${nonce}">
      * {margin: 0; padding: 0; box-sizing: border-box;}

      body.vscode-light {
        --hr-color: rgba(0, 0, 0, 0.22);
        --li-bg: rgba(56, 56, 56, 0.13);
      }
      
      body.vscode-dark {
        --hr-color: rgba(255,255,255,0.3);
        --li-bg: rgba(223, 223, 223, 0.13);
      }

      button:hover {
        filter: brightness(90%);
      }
      
      button {
        cursor: pointer;
        padding: 8px;
        color: white;
        border-radius: 3px;
        width: 100%;
        display: flex;
        justify-content: center;
        gap: 4px;
        align-items: center;
        outline: none;
        border: none;

        &.remove-btn {
          font-size: 16px;
          width: 18px;
          height: 18px;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #ff1e00ad;
        }

        &#add-btn {
          background: #006dc7ff;
          font-size: 13px;
          padding: 8px 6px;
        }
          
        &#refresh-btn {
          background: #00ac25ff;
          font-size: 13px;
          padding: 8px 6px;
        }

        &#show-projects-btn {
          padding: 10px;
          margin-top: auto;
          gap: 10px;
          font-size: 14px;
          background: linear-gradient(45deg, #9600dbff, #0079dbff);
        }
      }

      hr {
        border: 1px solid var(--hr-color);
        margin: 8px 5px;
        border-radius: 3px;
        width: 95%;
      }

      h3, h4 {
        text-align: center;
      }

      body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 13px;
        align-items: center;
        min-height: 100vh;
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
        margin: 10px 0;
      
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 4px;
          padding: 8px;
          background: var(--li-bg);
          list-style: none;
          border-radius: 3px;
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
          height: 30px;
        }

        button:nth-child(1) {
          flex: 1;
        }

        button:nth-child(2) {
          flex: 2;
        }
      }
    </style>
  </head>
  <body>
    <!--<h3 style="font-weight: bold;">Local Project Dashboard</h3>-->
    <!--<p style="text-align: center;">View all your local projects in one place</p>-->
    
    <h4>BASE DIRECTORIES</h4>
    <p style="text-align: center; font-size: 12px; opacity: 0.8;">Parent directories where your projects live</p>
    <ul id="directories"></ul>
    <div class="two-btns">
      <button id="add-btn"><svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="white" d="M576 448C576 483.3 547.3 512 512 512L128 512C92.7 512 64 483.3 64 448L64 160C64 124.7 92.7 96 128 96L266.7 96C280.5 96 294 100.5 305.1 108.8L343.5 137.6C349 141.8 355.8 144 362.7 144L512 144C547.3 144 576 172.7 576 208L576 448zM320 224C306.7 224 296 234.7 296 248L296 296L248 296C234.7 296 224 306.7 224 320C224 333.3 234.7 344 248 344L296 344L296 392C296 405.3 306.7 416 320 416C333.3 416 344 405.3 344 392L344 344L392 344C405.3 344 416 333.3 416 320C416 306.7 405.3 296 392 296L344 296L344 248C344 234.7 333.3 224 320 224z"/></svg><span>Add</span></button>
      <button id="refresh-btn">
        <svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="white" d="M208 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm0 416a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM48 208a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm368 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM75 369.1A48 48 0 1 1 142.9 437 48 48 0 1 1 75 369.1zM75 75A48 48 0 1 1 142.9 142.9 48 48 0 1 1 75 75zM437 369.1A48 48 0 1 1 369.1 437 48 48 0 1 1 437 369.1z"/></svg>
        <span>Scan/Refresh</span>
      </button>
    </div>

    <!--<hr>-->

    <button id="show-projects-btn"><svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="white" d="M88 96c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0zM280 224l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40zm192 0l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40zm0 192l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40zM280 288c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0zM88 416l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40z"/></svg><span>Show Dashboard</span></button>
    <p style="text-align: center; font-size: 12px; opacity: 0.8;">You can change startup preference from settings</p>
    

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
        button.textContent = "−";
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
