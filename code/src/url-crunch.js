export const compress = (str) => {
  let result = "";
  let index = 0;
  let chunkSize = 0;
  let numLastMatchChars = 0;
  let h = 0;
  let charCode, numMatchedChars;

  function appendChar(charCode) {
    if (charCode < 32 || charCode == 127) {
      result += "`";
      charCode = (charCode + 34) & 127;
    } else if (charCode == 96) {
      result += "`";
    }
    result += String.fromCharCode(charCode);
  }

  function appendChunk() {
    if (h) {
      index += h;
      chunkSize -= h;
      result += "`";
      numLastMatchChars -= 5;
      h -= 5;
      h += 66;
      if (h >= 96) {
        h += 1;
      }
      result += String.fromCharCode(h);
      charCode = numLastMatchChars % 94;
      numLastMatchChars = (numLastMatchChars - charCode) / 94;
      result += String.fromCharCode(charCode + 33);
      result += String.fromCharCode(numLastMatchChars + 33);
      h = 0;
    }
  }

  while (index < str.length) {
    chunkSize = Math.max(5, chunkSize);
    if (index + chunkSize > str.length) {
      appendChunk();
      numMatchedChars = str.length - index;
      appendChar(str.charCodeAt(index++));
      while (--numMatchedChars) {
        appendChar(str.charCodeAt(index++));
      }
    } else {
      let chunk = str.substr(index, chunkSize);
      let searchStart = index > 8840 ? index - 8840 : 0;
      let matchIndex = str.substring(searchStart, index).lastIndexOf(chunk);
      if (matchIndex >= 0) {
        numLastMatchChars = index - (searchStart + matchIndex);
        h = chunkSize++;
        if (h >= 64) {
          appendChunk();
        }
      } else if (h) {
        appendChunk();
      } else {
        appendChar(str.charCodeAt(index++));
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
