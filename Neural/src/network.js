const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const randBias = () => Math.floor(Math.random() * 6 - 3);

const Neuron = () => {
  return {
    inputs: [],
    outputs: [],
    bias: 0,
    delta: 0,
    value: 0,
    error: 0,
  };
};

const Layer = (x) => Array.from({ length: x }, Neuron);

const Connection = (from, to) => {
  return { from: from, to: to, weight: Math.random(), change: 0 };
};

class Network {
  constructor(layersSize, learnRate, momentum) {
    this.layers = layersSize
      ? layersSize.map((len, i) => {
          let layer = Layer(len);
          if (i !== 0) {
            layer = layer.map((n) => {
              n.bias = randBias();
              return n;
            });
          }
          return layer;
        })
      : [];

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
      for (let n = 0; n < prevLayer.length; n++) {
        for (let i = 0; i < currLayer.length; i++) {
          const conn = Connection(prevLayer[n], currLayer[i]);

          prevLayer[n].outputs.push(conn);
          currLayer[i].inputs.push(conn);
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

    return this;
  }

  activate(vals) {
    this.layers[0] = this.layers[0].map((n, i) => {
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
      for (let n = 0; n < this.layers[l].length; n++) {
        const neuron = this.layers[l][n];
        const connVal = neuron.inputs.reduce((prev, t) => {
          return prev + t.weight * t.from.value;
        }, 0);

        neuron.value = sigmoid(connVal + neuron.bias);
      }
    }

    return this.layers[this.layers.length - 1].map((t) => t.value);
  }

  calcDeltaSig(target) {
    for (let l = this.layers.length - 1; l >= 0; --l) {
      const currLayer = this.layers[l];
      for (let n = 0; n < currLayer.length; n++) {
        const currNeuron = currLayer[n];
        let value = currNeuron.value;

        let err = 0;
        if (l === this.layers.length - 1) err = target[n] - value;
        else for (const i of currNeuron.outputs) err += i.to.delta * i.weight;

        currNeuron.error = err;
        currNeuron.delta = err * value * (1 - value);
      }
    }
  }

  adjust() {
    // we start adjusting weights from the outputs layer back to the inputs layer
    for (let l = 0; l <= this.layers.length - 1; l++) {
      const currLayer = this.layers[l];

      for (let n = 0; n < currLayer.length; n++) {
        const currNeuron = currLayer[n];

        let delta = currNeuron.delta;

        for (let i = 0; i < currNeuron.inputs.length; i++) {
          const currConn = currNeuron.inputs[i];
          let change =
            this.learnRate * delta * currConn.from.value +
            this.momentum * currConn.change;
          currConn.change = change;
          currConn.weight += change;
        }

        currNeuron.bias += this.learnRate * delta;
      }
    }
  }

  from(net) {
    this.learnRate = net.learnRate;
    this.momentum = net.momentum;
    this.layers = JSON.parse(net.layers);

    for (let l = 1; l < this.layers.length; l++) {
      const currLayer = this.layers[l];
      const prevLayer = this.layers[l - 1];
      for (let n = 0; n < prevLayer.length; n++) {
        for (let i = 0; i < currLayer.length; i++) {
          prevLayer[n].outputs[i].to = currLayer[i];
          prevLayer[n].outputs[i].from = prevLayer[n];

          currLayer[i].inputs[n].to = currLayer[i];
          currLayer[i].inputs[n].from = prevLayer[n];
        }
      }
    }
    return this;
  }

  toJSON() {
    return {
      learnRate: this.learnRate,
      momentum: this.momentum,
      layers: JSON.stringify(
        this.layers.map((l) =>
          l.map((n) => {
            let temp = n;
            temp.inputs = temp.inputs.map((i) => {
              i.to = {};
              return i;
            });
            temp.outputs = temp.outputs.map((o) => {
              o.from = {};
              return o;
            });
            return temp;
          })
        )
      ),
    };
  }
}

module.exports = { Network };
