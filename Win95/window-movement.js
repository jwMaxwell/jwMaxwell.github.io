function dragElement(elmnt) {
  if (document.getElementById(elmnt.id + "h")) {
    document.getElementById(elmnt.id + "h").onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
   
    const x = e.clientX;
    const y = e.clientY;
    
    elmnt.style.left = `${x}px`;
    elmnt.style.top = `${y}px` ;
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

dragElement(document.getElementById("win"));