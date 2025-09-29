export function getWebviewHTML(
  cspSource: string,
  getUri: (file: string) => any
) {
  console.log("asdasdasd", getUri("styles.css"));

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource}; script-src ${cspSource} 'unsafe-inline';">
    <title>Local Project Opener</title>
    <link rel="stylesheet" href="${getUri("styles.css")}" />
  </head>
  <body>
    <h1>Local Project Opener</h1>

    <main class="project-sections-container">
      <section class="projects-section">
        <p>/abc/def/codes</p>
        <div class="projects">
          <div class="project">
            <div class="project-head">
              <div class="project-head-heading">
                <img src="${getUri(
                  "folder-solid-full.svg"
                )}" width="20" alt="folder" />
                <h3>OCR Technology</h3>
              </div>

              <div class="project-btns">
                <button class="project-edit-btn">
                  <img src="${getUri("pencil-solid-full.svg")}" alt="edit" />
                </button>
                <button class="project-star-btn">
                  <img src="${getUri("star-solid-full.svg")}" alt="star" />
                </button>
              </div>
            </div>
            <div class="languages">
              <div class="language">
                <div class="language-icon"></div>
                <p>60% ts</p>
              </div>

              <div class="language">
                <div class="language-icon"></div>
                <p>60% ts</p>
              </div>

              <div class="language">
                <div class="language-icon"></div>
                <p>60% ts</p>
              </div>
            </div>

            <div class="project-bottom">
              <button class="open-btn">Open</button>
            </div>
          </div>
        </div>
      </section>
    </main>
    <script src="${getUri("script.js")}"></script>
  </body>
</html>
`;
}
