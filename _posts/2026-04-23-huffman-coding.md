---
layout: post
title: File Compression Using Huffman Coding
date: 2026-04-23 12:00:00
description: Huffman encoder/decoder from scratch
tags: algorithm
categories: computer-science
giscus_comments: true
---

## Huffman Encoder / Decoder

<div id="huffman-app" markdown="0">
  <textarea id="huff-input" rows="6" style="width:100%;font-family:monospace;font-size:0.9rem;padding:0.5rem;border-radius:6px;border:1px solid #888;background:transparent;color:inherit;resize:vertical;" placeholder="Type or paste text here..."></textarea>

  <div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;">
    <button id="btn-encode" style="padding:0.4rem 1rem;cursor:pointer;border-radius:4px;border:1px solid #888;background:transparent;color:inherit;">Encode</button>
    <button id="btn-decode" style="padding:0.4rem 1rem;cursor:pointer;border-radius:4px;border:1px solid #888;background:transparent;color:inherit;">Decode</button>
    <div style="margin-left:auto;display:flex;align-items:center;gap:0.5rem;">
      <span style="font-size:0.85rem;">Upload file (.txt, .bin):</span>
      <input type="file" id="huff-file-upload" accept=".txt,.bin" style="font-size:0.85rem;" />
      <span style="font-size:0.75rem;color:#999;">.txt → Encode &nbsp;|&nbsp; .bin → Decode</span>
    </div>
  </div>

  <div id="huff-output" style="margin-top:1rem;padding:0.75rem;border-radius:6px;border:1px solid #888;min-height:3rem;max-height:15rem;overflow-y:auto;word-break:break-all;white-space:pre-wrap;font-family:monospace;font-size:0.85rem;"></div>

  <div id="huff-stats" style="margin-top:0.75rem;padding:0.6rem 0.75rem;border-radius:6px;border:1px solid #888;font-family:monospace;font-size:0.85rem;display:none;"></div>
  
  <div style="margin-top:0.75rem;">
    <button id="btn-download" style="padding:0.4rem 1rem;cursor:pointer;border-radius:4px;border:1px solid #888;background:transparent;color:inherit;display:none;">Download .txt</button>
  </div>
</div>

<script>
(function () {
  const input = document.getElementById("huff-input");
  const output = document.getElementById("huff-output");
  const btnEncode = document.getElementById("btn-encode");
  const btnDecode = document.getElementById("btn-decode");
  const fileUpload = document.getElementById("huff-file-upload");
  const btnDownload = document.getElementById("btn-download");
  const stats = document.getElementById("huff-stats");
  
  let currentOutputData = "";
  let currentOutputExt = "";

  // --- Step 1: Count character frequencies ---
  // Returns an object like { 'a': 5, 'b': 2, ... }
  function getFrequencies(text) {
    const freq = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    return freq;
  }

  // --- Step 2: Build the Huffman tree ---
  // Takes frequency object, returns tree root node
  // Node shape: { char, freq, is_leaf, left, right }
  function buildTree(freq) {
    const nodes = Object.entries(freq).map(([c, f]) => ({
      char: c, freq: f, is_leaf: true, left: null, right: null,
    }));

    while (nodes.length > 1) {
      // tiebreaker: smallest char goes left
      nodes.sort((a, b) => a.freq - b.freq || a.char.localeCompare(b.char));
      const left = nodes.shift();
      const right = nodes.shift();
      nodes.push({
        char: left.char,
        freq: left.freq + right.freq,
        is_leaf: false,
        left,
        right,
      });
    }

    return nodes[0] || null;
  }

  // --- Step 3: Generate code table from tree ---
  // Returns an object like { 'a': '01', 'b': '110', ... }
  function buildCodeTable(node, prefix, table) {
    if (node.is_leaf) {
      table[node.char] = prefix || '0';
      return table;
    }

    buildCodeTable(node.left, prefix + '0', table);
    buildCodeTable(node.right, prefix + '1', table);
    return table;
  }

  // --- Step 4: Encode text using code table ---
  // Returns the encoded binary string
  function encode(text, codeTable) {
    const parts = [];
    for (const char of text) {
      parts.push(codeTable[char]);
    }
    return parts.join("");
  }

  // --- Step 5: Decode binary string using code table ---
  // Takes bitstream string and code table { 'a': '01', ... }
  // Returns the original text
  function decode(bits, codeTable) {
    const reverseCodeTable = Object.fromEntries(
      Object.entries(codeTable).map(([char, code]) => [code, char])
    );
    const chars = [];
    let currentCode = "";
    for (const bit of bits) {
      currentCode += bit;
      if (reverseCodeTable[currentCode]) {
        chars.push(reverseCodeTable[currentCode]);
        currentCode = "";
      }
    }
    return chars.join("");
  }

  // --- Step 6: Pack and Unpack 32-bit chunks ---
  // Takes a bitString like "010011..." and returns a Uint32Array and padding bit count
  function packTo32BitChunks(bitString) {
    const numInts = Math.ceil(bitString.length / 32);
    const packedArray = new Uint32Array(numInts);
    for (let i = 0; i < bitString.length; i++) {
      const chunkIndex = Math.floor(i / 32);
      const bitIndex = i % 32;
      packedArray[chunkIndex] |= (parseInt(bitString[i]) << (31 - bitIndex));
    }
    // outer mod for perfect no padding case (32 % 32 = 0)
    const padding = (32 - (bitString.length % 32)) % 32;
    return { packedArray, padding };
  }

  // Takes a Uint32Array and padding count, returns the original bitString
  function unpackFrom32BitChunks(packedArray, padding) {
    const bits = [];
    for (let i = 0; i < packedArray.length; i++) {
      const chunk = packedArray[i];
      for (let j = 0; j < 32; j++) {
        const bit = (chunk >> (31 - j)) & 1;
        bits.push(bit);
      }
    }
    bits.splice(bits.length - padding, padding);
    return bits.join("");
  }

  // --- Step 7: Serialize to binary format ---
  // Layout: [headerByteLength (4B)] [padding (4B)] [header text bytes (padded to 4B)] [packed Uint32s]
  // Returns a Uint8Array containing the complete binary file

  // Serialize code table to simple text format
  function serializeCodeTable(codeTable) {
    const escapeChar = (ch) => {
      if (ch === '\n') return '\\n';
      if (ch === '\r') return '\\r';
      if (ch === '\t') return '\\t';
      if (ch === ':')  return '\\:';
      if (ch === '\\') return '\\\\';
      if (ch === ' ')  return '\\s';
      return ch;
    };
    return Object.entries(codeTable)
      .map(([ch, code]) => escapeChar(ch) + ':' + code)
      .join('\n');
  }

  // Parse simple text format back to code table
  function parseCodeTable(text) {
    const table = {};
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line) continue; // to prevent empty lines from throwing errors
      // Find the separator colon (not escaped)
      let i = 0, ch = '';
      if (line[0] === '\\') {
        // Escaped character
        const esc = line[1];
        if (esc === 'n')  ch = '\n';
        else if (esc === 'r') ch = '\r';
        else if (esc === 't') ch = '\t';
        else if (esc === ':') ch = ':';
        else if (esc === '\\') ch = '\\';
        else if (esc === 's') ch = ' ';
        i = 3; // skip past "\\X:"
      } else {
        ch = line[0];
        i = 2; // skip past "X:"
      }
      table[ch] = line.slice(i);
    }
    return table;
  }

  
  function serializeToBinary(codeTable, bitString) {
    const headerText = serializeCodeTable(codeTable);
    const headerBytes = new TextEncoder().encode(headerText);
    const { packedArray, padding } = packTo32BitChunks(bitString);
    const headerByteLength = headerBytes.length;
    // use this padding for 4 byte alignment
    const paddedHeaderBytes = Math.ceil(headerByteLength / 4) * 4;
    const totalSize = 4 + 4 + paddedHeaderBytes + packedArray.byteLength;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    // little-endian
    view.setUint32(0, headerByteLength, true);
    view.setUint32(4, padding, true);
    const headerOffset = 8;
    new Uint8Array(buffer, headerOffset, headerByteLength).set(headerBytes);
    const dataOffset = headerOffset + paddedHeaderBytes;
    new Uint8Array(buffer, dataOffset).set(new Uint8Array(packedArray.buffer));
    return new Uint8Array(buffer);
  }

  // --- Step 8: Parse from binary format ---
  // Takes an ArrayBuffer, returns { codeTable, bitString }
  function parseFromBinary(buffer) {
    const view = new DataView(buffer);
    const headerByteLength = view.getUint32(0, true);
    const padding = view.getUint32(4, true);
    const headerBytes = new Uint8Array(buffer, 8, headerByteLength);
    const headerText = new TextDecoder().decode(headerBytes);
    const codeTable = parseCodeTable(headerText);
    // use this padding for 4 byte alignment
    const dataOffset = 8 + Math.ceil(headerByteLength / 4) * 4;
    const packedArray = new Uint32Array(buffer, dataOffset);
    const bitString = unpackFrom32BitChunks(packedArray, padding);
    return { codeTable, bitString };
  }

  let uploadedBinaryBuffer = null;

  // --- Button handlers ---
  btnEncode.addEventListener("click", function () {
    const text = input.value;
    if (!text) return;

    const freq = getFrequencies(text);
    const tree = buildTree(freq);
    const codeTable = buildCodeTable(tree, "", {});
    const bitString = encode(text, codeTable);

    const binaryData = serializeToBinary(codeTable, bitString);

    // Compression stats — file sizes in bytes
    const originalBytes = text.length;
    const huffmanBits = Object.entries(freq).reduce(
      (sum, [ch, f]) => sum + f * codeTable[ch].length, 0
    );
    const headerBytes = new TextEncoder().encode(serializeCodeTable(codeTable)).length;
    const huffmanDataBytes = Math.ceil(huffmanBits / 32) * 4;
    const huffmanBinaryBytes = 4 + 4 + Math.ceil(headerBytes / 4) * 4 + huffmanDataBytes;
    const ratio = ((1 - huffmanBinaryBytes / originalBytes) * 100).toFixed(1);
    stats.innerHTML =
      `Original:        ${originalBytes} bytes<br>` +
      `Huffman binary:  ${huffmanBinaryBytes} bytes (header: ${headerBytes}B + data: ${huffmanDataBytes}B) \u2014 ${ratio}% smaller`;
    stats.style.display = "block";

    output.textContent = serializeCodeTable(codeTable) + "\n---\n" + bitString;

    currentOutputData = binaryData;
    currentOutputExt = "bin";
    btnDownload.textContent = "Download .bin";
    btnDownload.style.display = "inline-block";
  });

  btnDecode.addEventListener("click", function () {
    if (!uploadedBinaryBuffer) {
      output.textContent = "Error: Upload a .bin file to decode.";
      return;
    }

    const { codeTable, bitString } = parseFromBinary(uploadedBinaryBuffer);
    const decoded = decode(bitString, codeTable);

    output.textContent = decoded;

    currentOutputData = decoded;
    currentOutputExt = "txt";
    btnDownload.textContent = "Download .txt";
    btnDownload.style.display = "inline-block";
  });

  // Handle file upload
  fileUpload.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.name.endsWith(".bin")) {
      // Binary file → store for decoding
      const reader = new FileReader();
      reader.onload = function(evt) {
        uploadedBinaryBuffer = evt.target.result;
        output.textContent = "Loaded " + file.name + " (" + evt.target.result.byteLength + " bytes). Click Decode.";
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Text file → load into textarea for encoding
      const reader = new FileReader();
      reader.onload = function(evt) {
        input.value = evt.target.result;
        output.textContent = "Loaded " + file.name + ". Click Encode.";
      };
      reader.readAsText(file);
    }
  });

  // Handle file download
  btnDownload.addEventListener("click", function() {
    if (!currentOutputData) return;
    const blob = new Blob([currentOutputData]); // Support blob infering data type natively
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output." + currentOutputExt;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
})();
</script>

---

## How Huffman Coding Works

Huffman coding is a popular lossless data compression algorithm. The core idea is to assign variable-length codes to input characters, with lengths based on the frequencies of the corresponding characters. The most frequent characters get the shortest codes and the least frequent characters get the longest codes. 

Because the codes are generated using a binary tree (the Huffman tree), they are **prefix codes**, which means the bit representation of any character is never a prefix of the bit representation of any other character. This is crucial because it allows the encoded bitstream to be decoded unambiguously without needing any special delimiters between characters.

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/posts/huffman-coding/huffman-coding-note.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    My handwritten notes on Huffman Coding.
</div>

## Implementation Details

My implementation breaks the process down into several specific, manageable steps:

1. **Count Frequencies**: The `getFrequencies` function scans the input text and builds a frequency map of each character.
2. **Build the Huffman Tree**: `buildTree` takes the frequencies and constructs a priority queue (using a sorted array for simplicity). It repeatedly takes the two nodes with the lowest frequencies and merges them into a parent node until only the root node remains.
3. **Generate Code Table**: The tree is traversed recursively by `buildCodeTable` to generate a binary string ('0' for left, '1' for right) for each leaf node.
4. **Encoding**: `encode` converts the original text into a single, long string of `'0'`s and `'1'`s using the code table.
5. **Binary Packing**: Since JavaScript natively stores strings using UTF-16, a string of `"0101"` uses way more memory than actual bits. `packTo32BitChunks` converts this pseudo-bitstream into a `Uint32Array` by packing 32 bits into each integer.
6. **Binary Serialization**: To save it as an actual file, `serializeToBinary` creates a byte buffer using standard `DataView` and `Uint8Array`. It writes a header (so the decoder knows the code table), padding information (so we know how many trailing bits to ignore in the last chunk), and the compressed data itself. 
7. **Decoding**: Decoding reverses the process. We parse the file bytes, read the header to reconstruct the code table, unpack the `Uint32Array` back into our stream of bits, and traverse our reverse code mapping to get the original text back.

## Future Improvements

While this implementation is fully functional and compresses text efficiently, there are some areas for improvement in the future:

- **Eliminate Intermediate String Allocation**: Currently, the code builds a giant string of `"1"`s and `"0"`s during encoding before packing it into 32-bit integers. This can cause high memory usage for large files. Writing directly to a bit buffer during encoding would be much more memory-efficient.
- **Tree Storage Format**: Right now, the header directly stores a simple text serialization of the code table (e.g., `a:01\nb:10`). It would be more compact to serialize the structure of the Huffman tree itself, or just the frequencies, saving header overhead.
- **Adaptive Huffman Coding**: This current implementation is robust, but it requires two passes over the data (one to get frequencies, one to encode). Adaptive (or dynamic) Huffman coding updates the tree dynamically as symbols are read, requiring only a single pass.
- **Handling Binary Files**: Right now the input is strictly treated as text characters. Updating the initial frequency map to use raw bytes (0-255) instead of string characters would allow testing compression on not just text, but arbitrary file types (like images or executables).
