class Neuron {
  constructor() {
    this.input = [];
    this.output = [];
    this.bias = 0;
    this.delta = 0; // percentage of change in the weight
    this.value = 0;
    this.error = 0;
  }

  setError(err) {
    this.error = err;
  }

  addInput(conn) {
    this.input.push(conn);
  }

  setOutput(x) {
    this.output = x;
  }

  addOutput(conn) {
    this.output.push(conn);
  }

  setBias(x) {
    this.bias = x;
  }

  setDelta(x) {
    this.delta = x;
  }

  setValue(x) {
    this.value = x;
  }

  randBias() {
    return Math.floor(Math.random() * 6 - 3);
  }

  toJSON() {
    return {
      input: this.input,
      output: this.output,
      bias: this.bias,
      delta: this.delta,
      value: this.value,
    };
  }
}

module.exports = { Neuron };
