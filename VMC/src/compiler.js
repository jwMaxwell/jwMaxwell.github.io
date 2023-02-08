import { binop } from "./util.js";

export const runIntermediary = (str) => {
  const memory = [0];

  const instructions = {
    DELINT: (x) => {},
    DELSTR: (x) => {},

    BEQ: (x, y, z) => {},
    BNEQ: (x, y, z) => {},
    BGT: (x, y, z) => {},
    BGTE: (x, y, z) => {},
    BLT: (x, y, z) => {},
    BLTE: (x, y, z) => {},

    ADD: (x, y, z) => {},
    SUB: (x, y, z) => {},
    MULT: (x, y, z) => {},
    DIV: (x, y, z) => {},
    MOD: (x, y, z) => {},

    AND: (x, y, z) => {},
    OR: (x, y, z) => {},
    RSHIFT: (x, y, z) => {},
    LSHIFT: (x, y, z) => {},

    PRINTS: (x) => {},
    PRINTC: (x) => {},
    PRINTI: (x) => {},

    JUMP: (title) => {},
    ARRAY: (title, ...vals) => {},
    PTR: (title, val) => {},
    LET: (title, val) => {
      if (val && val.includes('"')) {
      }
    },
    INC: (x) => {},
    DEC: (x) => {},
    "#": (title) => {},
    "//": () => {},
  };
};
