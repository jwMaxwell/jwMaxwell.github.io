const { Network } = require("./network");
const fs = require("fs");

const print = (x, y) =>
  console.log(`${x} -> result: ${y.map(Math.round)}, actual: ${y}`);

const encode = (str, vocab) => str.split("").map((c) => vocab.indexOf(c));
const sigmoid = (x) => 1 / (1 + Math.exp(-x + 15));
const changeAt = (arr, index, val) => {
  arr[index] = val;
  return arr;
};

const run = () => {
  const text = fs.readFileSync("../input.txt", {
    encoding: "utf-8",
    flag: "r",
  });
  const vocab = Array.from(new Set(text)).sort();

  const trainingData = text
    .slice(0, 1001)
    .match(/.{1,30}/g)
    .slice(0, -1)
    .map((s) => encode(s, vocab))
    .map((a) => {
      return {
        input: a.slice(0, -1),
        output: changeAt(new Array(vocab.length).fill(0), a.slice(-1), 1),
      };
    });

  console.log(trainingData[0]);

  let network = new Network([
    trainingData[0].input.length,
    100,
    100,
    vocab.length,
  ]);
  network.train(trainingData, 3000);

  const translate = (out) => vocab[parseInt(out.map(Math.round).join(""), 2)];

  console.log(network.run(trainingData[0]));
};

run();
