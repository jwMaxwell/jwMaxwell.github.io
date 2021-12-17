let counter = 0;
document.getElementById('ico').addEventListener('dblclick', function (e) {
  if (++counter === 2) {
    counter = 0;
    document.getElementById('win').classList.remove('hide-win');
  }
})