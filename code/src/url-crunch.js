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
  // Initialize values
  let result = "";
  let chunkSize = 0;
  let lastMatchChars = 0;
  let matchingChars = 0;

  // Loop over the input string one character at a time
  for (let i = 0; i < str.length; ) {
    // Set the chunk size to 5 or the current chunk size
    chunkSize = Math.max(5, chunkSize);
    // Current chunk + chunk size <= length of input string.
    // If so, search for a repeated substring within the chunk.
    if (i + chunkSize <= str.length) {
      let match = str.slice(0, i).lastIndexOf(str.slice(i, i + chunkSize));

      // If a repeated substring is found, set the counters and
      // continue the loop if the matching characters are less than 64.
      if (match >= 0) {
        lastMatchChars = i - match;
        matchingChars = chunkSize++;
        if (matchingChars < 64) {
          continue;
        }
        // If no repeated substring is found and there are no matching
        // characters, append the first character of the current chunk
        // to the result string and continue the loop.
      } else if (!matchingChars) {
        result += appendChar(str.charCodeAt(i++));
        continue;
      }
    }
    // If there are matching characters, encode the position and length
    // of the repeated substring in the compressed output, and reset the
    // counters for matching characters.
    if (matchingChars) {
      i += matchingChars;
      chunkSize -= matchingChars;
      lastMatchChars -= 5;
      matchingChars += matchingChars >= 35 ? 62 : 61;
      const charCode = lastMatchChars % 94;
      lastMatchChars = (lastMatchChars - charCode) / 94;
      result +=
        "`" +
        String.fromCharCode(matchingChars) +
        String.fromCharCode(charCode + 33) +
        String.fromCharCode(lastMatchChars + 33);
      matchingChars = 0;
    }
    // If current chunk + the chunk size > length of input append
    // the remaining characters of the input string to the result string
    if (i + chunkSize > str.length)
      while (i < str.length) result += appendChar(str.charCodeAt(i++));
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
        output += output.slice(
          output.length - offset,
          output.length - offset + length
        );
      } else if (currChar > 32) {
        output += String.fromCharCode((currChar - 34) & 127);
      }
    } else {
      output += String.fromCharCode(currChar);
    }
  }

  return output;
};
