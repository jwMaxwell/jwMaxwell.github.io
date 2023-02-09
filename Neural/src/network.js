// import { Connection } from "./connection.js";
// import { Layer } from "./layer.js";

const { Connection } = require("./connection.js");
const { Layer } = require("./layer.js");

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

class Network {
  constructor(layersSize, learnRate, momentum) {
    this.layers = layersSize.map((len, i) => {
      const layer = new Layer(len);
      if (i !== 0) {
        layer.neurons = layer.neurons.map((n) => {
          n.setBias(n.randBias());
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
          const conn = new Connection(
            prevLayer.neurons[n],
            currLayer.neurons[i]
          );

          prevLayer.neurons[n].addOutput(conn);
          currLayer.neurons[i].addInput(conn);
        }
      }
    }
  }

  train(data, iterations) {
    for (let i = 0; i < iterations; i++) {
      const item = data[Math.floor(Math.random() * data.length)];

      this.activate(item.input); // Set input data for first layer
      this.runInptSig(); // Forward prop

      // Back prop
      this.calcDeltaSig(item.output);
      this.adjust();
    }
  }

  activate(vals) {
    this.layers[0].neurons = this.layers[0].neurons.map((n, i) => {
      n.setValue(vals[i]);
      return n;
    });
  }

  run(vals) {
    this.activate(vals);
    return this.runInptSig();
  }

  runInptSig() {
    for (let l = 1; l < this.layers.length; l++) {
      for (let n = 0; n < this.layers[l].neurons.length; n++) {
        const bias = this.layers[l].neurons[n].bias;
        const connVal = this.layers[l].neurons[n].input.reduce((prev, t) => {
          return prev + t.weight * t.from.value;
        }, 0);

        this.layers[l].neurons[n].setValue(sigmoid(connVal + bias));
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
          for (let k = 0; k < currNeuron.output.length; k++) {
            const currentConn = currNeuron.output[k];
            err += currentConn.to.delta * currentConn.weight;
          }
        }

        currNeuron.setError(err);
        currNeuron.setDelta(err * value * (1 - value));
      }
    }
  }

  adjust() {
    // we start adjusting weights from the output layer back to the input layer
    for (let l = 0; l <= this.layers.length - 1; l++) {
      const currLayer = this.layers[l];

      for (let n = 0; n < currLayer.neurons.length; n++) {
        const currNeuron = currLayer.neurons[n];

        let delta = currNeuron.delta;

        for (let i = 0; i < currNeuron.input.length; i++) {
          const currConn = currNeuron.input[i];
          let change =
            this.learnRate * delta * currConn.from.value +
            this.momentum * currConn.change;
          currConn.setChange(change);
          currConn.setWeight(currConn.weight + change);
        }

        currNeuron.setBias(currNeuron.bias + this.learnRate * delta);
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
