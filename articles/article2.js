export const title = "Rotating Sphere with Uniform Buffer";
export const image = "https://placehold.co/600x400?text=Rotating+Sphere";
export const layout = "split";
export const content = `
## Rotating Sphere with Uniform Buffer

This example uses a 4x4 matrix passed via a uniform buffer to rotate a 3D sphere in WebGPU.
`;

export function runDemo(canvas) {
  async function initWebGPU() {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: "opaque",
    });

    // === Sphere Generation ===
    const latitudeBands = 30;
    const longitudeBands = 30;
    const positions = [];
    const indices = [];

    for (let lat = 0; lat <= latitudeBands; ++lat) {
      const theta = (lat * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longitudeBands; ++lon) {
        const phi = (lon * 2 * Math.PI) / longitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        positions.push(x, y, z);
      }
    }

    for (let lat = 0; lat < latitudeBands; ++lat) {
      for (let lon = 0; lon < longitudeBands; ++lon) {
        const first = lat * (longitudeBands + 1) + lon;
        const second = first + longitudeBands + 1;
        indices.push(first, second);     // vertical line
        indices.push(first, first + 1);  // horizontal line
      }
    }

    const positionBuffer = device.createBuffer({
      size: positions.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(positionBuffer.getMappedRange()).set(positions);
    positionBuffer.unmap();

    const indexBuffer = device.createBuffer({
      size: indices.length * 2,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Uint16Array(indexBuffer.getMappedRange()).set(indices);
    indexBuffer.unmap();

    // === Uniform Buffer for rotation matrix ===
    const uniformBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    });

    // === Shaders ===
    const vertexShader = `
      struct Uniforms {
        modelMatrix : mat4x4<f32>,
      };
      @group(0) @binding(0) var<uniform> uniforms : Uniforms;

      @vertex
      fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
        return uniforms.modelMatrix * vec4<f32>(position, 1.0);
      }
    `;

    const fragmentShader = `
      @fragment
      fn main() -> @location(0) vec4<f32> {
        return vec4<f32>(1.0, 1.0, 1.0, 1.0); // white
      }
    `;

    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: device.createShaderModule({ code: vertexShader }),
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module: device.createShaderModule({ code: fragmentShader }),
        entryPoint: "main",
        targets: [{ format }],
      },
      primitive: {
        topology: "line-list",
      },
    });

    // === Render Loop ===
    let angle = 0;
    function render() {
      angle += 0.01;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const modelMatrix = new Float32Array([
        cos, 0, -sin, 0,
        0, 1, 0, 0,
        sin, 0, cos, 0,
        0, 0, 0, 1,
      ]);

      device.queue.writeBuffer(uniformBuffer, 0, modelMatrix);

      const commandEncoder = device.createCommandEncoder();
      const textureView = context.getCurrentTexture().createView();

      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, positionBuffer);
      pass.setIndexBuffer(indexBuffer, "uint16");
      pass.drawIndexed(indices.length);
      pass.end();

      device.queue.submit([commandEncoder.finish()]);
      requestAnimationFrame(render);
    }

    render();
  }

  initWebGPU().catch(console.error);
}
