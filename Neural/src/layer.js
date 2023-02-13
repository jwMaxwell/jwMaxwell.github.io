// import { Neuron } from "./neuron,js";
const { Neuron } = require("./neuron.js");

// class Layer {
//   constructor(x) {
//     const neurons = [];
//     for (let i = 0; i < x; i++) {
//       neurons.push(Neuron());
//     }
//     this.neurons = neurons;
//   }

//   toJSON() {
//     return this.neurons.map((n) => n.toJSON());
//   }
// }

const Layer = (x) => {
  const res = [];
  for (let i = 0; i < x; i++) {
    res.push(Neuron());
  }
  return { neurons: res };
};

module.exports = { Layer };
