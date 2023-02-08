// import { Network } from "./network.js";
const { Network } = require("./network");

const trainingData = [
  {
    input: [0, 0],
    output: [1],
  },
  {
    input: [0, 1],
    output: [0],
  },
  {
    input: [1, 0],
    output: [0],
  },
  {
    input: [1, 1],
    output: [1],
  },
];

const percent = (x) => Number(`${x * 100}`.slice(0, 5));

const run = (...inpts) => {
  for (n of inpts) {
    let network = new Network([2, 8, 1]);

    network.setLearnRate(0.1);
    network.setMomentum(0.1);
    network.setIts(0);

    for (let i = 0; i < 80000; ++i) {
      const item =
        trainingData[Math.floor(Math.random() * trainingData.length)];
      network.train(item.input, item.output);
    }

    network.activate(n);
    const result = network.runInptSig();
    console.log(
      `${n} -> result: ${Math.round(result[0])}, certainty: ${percent(
        result[0]
      )}%`
    );
  }
};

run([0, 0], [0, 1], [1, 0], [1, 1]);
