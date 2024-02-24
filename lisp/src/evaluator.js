import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { evalError } from "./validator.js";

let messages = [];
export const getMessages = () => messages;
export const addMessage = (str) => messages.push(str);
export const clearMessages = () => (messages = []);

const evaluate = (expr, env, stack = []) => {
  if (Array.isArray(expr)) {
    if (!expr?.[0]) throw evalError(stack, "Empty expression");
    const { value, type, line, col } = expr?.[0];
    const func = evaluate(expr?.[0], env, [
      `${value} ${line}:${col}`,
      ...stack,
    ]);
    if (typeof func === "function") {
      try {
        const result = func(expr.slice(1), env, [
          `${value} ${line}:${col}`,
          ...stack,
        ]);
        return result;
      } catch (e) {
        /*
         * For some reason, throwing errors here will recursively
         * spam the output with stacktrace messages.
         */
        messages.push(e);
      }
    }
  }

  if (expr && typeof expr === "object") {
    const { value, type, line, col } = expr;
    if (type === "number" || type === "string") {
      return value;
    } else if (type === "identifier") {
      for (const [key, val] of env) {
        if (key === value) {
          return val;
        }
      }
      throw evalError(stack, `Variable ${value} not defined`);
    }
  }

  // FIXME can be symbol or undefined variable
  throw expr.type === "identifier"
    ? evalError(stack, `Variable ${expr.value} not defined`)
    : evalError(stack, `Unexpected symbol: ${JSON.stringify(expr)}`);
};

const getLiteral = (expr) =>
  Array.isArray(expr)
    ? expr.map(getLiteral)
    : expr && typeof expr === "object"
    ? expr.value
    : expr;

const isAtom = (expr) => !Array.isArray(expr) || !expr.length;
const toBool = (val) => (val ? "t" : []);
const fromBool = (val) => val && (!Array.isArray(val) || val.length);
const math = (func) => (args, env, stack) => {
  const values = args.map((x) => evaluate(x, env, stack));
  for (const v of values)
    if (!Number(v)) {
      clearMessages();
      throw evalError(stack, `Expected number. Got "${v}"`);
    }
  return values.reduce(func);
};

const defaultEnv = Object.entries({
  quote: ([a]) => getLiteral(a),
  car: ([a], env, stack) => evaluate(a, env, stack)?.[0],
  cdr: ([a], env, stack) => evaluate(a, env, stack).slice(1),
  atom: ([a], env, stack) => toBool(isAtom(evaluate(a, env, stack))),
  eq: ([a, b], env, stack) =>
    toBool(evaluate(a, env, stack) === evaluate(b, env, stack)),
  cons: ([a, b], env, stack) => [
    evaluate(a, env, stack),
    ...evaluate(b, env, stack),
  ],
  cond: (args, env, stack) => {
    for (const [pred, expr] of args) {
      if (fromBool(evaluate(pred, env, stack)))
        return evaluate(expr, env, stack);
    }
  },
  list: (args, env, stack) => args.map((a) => evaluate(a, env, stack)),
  set: ([name, value], env, stack) => [
    [getLiteral(name), evaluate(value, env, stack)],
    ...env,
  ],
  λ:
    ([argList, body]) =>
    (args, env, stack) =>
      evaluate(
        body,
        [
          ...argList.map((arg, i) => [
            getLiteral(arg),
            evaluate(args[i], env, stack),
          ]),
          ...env,
        ],
        stack
      ),
  defun: ([name, args, body], env, stack) => [
    [
      getLiteral(name),
      evaluate(
        [
          { value: "λ", type: "identifier", line: name.line, col: name.col },
          args,
          body,
        ],
        env,
        stack
      ),
    ],
    ...env,
  ],
  import: ([url], env, stack) => {
    const fetchSync = (url) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);

      return xhr.responseText;
    };

    return [
      parse(tokenize(fetchSync(getLiteral(url))))
        .map((node) => evaluate(node, env, stack))
        .pop()?.[0],
      ...env,
    ];
  },
  println: ([args], env, stack) => {
    messages.push(evaluate(args, env, stack));
    return env;
  },
  defmacro: ([name, [argName], body], env, stack) => {
    const res = [
      [
        getLiteral(name),
        (args, env) =>
          evaluate(
            evaluate(body, [[getLiteral(argName), args], ...env], stack),
            env,
            [`${name.value} ${name.line}:${name.col}`, ...stack]
          ),
      ],
      ...env,
    ];
    return res;
  },
  "+": math((a, b) => a + b),
  "-": math((a, b) => a - b),
  "*": math((a, b) => a * b),
  "/": math((a, b) => a / b),
  "%": math((a, b) => a % b),
  ">": math((a, b) => a > b),
  "<": math((a, b) => a < b),
  ">=": math((a, b) => a >= b),
  "<=": math((a, b) => a <= b),
  "**": math((a, b) => a ** b),
});

export const execute = (exprs, ctx = defaultEnv) =>
  exprs.reduce((env, line) => evaluate(line, env), ctx);
