(async () => {
  document.querySelector(".container").innerHTML =
    (await (await fetch("./home/dat.json")).json())
      .map(
        (p) =>
          `
          <div class="item">
            <div class="window">
              <div class="title-bar">
                <div class="title-bar-text">${p.title}</div>
                <div class="title-bar-controls"></div>
              </div>
              <div class="window-body">
                <a href="${p.filePath}"><img src="${p.filePath}/image.png"/></a>
                <p>${p.desc}</p>
              </div>
            </div>
          </div>
          `
      )
      .join("") +
    `
    <span class="item break"></span>
    <span class="item break"></span>
    <span class="item break"></span>
    `;
})();
