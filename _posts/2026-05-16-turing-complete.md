---
layout: post
title: Building a CPU from Scratch: Reflections on Turing Complete
date: 2026-05-16 12:00:00
description: How building a virtual CPU changed my perspective on computer architecture, control flow, and hardware design.
tags: cpu hardware
categories: computer-science
giscus_comments: true
---

For a long time, CPUs felt almost magical to me. You write code, the processor disappears into a black box, and somehow the correct behavior comes out the other side. I understood the theory from classes, but it still felt abstract.

Building a CPU from scratch in _Turing Complete_ completely changed that.

The biggest surprise was that the arithmetic wasn't the difficult part. Once I built a Full Adder out of XOR, AND, and OR gates, the ALU stopped feeling mysterious pretty quickly. Addition just became a repeated pattern of simple logic extended across multiple bits. After that, building out more operations felt more like wiring work than "advanced math."

### Control Flow: The Real Challenge

The part that actually took the longest to understand was control flow.

In software, an `if` statement feels trivial. In hardware, it suddenly becomes a routing problem. Nothing branches magically. You are physically deciding where signals are allowed to go and when they are allowed to move there.

That only really clicked once I started heavily using switches and decoders in my datapath.

Making my own instruction set also helped demystify assembly a lot. I ended up using a simple 4-byte format:

`Opcode | Arg1 | Arg2 | Result`

What surprised me was how direct instruction decoding felt once I wired it myself. Each byte stopped feeling symbolic and started feeling physical. One part selected registers, another selected an ALU operation, another controlled write-back or jump behavior. An instruction was no longer "a command." It was just a bundle of control signals.

### The Hardest Problem: Conditionals with Immediates

The hardest problem in the entire project ended up being conditional instructions with immediate values.

For normal arithmetic instructions, `Arg1` and `Arg2` were register addresses, so the datapath stayed consistent. The CPU would read from the registers, feed the values into the ALU, and continue normally.

Conditionals completely broke that assumption.

Suddenly, those same bytes were no longer register selectors. They were actual integer values that needed to go directly into the ALU for comparison and potentially modify the Program Counter.

That meant I had to interrupt my own datapath design with a bunch of switches.

For standard instructions, the CPU would route inputs through the register file like usual. But for conditional instructions, those same paths had to bypass the registers entirely and feed the raw instruction bytes directly into the comparison logic and jump circuitry instead.

That was the moment control flow finally made sense to me.

> An `if` statement at the hardware level is not abstract logic. It is signal routing.

### The Why Behind Pipelining

Building a sequential architecture also made performance bottlenecks painfully obvious. When your processor has to fetch, decode, execute, and update state strictly one instruction at a time, you immediately start noticing how much hardware sits idle during each stage. After building even a simple CPU, the reason pipelining exists becomes extremely intuitive.

### Conclusion

I still have not implemented proper memory yet, but this project completely changed how I look at computer architecture. Now when I look at datapath diagrams or RISC-V pipeline charts, I do not just see boxes and arrows anymore. I can actually picture the routing decisions underneath them.
