const makeError = (token, message) => {
    const err = message + '\t' 
                + `at: ${token.line}:${token.col}\n`
                + token.value + '\n'
                + "^" + "~".repeat(token.value.length - 1);
    throw new Error(err+'\n\n')
}

export const checkParens = (tokens) => {
    const stack = [];
    for (const token of tokens) {
        if (token.value === "(" && token.type === 'symbol') {
            stack.push(token);
        } else if (token.value === ')' && token.type === 'symbol' && stack.length) {
            stack.pop();
        } else if (token.value === ')' && token.type === 'symbol') {
            makeError(token, `Unbalanced parens`);
        }
    }
    if (stack.length) {
        makeError(stack[0], `Unbalanced parens`);
    }
    
    return tokens;
}
