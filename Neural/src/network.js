// import { Connection } from "./connection.js";
// import { Layer } from "./layer.js";

const { Connection } = require("./connection.js");
const { Layer } = require("./layer.js");

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const randBias = () => Math.floor(Math.random() * 6 - 3);

class Network {
  constructor(layersSize, learnRate, momentum) {
    this.layers = layersSize.map((len, i) => {
      const layer = Layer(len);
      if (i !== 0) {
        layer.neurons = layer.neurons.map((n) => {
          n.bias = randBias();
          return n;
        });
      }
      return layer;
    });

    this.learnRate = learnRate ?? 0.3;
    this.momentum = momentum ?? 0.1;
    this.connect();
  }

  setMomentum(x) {
    this.momentum = x;
  }

  setLearnRate(x) {
    this.learnRate = x;
  }

  connect() {
    for (let l = 1; l < this.layers.length; l++) {
      const currLayer = this.layers[l];
      const prevLayer = this.layers[l - 1];
      for (let n = 0; n < prevLayer.neurons.length; n++) {
        for (let i = 0; i < currLayer.neurons.length; i++) {
          const conn = Connection(prevLayer.neurons[n], currLayer.neurons[i]);

          prevLayer.neurons[n].outputs.push(conn);
          currLayer.neurons[i].inputs.push(conn);
        }
      }
    }
  }

  train(data, iterations) {
    const pnum = iterations / 100;
    for (let i = 0; i < iterations; i++) {
      if (i % pnum === 0) console.log(`Training: ${i / pnum}%`);
      const item = data[Math.floor(Math.random() * data.length)];

      this.activate(item.input); // Set inputs data for first layer
      this.runInptSig(); // Forward prop

      // Back prop
      this.calcDeltaSig(item.output);
      this.adjust();
    }
  }

  activate(vals) {
    this.layers[0].neurons = this.layers[0].neurons.map((n, i) => {
      n.value = vals[i];
      return n;
    });
  }

  run(input) {
    this.activate(input);
    return this.runInptSig();
  }

  runInptSig() {
    for (let l = 1; l < this.layers.length; l++) {
      for (let n = 0; n < this.layers[l].neurons.length; n++) {
        const bias = this.layers[l].neurons[n].bias;
        const connVal = this.layers[l].neurons[n].inputs.reduce((prev, t) => {
          return prev + t.weight * t.from.value;
        }, 0);

        this.layers[l].neurons[n].value = sigmoid(connVal + bias);
      }
    }

    return this.layers[this.layers.length - 1].neurons.map((t) => t.value);
  }

  calcDeltaSig(target) {
    for (let l = this.layers.length - 1; l >= 0; --l) {
      const currLayer = this.layers[l];
      for (let n = 0; n < currLayer.neurons.length; n++) {
        const currNeuron = currLayer.neurons[n];

        let value = currNeuron.value;

        let err = 0;
        if (l === this.layers.length - 1) err = target[n] - value;
        else {
          for (let k = 0; k < currNeuron.outputs.length; k++) {
            const currentConn = currNeuron.outputs[k];
            err += currentConn.to.delta * currentConn.weight;
          }
        }

        currNeuron.error = err;
        currNeuron.delta = err * value * (1 - value);
      }
    }
  }

  adjust() {
    // we start adjusting weights from the outputs layer back to the inputs layer
    for (let l = 0; l <= this.layers.length - 1; l++) {
      const currLayer = this.layers[l];

      for (let n = 0; n < currLayer.neurons.length; n++) {
        const currNeuron = currLayer.neurons[n];

        let delta = currNeuron.delta;

        for (let i = 0; i < currNeuron.inputs.length; i++) {
          const currConn = currNeuron.inputs[i];
          let change =
            this.learnRate * delta * currConn.from.value +
            this.momentum * currConn.change;
          currConn.change = change;
          currConn.weight += change;
        }

        currNeuron.bias = currNeuron.bias + this.learnRate * delta;
      }
    }
  }

  toJSON() {
    return {
      learnRate: this.learnRate,
      momentum: this.momentum,
      layers: this.layers.map((t) => t.toJSON()),
    };
  }
}

module.exports = { Network };
