(async () => {
  document.querySelector('.container').innerHTML =
    (await (await fetch('./home/data.json')).json())
      .map(
        (p) =>
          `
           <dic class="item">
            <div class="window">
              <div class="title-bar">
                <div class="title-bar-text">${p.title}</div>
                <div class="title-bar-controls"></div>
              </div>
              <div class="window-body">
                <a href="${p.filePath}"><img src="${p.filePath}/image.png"/></a>
                <div class="desc">${p.desc}</div>
              </div>
            </div>
          </div>
           `
      )
      .join('') +
    `
    <span class="item break"></span>
    <span class="item break"></span>
    <span class="item break"></span>
    `;
})();