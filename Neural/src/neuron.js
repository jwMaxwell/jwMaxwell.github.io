class Neuron {
  constructor() {
    this.inputs = [];
    this.outputs = [];
    this.bias = 0;
    this.delta = 0;
    this.value = 0;
    this.error = 0;
  }

  addInput(conn) {
    this.inputs.push(conn);
  }

  addOutput(conn) {
    this.outputs.push(conn);
  }

  randBias() {
    return Math.floor(Math.random() * 6 - 3);
  }

  toJSON() {
    return {
      input: this.inputs,
      output: this.outputs,
      bias: this.bias,
      delta: this.delta,
      value: this.value,
    };
  }
}

module.exports = { Neuron };
