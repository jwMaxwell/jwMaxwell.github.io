const appendChar = (charCode) =>
  charCode < 32 || charCode == 127
    ? `\`${String.fromCharCode((charCode + 34) & 127)}`
    : charCode == 96
    ? `\`${String.fromCharCode(charCode)}`
    : String.fromCharCode(charCode);

const appendChunk = (numMatchingChars, charCode, numLastMatchChars) =>
  "`" +
  String.fromCharCode(numMatchingChars) +
  String.fromCharCode(charCode + 33) +
  String.fromCharCode(numLastMatchChars + 33);

export const compress = (str) => {
  let result = "";
  let chunkSize = 0;
  let lastMatchChars = 0;
  let matchingChars = 0;

  for (let index = 0; index < str.length; ) {
    chunkSize = Math.max(5, chunkSize);
    if (!(index + chunkSize > str.length)) {
      let searchStart = index > 8840 ? index - 8840 : 0;
      let matchIndex = str
        .slice(searchStart, index)
        .lastIndexOf(str.slice(index, index + chunkSize));
      if (matchIndex >= 0) {
        lastMatchChars = index - (searchStart + matchIndex);
        matchingChars = chunkSize++;
        continue;
      } else if (!matchingChars) {
        result += appendChar(str.charCodeAt(index++));
        continue;
      }
    }
    if (matchingChars) {
      index += matchingChars;
      chunkSize -= matchingChars;
      matchingChars += matchingChars >= 35 ? 62 : 61;
      let charCode = (lastMatchChars - 5) % 94;
      lastMatchChars = (lastMatchChars - charCode) / 94;
      result += appendChunk(matchingChars, charCode, lastMatchChars);
      matchingChars = 0;
    }

    if (index + chunkSize > str.length) {
      while (index < str.length) result += appendChar(str.charCodeAt(index++));
    }
  }

  return result;
};

export const decompress = (compressed) => {
  let index = 0;
  let output = "";

  while (index < compressed.length) {
    let currChar = compressed.charCodeAt(index++);
    if (currChar === 96) {
      currChar = compressed.charCodeAt(index++);
      if (currChar > 65) {
        currChar -= currChar > 96 ? 62 : 61;
        const length = currChar;
        currChar = compressed.charCodeAt(index++);
        let offset = currChar - 28;
        currChar = compressed.charCodeAt(index++);
        offset += 94 * (currChar - 33);
        const segStart = output.length - offset;
        output += output.slice(segStart, segStart + length);
      } else if (currChar > 32)
        output += String.fromCharCode((currChar - 34) & 127);
    } else output += String.fromCharCode(currChar);
  }

  return output;
};
