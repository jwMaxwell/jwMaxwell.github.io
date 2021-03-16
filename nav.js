/*
 * <nav>
 *      <ul>
 *          <li class="navContainer">
 *              <a href="index.html" class="navItem">Home</a>
 *          </li>
 *          <li class="navContainer">
 *              <a href="projects.html" class="navItem">Projects</a>
 *          </li>
 *          <li class="navContainer">
 *              <a href="about.html" class="navItem">About me</a>
 *          </li>
 *      </ul>
 *  </nav>
 */
const body = document.getElementById('');

//adds nav
const nav = document.createElement('nav');
nav.setAttribute('id', 'nav');
body.appendChild(nav);

//adds list of nav containers
const navList = document.createElement('ul');
nav.appendChild(navList);

//adds home button
const homeBtn = document.createElement('li');
homeBtn.setAttribute('class', 'navContainer');
homeBtn.innerHTML = '<a href="index.html" class="navItem">Home</a>';
navList.appendChild(homeBtn);

//adds projects button
const projectsBtn = document.createElement('li');
projectsBtn.setAttribute('class', 'navContainer');
projectsBtn.innerHTML = '<a href="projects.html" class="navItem">Projects</a>';
navList.appendChild(projectsBtn);

//adds about button
const aboutBtn = document.createElement('li');
aboutBtn.setAttribute('class', 'navContainer');
aboutBtn.innerHTML = '<a href="about.html" class="navItem">About me</a>';
navList.appendChild(aboutBtn);

