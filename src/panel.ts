import * as vscode from "vscode";
import path from "path";
import { genNonce } from "./extension";
import { MAX_LANGUAGES_TO_SHOW } from "./constants";
import { GlobalStateDirs } from "./GlobalStateDirs";

export default class MyPanel {
	panel: vscode.WebviewPanel | undefined;

	constructor() {}

	public showProjectsPanel(context: vscode.ExtensionContext) {
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.One);
			return;
		}

		// create new panel
		this.panel = vscode.window.createWebviewPanel(
			"localProjectDashboardPanel",
			"Local Project Dashboard",
			{ viewColumn: vscode.ViewColumn.One, preserveFocus: true },
			{
				retainContextWhenHidden: true,
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.file(path.join(context.extensionPath, "media")),
				],
			},
		);

		this.setupPanel(context, this.panel, false);
	}

	public setupPanel(
		context: vscode.ExtensionContext,
		panel: vscode.WebviewPanel,
		isRestored: boolean,
	) {
		this.panel = panel;

		this.panel.iconPath = {
			dark: vscode.Uri.joinPath(
				context.extensionUri,
				"media",
				"light-icon.svg",
			),
			light: vscode.Uri.joinPath(
				context.extensionUri,
				"media",
				"icon.svg",
			),
		};

		this.panel.onDidDispose(
			() => {
				this.panel = undefined;
			},
			null,
			context.subscriptions,
		);

		const baseUri = this.panel.webview
			.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "media"))
			.toString();

		if (isRestored) {
			setTimeout(() => {
				if (this.panel)
					this.panel.webview.html = this.getWebviewPanelHTML(
						this.panel.webview.cspSource,
						baseUri,
					);
			}, 0);
		} else {
			this.panel.webview.html = this.getWebviewPanelHTML(
				this.panel.webview.cspSource,
				baseUri,
			);
		}

		// receive message
		this.panel.webview.onDidReceiveMessage(
			async ({ name, data }: { name: string; data: any }) => {
				try {
					console.debug(
						`\nPanel Message "${name}" received with data: `,
						data,
						"\n",
					);

					if (name === "ready") {
						// send global state load message
						const dirs: GlobalStateDirs = context.globalState.get(
							"dirs",
							{},
						);
						if (dirs) {
							this.panel?.webview.postMessage({
								name: "globalStateLoad",
								data: dirs,
							});
						}
					} else if (name === "openProject") {
						const uri = vscode.Uri.file(path.join(...data));

						await vscode.commands.executeCommand(
							"vscode.openFolder",
							uri,
							{
								forceNewWindow: true,
							},
						);
					} else if (name === "openFolder") {
						const uri = vscode.Uri.file(path.join(...data));
						await vscode.env.openExternal(uri);
					} else if (name === "createFolder") {
						const base = data[0];

						const input = await vscode.window.showInputBox({
							title: "Create folder",
							placeHolder: "e.g. my-calculator-app",
							prompt: 'Creating folder inside "' + base + '"',
						});

						if (!input) return;

						const dirs = context.globalState.get<GlobalStateDirs>(
							"dirs",
							{},
						);

						try {
							if (input in dirs[base]) return;

							const uri = vscode.Uri.file(path.join(base, input));
							await vscode.workspace.fs.createDirectory(uri);
							// add to global state

							await context.globalState.update("dirs", {
								...dirs,
								[base]: {
									...dirs[base],
									[input]: {
										languages: {},
										framework: "",
										starred: false,
									},
								},
							});

							await panel?.webview.postMessage({
								name: "folderCreated",
								data: [base, input],
							});

							vscode.window.showInformationMessage(
								"Folder creation successful",
							);
						} catch (err) {
							console.error(err);
							await vscode.window.showErrorMessage(
								"Error creating folder",
							);
						}
					} else if (name === "toggleStar") {
						const dirs = context.globalState.get<GlobalStateDirs>(
							"dirs",
							{},
						);
						const [base, proj] = data as [string, string];
						if (!dirs[base] || !dirs[base][proj]) return;

						const wasStarred = dirs[base][proj].starred;

						await context.globalState.update("dirs", {
							...dirs,
							[base]: {
								...dirs[base],
								[proj]: {
									...dirs[base][proj],
									starred: !wasStarred,
								},
							},
						});

						await panel?.webview.postMessage({
							name: "starToggled",
							data: [base, proj, !wasStarred],
						});
					}
				} catch (err: any) {
					vscode.window.showErrorMessage("An error occurred");
					console.error(err);
				}
			},
		);
	}

	public getWebviewPanelHTML(cspSource: string, baseUri: string) {
		const nonce = genNonce();

		return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${cspSource}; img-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';
">
    <title>Local Project Dashboard</title>
    <link rel="stylesheet" href="${baseUri + "/panel.css"}" />
  </head>
  <body>
    <h1 class="top-heading">Local Project Dashboard</h1>

    <input
      type="text"
      id="search-proj-input"
      placeholder="Type to search"
     />

    <p class="msg-1">No project found. From sidebar, add directory where your projects live directly, then click load.</p>

    <section class="projects-section" id="starred-section">
      <div class="section-top">
        <h2 class="section-heading starred-section-heading">⭐ Starred</h2>
        <div class="section-top-btns"></div>
      </div>
      <p class="msg-2">No starred project found.</p>
      <div class="projects-wrapper">
        <div class="projects"></div>
      </div>
    </section>

    <main id="project-sections-container">
    </main>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        vscode.postMessage({ name: "ready" });

        const projectSectionsContainer = document.getElementById("project-sections-container")
        const starredProjectsDiv = document.querySelector('#starred-section .projects')

        let loadedData = {} // to reuse for both globalStateLoad and search filtering

        window.addEventListener("message", ({ data: { name, data } }) => {
            console.log(\`Panel Message "\${name}" with data:\`, data)
            try {
                // ----------------------------------------------
                if (name === 'globalStateLoad') {
                    loadedData = data
                    createProjectsUI()
                }

                // ----------------------------------------------
                else if (name === "starToggled") {
                    const [base, proj, isStarred] = data
                    loadedData[base][proj].starred = isStarred
                    const project = loadedData[base][proj]

                    // toggle starred class of original
                    const originalProjectArticle = document.querySelector(\`.projects-section[data-dir="\${CSS.escape(base)}"] .project[data-proj="\${CSS.escape(proj)}"]\`)
                    if (originalProjectArticle) {
                        originalProjectArticle.querySelector('.project-star-btn').classList.toggle('starred')
                        
                        if (isStarred) {
                            // new project article to add in starred section
                            const projectArticle = makeProjectArticle(project, base, proj)
                            starredProjectsDiv.prepend(projectArticle)
                        } else {
                            // remove from starred section
                            starredProjectsDiv.querySelector(\`.project[data-proj="\${CSS.escape(proj)}"][data-dir="\${CSS.escape(base)}"]\`).remove()
                        }
                    }
                // ----------------------------------------------
                } else if (name === "folderCreated") {
                    const project = { languages:{}, starred: false, framework: "" }
                    const [base, proj] = data
                    const article = makeProjectArticle(
                        project,
                        base,
                        proj
                    )

                    console.log('artic',article)

                    document.querySelector(\`.projects-section[data-dir="\${CSS.escape(base)}"] > .projects-wrapper > .projects\`).prepend(article)

                    loadedData[base][proj] = project
                }
            } catch (err) {
                console.error(err) 
            }
        })

        function createProjectsUI(query=null) {
            projectSectionsContainer.innerHTML = ''
            starredProjectsDiv.innerHTML = ''
            
            baseDirs = Object.keys(loadedData)
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

                // section top
                const sectionTop = document.createElement('div')
                sectionTop.className = 'section-top'
                const sectionHeading = document.createElement('h2')
                sectionHeading.className = 'section-heading'
                sectionHeading.textContent = baseDir

                sectionHeading.onclick = () => {
                    vscode.postMessage({ name: "openFolder", data: [baseDir] });
                }
                
                // create folder button
                const createFolderBtn = document.createElement('button')
                createFolderBtn.className = 'create-folder-btn'
                createFolderBtn.innerText = "+"

                createFolderBtn.onclick = () => {
                    vscode.postMessage({ name: "createFolder", data: [baseDir] })
                }
                
                // collapse button
                const collapseBtn = document.createElement('button')
                collapseBtn.className = 'collapse-btn'
                collapseBtn.innerHTML = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="122.88px" height="122.871px" viewBox="0 0 122.88 122.871" enable-background="new 0 0 122.88 122.871" xml:space="preserve"><g><path fill="currentColor" d="M122.88,35.775v9.529H81.515c-2.278,0-4.125-1.847-4.125-4.125V0h9.63v35.775H122.88L122.88,35.775z M35.499,0h9.63v41.118 c0,2.278-1.847,4.125-4.125,4.125H0v-9.644h35.499V0L35.499,0z M0,87.164v-9.598h40.942c2.277,0,4.125,1.846,4.125,4.125v41.18 h-9.633V87.164H0L0,87.164z M77.328,122.871V81.752c0-2.277,1.847-4.125,4.125-4.125h41.427v9.625H86.931 c0,12.338-0.003,23.271-0.003,35.619H77.328L77.328,122.871z"/></g></svg>'
            
                const projectsDivWrapper = document.createElement('div')
                projectsDivWrapper.className = 'projects-wrapper' // for grid collapse animation

                const projectsDiv = document.createElement('div')
                projectsDiv.className = 'projects'

                
                collapseBtn.onclick = (e) => {
                    projectsDivWrapper.classList.toggle('collapsed')
                }

                const sectionTopBtns = document.createElement('div')
                sectionTopBtns.className = 'section-top-btns'
                sectionTop.appendChild(sectionHeading)
                sectionTopBtns.appendChild(collapseBtn)
                sectionTopBtns.appendChild(createFolderBtn)
                sectionTop.appendChild(sectionTopBtns)
                section.appendChild(sectionTop)
                

                let projectNames = Object.keys(loadedData[baseDir])
                
                if (query) projectNames = projectNames.filter(n => n.includes(query))

                if (projectNames.length === 0) {
                    section.innerHTML += \`<p class="msg-2">No project found. Click "Scan" from sidebar after adding a directory.</p>\`;
                }

                projectNames.forEach((projectName) => {
                    const project = loadedData[baseDir][projectName]
                    const projectArticle = makeProjectArticle(project, baseDir, projectName)
                    projectsDiv.appendChild(projectArticle)

                    if (project.starred) {
                        const projectArticle = makeProjectArticle(project, baseDir, projectName)
                        starredProjectsDiv.appendChild(projectArticle);
                        atLeastOneStarred = true;
                    }
                });

                projectsDivWrapper.appendChild(projectsDiv)
                section.appendChild(projectsDivWrapper)
                projectSectionsContainer.appendChild(section);
            });

            if (!atLeastOneStarred) {
                document.querySelector('#starred-section .msg-2').style.display = 'block';
            } else {
                document.querySelector('#starred-section .msg-2').style.display = 'none';
            }
        }

        function makeProjectArticle(project, baseDir, projectName) {
            const projectArticle = document.createElement("article");
            projectArticle.className = "project";
            projectArticle.dataset.proj = projectName;
            projectArticle.dataset.dir = baseDir
            const iconPath = "${baseUri}" + "/" + (project.framework || 'folder-solid-full') + ".svg"
            projectArticle.innerHTML = \`
            <div class="project-head">
                <div class="project-head-heading">
                <img class="project-icon" width="20" src="\${iconPath}" alt="project icon"/>
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
                <button class="open-folder-btn"><img width="20" src="${baseUri}/folder-solid-full.svg"/></button>
                <button class="open-btn">Open</button>
            </div>
            \`;

            projectArticle.querySelector("h3").textContent = projectName;

            const languages = projectArticle.querySelector(".languages");


            const entries = Object.entries(project.languages);
            entries.sort((a, b) => b[1] - a[1]);
            for (let [key, value] of entries.slice(0, ${MAX_LANGUAGES_TO_SHOW})) {
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

            projectArticle.querySelector(".open-folder-btn").onclick = () => {
            vscode.postMessage({ name: "openFolder", data: [baseDir, projectName] });
            };

            return projectArticle;
        }

        // searching
        const searchInput = document.getElementById('search-proj-input');
        let timeout = null;
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (timeout) {
                clearTimeout(timeout)
            }
            
            timeout = setTimeout(() => {
                createProjectsUI(query)
            }, 330)
        })

    </script>
  </body>
</html>
`;
	}
}
