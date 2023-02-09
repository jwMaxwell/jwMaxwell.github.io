import { Network } from "./src/network";

const params = {
  learningRate: 0.3,
  trainingIterations: 20000,
  momentum: 0.1,
  trainingChunks: 1000,
};

// let trainingData;
// const updateData = () => {
//   const res = [];
//   let temp = userInput.value;
//   const divisor = temp.length / params.trainingChunks;
//   while (temp.length) {
//     const chunk = temp.splice(0, divisor);
//     res.push({ input: chunk.slice(0, -1), output: chunk.slice(-1) });
//   }
//   res.pop();
//   return res;
// };
// trainingData = updateData();

const save = debounce(() => {
  location.hash = btoa(JSON.stringify(params));
});

const gui = new window.dat.GUI();
gui.add(params, "learningRate").onChange(save);
gui.add(params, "trainingIterations").onChange(save);
gui.add(params, "momentum").onChange(save);
