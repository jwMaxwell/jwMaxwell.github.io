const messages = { token: [], ast: [], error: [], output: [] };
export const getMessages = (lvl) => messages[lvl];
export const addMessage = (lvl, dat) => {
  messages[lvl].push(dat);
  return messages;
};
export const clearMessages = () => {
  messages.token = [];
  messages.ast = [];
  messages.error = [];
  messages.output = [];
};

export const stackLimit = 1000;
