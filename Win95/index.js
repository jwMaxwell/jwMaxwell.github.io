var C = document.getElementById('myCanvas'),
  WIDTH = (C.width = 900),
  HEIGHT = (C.height = 600),
  canvas = C.getContext('2d');

var speed = 0.3,
  turnSpeed = 0.1,
  friction = 0.03,
  enemySpeed = 100000,
  maxEnemySpeed = 3,
  badGuyRad = 10,
  addShields = 100,
  enemyDamage = 3,
  enemyFlameSize = 1,
  startingShields = 10,
  youRad = 10,
  shieldRad = 20;

var you,
  key = {},
  badGuys,
  candy,
  youDead;

var gold = {
    img: new Image(),
    x: -25,
    y: -10
  },
  fish = {
    img: new Image(),
    x: -15,
    y: -15
  },
  bubbles = {
    img: new Image(),
    x: -40,
    y: -15
  },
  enemy = {
    img: new Image(),
    x: -25,
    y: -15
  };

gold.img.src = 'gold.png';
fish.img.src = 'fish.png';
bubbles.img.src = 'bubbles.png';
enemy.img.src = 'enemy.png';

window.onkeydown = window.onkeyup = function(e) {
  key[{37: 'left', 38: 'up', 39: 'right'}[e.keyCode]] = e.type == 'keydown';
  if (youDead) {
    reset();
    loop();
  }
};

function sqDist(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

function reset() {
  you = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    a: -Math.PI / 1,
    xs: 0,
    ys: 0,
    shields: startingShields
  };
  candy = {
    x: WIDTH * Math.random(),
    y: HEIGHT * Math.random()
  };
  badGuys = [];
  youDead = false;
}

function loop() {
  if (!youDead) window.requestAnimationFrame(loop);

  if (key.left) you.a -= turnSpeed;
  if (key.right) you.a += turnSpeed;

  if (key.up) {
    you.xs += speed * Math.cos(you.a);
    you.ys += speed * Math.sin(you.a);
  }

  you.x += you.xs;
  you.y += you.ys;

  you.xs *= 1 - friction;
  you.ys *= 1 - friction;

  if (you.x < 0) {
    you.x = 0;
    you.xs *= -1;
  } else if (you.x > WIDTH) {
    you.x = WIDTH;
    you.xs *= -1;
  }
  if (you.y < 0) {
    you.y = 0;
    you.ys *= -1;
  } else if (you.y > HEIGHT) {
    you.y = HEIGHT;
    you.ys *= -1;
  }

  if (sqDist(you, candy) < youRad * youRad * 4) {
    candy.x = Math.random() * WIDTH;
    candy.y = Math.random() * HEIGHT;

    badGuys.push({
      x: Math.random() * WIDTH,
      y: you.y < HEIGHT / 2 ? HEIGHT + badGuyRad : -badGuyRad
    });

    you.shields += addShields / Math.max(you.shields, startingShields);
  }

  canvas.clearRect(0, 0, WIDTH, HEIGHT);
  canvas.save();
  canvas.translate(you.x, you.y);

  if (you.shields) {
    canvas.strokeStyle = 'rgba(0,255,255,0.3)';
    canvas.lineWIDTHidth = you.shields / 3;
    canvas.beginPath();
    canvas.arc(0, 0, shieldRad, 0, Math.PI * 2);
    canvas.stroke();
  }

  canvas.rotate(you.a);
  if (key.up) {
    canvas.save();
    canvas.translate(Math.random() * -10, 0);
    canvas.rotate((Math.random() - 0.5) / 10);
    canvas.drawImage(bubbles.img, bubbles.x, bubbles.y, 35, 35);
    canvas.restore();
  }
  canvas.drawImage(fish.img, fish.x, fish.y, 35, 35);
  canvas.restore();

  for (var i = 0; i < badGuys.length; i++) {
    var b = badGuys[i],
      s = sqDist(you, b),
      d = Math.min(maxEnemySpeed, enemySpeed / s),
      a = Math.atan2(you.y - b.y, you.x - b.x),
      flameScale =
        (d / maxEnemySpeed) * (0.9 + 0.1 * Math.random()) * enemyFlameSize;

    b.x += d * Math.cos(a);
    b.y += d * Math.sin(a);

    canvas.save();
    canvas.translate(b.x, b.y);
    canvas.rotate(a);

    canvas.scale(-1,1);
    canvas.drawImage(enemy.img, enemy.x, enemy.y, 35, 35);
    canvas.setTransform(1,0,0,1,0,0);
    
    canvas.scale(flameScale, flameScale);
    canvas.drawImage(bubbles.img, bubbles.x, bubbles.y, 35, 35);
    canvas.restore();

    if (you.shields && s < shieldRad * shieldRad + badGuyRad * badGuyRad) {
      you.shields = Math.max(0, you.shields - enemyDamage);
      b.x = you.x - (shieldRad + badGuyRad) * Math.cos(a);
      b.y = you.y - (shieldRad + badGuyRad) * Math.sin(a);
    } else if (s < youRad * youRad) youDead = true;
  }

  canvas.drawImage(
    gold.img,
    candy.x + gold.x,
    candy.y + gold.y, 
    15, 
    15
  );

  if (youDead) {
    canvas.fillStyle = 'red';
    canvas.font = '50px Impact';
    canvas.textAlign = 'center';
    canvas.textBaseline = 'middle';
    canvas.fillText(`YOU DROWNED`, WIDTH / 2, HEIGHT / 2);

    canvas.fillStyle = 'red';
    canvas.font = '25px Impact';
    canvas.textAlign = 'center';
    canvas.textBaseline = 'middle';
    canvas.fillText(`score: ${badGuys.length}`, WIDTH / 2, HEIGHT / 2 + 60);
    
  }
}

reset();
loop();