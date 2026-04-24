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

  <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
    <button id="btn-encode" style="padding:0.4rem 1rem;cursor:pointer;border-radius:4px;border:1px solid #888;background:transparent;color:inherit;">Encode</button>
    <button id="btn-decode" style="padding:0.4rem 1rem;cursor:pointer;border-radius:4px;border:1px solid #888;background:transparent;color:inherit;">Decode</button>
  </div>

  <div id="huff-output" style="margin-top:1rem;padding:0.75rem;border-radius:6px;border:1px solid #888;min-height:3rem;white-space:pre-wrap;font-family:monospace;font-size:0.85rem;"></div>
</div>

<script>
(function () {
  const input = document.getElementById("huff-input");
  const output = document.getElementById("huff-output");
  const btnEncode = document.getElementById("btn-encode");
  const btnDecode = document.getElementById("btn-decode");

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
      table[node.char] = prefix;
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

  // --- Step 6: Serialize encoded output ---
  // Combines code table + encoded bits into a single text string
  // Format:
  //   a:00
  //   b:01
  //   c:10
  //   ---
  //   001001100010
  function serializeOutput(codeTable, encodedBits) {
    const lines = [];
    for (const char in codeTable) {
      lines.push(`${char}:${codeTable[char]}`);
    }
    lines.push("---");
    lines.push(encodedBits);
    return lines.join("\n");
  }

  // --- Step 7: Parse encoded input ---
  // Takes the serialized string, returns { codeTable, bits }
  function parseInput(serialized) {
    // TODO: implement
    // Hint: split by '---', parse header lines as char:code
    return { codeTable: {}, bits: "" };
  }

  // --- Button handlers ---
  btnEncode.addEventListener("click", function () {
    const text = input.value;
    if (!text) return;

    const freq = getFrequencies(text);
    const tree = buildTree(freq);
    console.log("freq:", freq);
    console.log("tree:", JSON.stringify(tree, null, 2));
    const codeTable = buildCodeTable(tree, "", {});
    console.log("codeTable:", codeTable);
    const encoded = encode(text, codeTable);
    console.log("encoded:", encoded);
    const serialized = serializeOutput(codeTable, encoded);
    console.log("serialized:", serialized);

    output.textContent = serialized;
  });

  btnDecode.addEventListener("click", function () {
    const serialized = input.value;
    if (!serialized) return;

    const { codeTable, bits } = parseInput(serialized);
    const decoded = decode(bits, codeTable);

    output.textContent = "Decoded: " + decoded;
  });
})();
</script>

---

## Future Steps

- [ ] **Binary file output** — pack the bitstream into actual bytes (`Uint8Array`) instead of ASCII `"0"`/`"1"` characters. Store padding bit count in the header so the last byte can be decoded correctly.
- [ ] **File download/upload** — add a "Download .huff" button and a file input to upload `.huff` files for decoding.
- [ ] **Compression stats** — show original size vs encoded size and compression ratio.
