const appendChar = (charCode) => {
  let res = "";
  if (charCode < 32 || charCode == 127) {
    res += "`";
    charCode = (charCode + 34) & 127;
  } else if (charCode == 96) {
    res += "`";
  }
  res += String.fromCharCode(charCode);
  return res;
};

export const compress = (str) => {
  let result = "";
  let index = 0;
  let chunkSize = 0;
  let numLastMatchChars = 0;
  let numMatchingChars = 0;
  let charCode;

  const appendChunk = () => {
    if (numMatchingChars) {
      index += numMatchingChars;
      chunkSize -= numMatchingChars;
      result += "`";
      numLastMatchChars -= 5;
      numMatchingChars -= 5;
      numMatchingChars += 66;
      if (numMatchingChars >= 96) {
        numMatchingChars += 1;
      }
      result += String.fromCharCode(numMatchingChars);
      charCode = numLastMatchChars % 94;
      numLastMatchChars = (numLastMatchChars - charCode) / 94;
      result +=
        String.fromCharCode(charCode + 33) +
        String.fromCharCode(numLastMatchChars + 33);
      numMatchingChars = 0;
    }
  };

  while (index < str.length) {
    chunkSize = Math.max(5, chunkSize);
    if (index + chunkSize > str.length) {
      appendChunk();
      let numMatchedChars = str.length - index;
      result += appendChar(str.charCodeAt(index++));
      while (--numMatchedChars) {
        result += appendChar(str.charCodeAt(index++));
      }
    } else {
      let chunk = str.substr(index, chunkSize);
      let searchStart = index > 8840 ? index - 8840 : 0;
      let matchIndex = str.substring(searchStart, index).lastIndexOf(chunk);
      if (matchIndex >= 0) {
        numLastMatchChars = index - (searchStart + matchIndex);
        numMatchingChars = chunkSize++;
        if (numMatchingChars >= 64) {
          appendChunk();
        }
      } else if (numMatchingChars) {
        appendChunk();
      } else {
        result += appendChar(str.charCodeAt(index++));
      }
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
      if (currChar === 96) {
        output += String.fromCharCode(currChar);
      } else if (currChar > 65) {
        currChar -= currChar > 96 ? 62 : 61;
        const length = currChar;
        currChar = compressed.charCodeAt(index++);
        let offset = currChar - 28;
        currChar = compressed.charCodeAt(index++);
        offset += 94 * (currChar - 33);
        output += output.substr(output.length - offset, length);
      } else if (currChar > 32) {
        output += String.fromCharCode((currChar - 34) & 127);
      }
    } else {
      output += String.fromCharCode(currChar);
    }
  }

  return output;
};
