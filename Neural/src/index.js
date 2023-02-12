const { Network } = require("./network");
const fs = require("fs");

const print = (x, y) =>
  console.log(`${x} -> result: ${y.map(Math.round)}, actual: ${y}`);

const encode = (str, vocab) => str.split("").map((c) => vocab.indexOf(c));

const run = () => {
  const text = fs.readFileSync("../input.txt", {
    encoding: "utf-8",
    flag: "r",
  });
  const vocabulary = Array.from(new Set(text)).sort();

  const trainingData = text
    .match(/.{1,901}/g)
    .slice(0, -1)
    .map((s) => encode(s, vocabulary))
    .map((a) => {
      return {
        input: a.slice(0, -1),
        output: a
          .slice(-1)
          .pop()
          .toString(2)
          .padStart(8, "0")
          .split("")
          .map(Number),
      };
    });

  let network = new Network([trainingData[0].input.length, 15, 15, 8]);
  network.train(trainingData, 60000);
  // print(trainingData[0].input, network.run(trainingData[0].input));

  console.log(
    trainingData[0].input.map((i) => vocabulary[i]).join(""),
    vocabulary[
      parseInt(network.run(trainingData[0].input).map(Math.round).join(""), 2)
    ]
  );

  // console.log(text);
  // console.log(vocabulary);
  // console.log(encode(text, vocabulary));
  // console.log(trainingData[0]);

  // console.log(
  //   encode(text, vocabulary)
  //     .map((i) => vocabulary[i])
  //     .join("")
  // );
  // console.log(decode(encode(text, vocabulary)));
};

run();
