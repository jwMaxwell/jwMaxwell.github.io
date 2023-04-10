const appendChar = (charCode) =>
  charCode < 32 || charCode === 127
    ? `\`${String.fromCharCode((charCode + 34) & 127)}`
    : charCode === 96
    ? `\`${String.fromCharCode(charCode)}`
    : String.fromCharCode(charCode);

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

export const decompress = (str) => {
  let res = "";
  const arr = str.split("").map((c) => c.charCodeAt(0));

  for (let i = 0; i < str.length; ++i) {
    let currChar = arr[i - 1];

    if (arr[i] === 96) {
      currChar = arr[i + 1];
      if (currChar > 65) {
        const length = currChar - (currChar > 96 ? 62 : 61);
        const offset = arr[i + 2] - 28 + 94 * (arr[i + 3] - 33);
        res += res.slice(res.length - offset, res.length - offset + length);
        i += 2;
      } else if (arr[i + 1] > 32) {
        res += String.fromCharCode((arr[i + 1] - 34) & 127);
      }
      i++;
    } else {
      res += String.fromCharCode(arr[i]);
    }
  }

  return res;
};
