const elmnt = document.getElementById('myCanvas');
const page = {
  width: (elmnt.width = 900),
  height: (elmnt.height = 600),
  canvas = elmnt.getContext('2d')
};

const consts = {
  playerSpeed = 0.3,
  turnSpeed = 0.1,
  friction = 0.03,
  enemySpeed = 100000,
  maxEnemySpeed = 3,
  enemyRadius = 10,
  shieldBonus = 2,
  enemyDamage = 3,
  enemyBubbleSize = 1,
  startingShields = 10,
  playerRadius = 10,
  shieldRadius = 20
}

let player
let gold;
const enemies = [];
let key;
window.onkeydown = window.onkeyup = (e) => {
  key[{37: 'left', 38: 'up', 39: 'right'}[e.keyCode]] = e.type == 'keydown';
};

const resetGold = () => 
  gold = {
    x: page.width * Math.random(),
    y: page.height * Math.random(),
    draw: {
      img: (new Image(35, 35).src = 'gold.png'),
      x: -25,
      y: -10
    }
  }

const reset = () => {
  player = {
    x: page.width / 2,
    y: page.height / 2,
    angle: -Math.PI / 1,
    acc: {x: 0, y: 0},
    draw: {
      img: (new Image(35, 35).src = 'fish.png'),
      x: -40,
      y: -15
    },
    shields: startingShields
  }

  resetGold();

  enemies = [];
}

const turn = () => {
  if (key.left)
    player.angle -= consts.turnSpeed;
  if (key.right)
    player.angle += consts.turnSpeed;
}

const bounding = () => {
  if (player.x < 0) {
    player.x = 0;
    player.acc.x *= -1;
  } else if (player.x > page.width) {
    player.x = page.width;
    player.acc.x *= -1;
  }
  if (player.y < 0) {
    player.y = 0;
    player.acc.x *= -1;
  } else if (player.y > page.height) {
    player.y = page.height;
    player.acc.x *= -1;
  }
}

const move = () => {
  if (key.up) {
    player.acc.x += consts.playerSpeed * Math.cos(player.angle);
    player.acc.y += consts.playerSpeed * Math.sin(player.angle);

    page.canvas.save();
    page.canvas.translate(Math.random() * -10, 0);
    page.canvas.rotate((Math.random() - 0.5) / 10);
    page.canvas.drawImage(bubbles.draw.img, bubbles.x, bubbles.y, 35, 35);
    page.canvas.restore();
  }

  player.x += you.xs;
  player.y += you.ys;

  player.acc.x *= 1 - consts.friction;
  player.acc.y *= 1 - consts.friction;
  bounding();
}

const gameOver = () => {
  page.canvas.fillStyle = 'red';
  page.canvas.font = '50px Impact';
  page.canvas.textAlign = 'center';
  page.canvas.textBaseline = 'middle';
  page.canvas.fillText(`YOU DROWNED`, page.width / 2, page.height / 2);

  page.canvas.fillStyle = 'red';
  page.canvas.font = '25px Impact';
  page.canvas.textAlign = 'center';
  page.canvas.textBaseline = 'middle';
  page.canvas.fillText(`score: ${badGuys.length}`, 
    page.width / 2,
    page.height / 2 + 60);
}

const dist = (a, b) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
const onTouch = () => {
  if (dist(player, gold) < consts.playerRadius ** 2 * 4) {
    resetGold();
    enemies.push({
      x: Math.random() * page.width,
      y: player.y < page.height / 2 
        ? page.height + consts.enemyRadius 
        : -consts.enemyRadius
    });
    player.shields += consts.addShields;
  }
  for (const n of enemies) {
    if (player.shields && 
          dist < consts.shieldRad ** 2 + consts.enemyRadius ** 2) {
      const a = Math.atan2(you.y - n.y, you.x - n.x);
      player.shields = Math.max(0, player.shields - consts.enemyDamage);
      n.x = you.x - (consts.shieldRadius + consts.enemyRadius) * Math.cos(a);
      n.y = you.y - (consts.shieldRadius + consts.enemyRadius) * Math.sin(a);
    } else if (sqDist(player, n) < consts.playerRadius ** 2) gameOver();
  }
}

const drawSheilds = () => {
  page.canvas.strokeStyle = 'rgba(0,255,255,0.3)';
  page.canvas.lineWIDTHidth = player.shields / 3;
  page.canvas.beginPath();
  page.canvas.arc(0, 0, consts.shieldRad, 0, Math.PI * 2);
  page.canvas.stroke();
}

const drawEnemies = () => {
  for (const n of enemies) {
    const dist = sqDist(player, n);
    const d = Math.min(maxEnemySpeed, enemySpeed / dist);
    const a = Math.atan2(you.y - n.y, you.x - n.x);

    n.x += d * Math.cos(a);
    n.y += d * Math.sin(a);

    canvas.save();
    canvas.translate(n.x, n.y);
    canvas.rotate(a);

    canvas.scale(-1,1);
    canvas.drawImage(enemy.img, enemy.x, enemy.y, 35, 35);
    canvas.setTransform(1,0,0,1,0,0);
    
    bubbleScale =
        (d / consts.maxEnemySpeed) 
          * (0.9 + 0.1 * Math.random()) 
          * consts.enemyBubbleSize;
    canvas.scale(consts.bubbleScale, consts.bubbleScale);
    canvas.drawImage(bubbles.img, bubbles.x, bubbles.y, 35, 35);
    canvas.restore();
  }
}

const draw = () => {
  turn();
  move();
  onTouch();
  
  page.canvas.clearRect(0, 0, page.width, page.height);
  page.canvas.save();
  page.canvas.translate(player.x, player.y);
  if (player.shields)
    drawSheilds();

  page.canvas.rotate(player.angle);
  page.canvas.drawImage(player.draw.img, fish.draw.x, fish.draw.y, 35, 35);
  page.canvas.restore();

  page.canvas.drawImage(
    gold.img,
    candy.x + gold.x,
    candy.y + gold.y, 
    15, 
    15
  );
}


reset();
draw();