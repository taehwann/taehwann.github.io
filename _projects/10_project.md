---
layout: page
title: Vapor
description: Interactive real-time 3D smoke plume simulation with GPU-accelerated fluid solver and volume ray-marching
importance: 1
category: graphics
project_id: vapor
img: assets/img/3d-smoke-plume.gif
repositories:
  - taehwann/vapor
giscus_comments: true
---

**Vapor** is an interactive real-time 3D smoke plume simulation written in C++20. It solves the incompressible Navier-Stokes equations on a staggered (MAC) grid and renders the result using OpenGL 4.3 volume ray-marching with self-shadowing.

## How It Works

The simulation runs on a 32×32×32 grid inside a closed box domain. A spherical emitter near the bottom releases smoke with upward velocity and random stirring. Buoyancy forces drive the plume upward, while semi-Lagrangian advection transports both smoke density and velocity through the domain. A Red-Black Gauss-Seidel SOR solver enforces incompressibility at each timestep.

The solver implements the **advection-reflection method** from _An Advection-Reflection Solver for Detail-Preserving Fluid Simulation_ (Zehnder et al., SIGGRAPH 2018).

## GPU Acceleration

Both the pressure solver and the advection step can toggle between CPU and GPU at runtime, independently:

- **GPU SOR**: Divergence computation, Red-Black SOR iterations, and velocity correction run in OpenGL compute shaders via SSBOs
- **GPU Advection**: Semi-Lagrangian backtrace and MacCormack correction run in GLSL compute shaders, mirroring the CPU implementation exactly

The ability to switch backends at runtime makes performance comparisons and debugging straightforward — you can verify GPU output against the validated CPU path frame by frame.

## Rendering

Smoke density is uploaded to a 3D half-float texture (`GL_R16F`) and rendered with a ray-marching fragment shader. Each ray accumulates opacity through the volume with exponential falloff for self-shadowing, terminating early when opacity exceeds 0.99. An orbit camera supports mouse-driven rotation and zoom.

## Tech Stack

- **Language**: C++20
- **Graphics**: OpenGL 4.3 core profile
- **GPU Compute**: GLSL 430 compute shaders
- **CPU Parallelism**: OpenMP
- **GUI**: Dear ImGui with GLFW + OpenGL3 backends
- **Build**: CMake 3.20+


