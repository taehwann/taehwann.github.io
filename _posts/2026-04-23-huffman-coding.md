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
      <span style="font-size:0.85rem;">Upload file (.txt):</span>
      <input type="file" id="huff-file-upload" accept=".txt" style="font-size:0.85rem;" />
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
    // TODO: implement
    // Hint: invert codeTable to { '01': 'a', ... }, then walk the bits
    return "";
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
    // TODO: 1. Loop through packedArray
    // TODO: 2. Extract each bit (using bitwise operators) and append '0' or '1' to string
    // TODO: 3. Ignore `padding` number of bits on the very last element
    return "";
  }

  // --- Step 7: Serialize to text format ---
  // Packs codeTable + bitString into a readable text string:
  function serialize(codeTable, bitString) {
    const { packedArray, padding } = packTo32BitChunks(bitString);
    return JSON.stringify(codeTable) + "\n---\n" + padding + "\n" + Array.from(packedArray).join(",");
  }

  // --- Step 8: Parse from text format ---
  // Takes a serialized string, returns { codeTable, bitString }
  function parse(text) {
    const [json, rest] = text.split("\n---\n");
    const [paddingStr, numsStr] = rest.split("\n");
    const padding = parseInt(paddingStr);
    const packedArray = new Uint32Array(numsStr.split(",").map(Number));
    const codeTable = JSON.parse(json);
    const bitString = unpackFrom32BitChunks(packedArray, padding);
    return { codeTable, bitString };
  }

  // --- Button handlers ---
  btnEncode.addEventListener("click", function () {
    const text = input.value;
    if (!text) return;

    const freq = getFrequencies(text);
    const tree = buildTree(freq);
    const codeTable = buildCodeTable(tree, "", {});
    const bitString = encode(text, codeTable);

    const serialized = serialize(codeTable, bitString);

    // Compression stats
    const originalBits = text.length * 8;
    const huffmanBits = Object.entries(freq).reduce(
      (sum, [ch, f]) => sum + f * codeTable[ch].length, 0
    );
    const ratio = ((1 - huffmanBits / originalBits) * 100).toFixed(1);
    stats.textContent = `Original: ${originalBits} bits (${text.length} × 8)  |  Huffman: ${huffmanBits} bits  |  ${ratio}% smaller`;
    stats.style.display = "block";

    output.textContent = serialized;

    currentOutputData = serialized;
    currentOutputExt = "txt";
    btnDownload.textContent = "Download .txt";
    btnDownload.style.display = "inline-block";
  });

  btnDecode.addEventListener("click", function () {
    const text = input.value;
    if (!text) {
      output.textContent = "Error: Paste or upload an encoded .txt file to decode.";
      return;
    }

    const { codeTable, bitString } = parse(text);
    const decoded = decode(bitString, codeTable);

    output.textContent = "Decoded: " + decoded;

    currentOutputData = decoded;
    currentOutputExt = "txt";
    btnDownload.textContent = "Download .txt";
    btnDownload.style.display = "inline-block";
  });

  // Handle file upload
  fileUpload.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Always retrieve array buffer for binary decoding
    const arrayReader = new FileReader();
    arrayReader.onload = function(evt) {
      uploadedBinaryBuffer = evt.target.result;
    };
    arrayReader.readAsArrayBuffer(file);
    
    // Simultaneously display readable format logic for plain text encodings
    const stringReader = new FileReader();
    stringReader.onload = function(evt) {
      input.value = evt.target.result;
    };
    stringReader.readAsText(file);
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

## Future Steps

- [ ] **Binary file output** — pack the bitstream into actual bytes (`Uint8Array`) instead of ASCII `"0"`/`"1"` characters. Store padding bit count in the header so the last byte can be decoded correctly.
- [x] **File download/upload** — add a "Download .txt" button and a file input to upload `.txt` files for decoding.
- [ ] **Compression stats** — show original size vs encoded size and compression ratio.
