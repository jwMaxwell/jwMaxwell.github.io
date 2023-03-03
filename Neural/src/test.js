// import { Network } from "./network.js";
const { Network } = require("./network");

const trainingData = [
  {
    input: [0, 0, 0],
    output: [0],
  },
  {
    input: [0, 0, 1],
    output: [1],
  },
  {
    input: [0, 1, 0],
    output: [1],
  },
  {
    input: [0, 1, 1],
    output: [0],
  },
  {
    input: [1, 0, 0],
    output: [1],
  },
  {
    input: [1, 0, 1],
    output: [0],
  },
  {
    input: [1, 1, 0],
    output: [0],
  },
  {
    input: [1, 1, 1],
    output: [1],
  },
];

const print = (x, y) =>
  console.log(`${x} -> result: ${Math.round(y)}, actual: ${y}`);
const run = () => {
  let network1 = new Network([3, 15, 15, 1]).train(trainingData, 200000);
  for (const n of trainingData) print(n.input, network1.run(n.input));
  console.log(JSON.parse(JSON.stringify(network1.toJSON())));
};

run();
