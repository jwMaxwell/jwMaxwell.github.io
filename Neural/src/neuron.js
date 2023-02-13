// class Neuron {
//   constructor() {
//     this.inputs = [];
//     this.outputs = [];
//     this.bias = 0;
//     this.delta = 0;
//     this.value = 0;
//     this.error = 0;
//   }

//   randBias() {
//     return Math.floor(Math.random() * 6 - 3);
//   }

//   toJSON() {
//     return {
//       input: this.inputs,
//       output: this.outputs,
//       bias: this.bias,
//       delta: this.delta,
//       value: this.value,
//     };
//   }
// }

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

module.exports = { Neuron };
