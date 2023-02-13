// class Connection {
//   constructor(from, to) {
//     this.from = from;
//     this.to = to;
//     this.weight = Math.random();
//     this.change = 0;
//   }

//   toJSON() {
//     return {
//       from: this.from,
//       to: this.to,
//       weight: this.weight,
//       change: this.change,
//     };
//   }
// }

const Connection = (from, to) => {
  return { from: from, to: to, weight: Math.random(), change: 0 };
};

module.exports = { Connection };
