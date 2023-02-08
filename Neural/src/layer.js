// import { Neuron } from "./neuron,js";
const { Neuron } = require("./neuron.js");

class Layer {
  constructor(x) {
    const neurons = [];
    for (let i = 0; i < x; i++) {
      neurons.push(new Neuron());
    }
    this.neurons = neurons;
  }

  toJSON() {
    return this.neurons.map((n) => n.toJSON());
  }
}

module.exports = { Layer };
