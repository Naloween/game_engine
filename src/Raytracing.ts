import { Camera } from "./Camera";
import { GraphicMode } from "./GraphicMode";
import { vec3 } from "gl-matrix";

import {
  raytracing_vertex_shader_src,
  raytracing_frag_shader_src,
  raytracing_frag_shader_frame_src,
} from "./shaders/RaytracingShaders";

class Raytracing extends GraphicMode {
  shaderProgram: WebGLProgram;
  shaderProgramFrame: WebGLProgram;

  renderTexture0: WebGLTexture;
  renderTexture1: WebGLTexture;
  noiseTexture: WebGLTexture;
  timeLocation: WebGLUniformLocation;
  trianglesCanvasBuffer: WebGLBuffer;
  frameBuffer: WebGLFramebuffer;

  // Raytracing computing

  // textures
  verticesTexture: WebGLTexture;
  trianglesTexture: WebGLTexture;
  objectsTexture: WebGLTexture;
  materialsTexture: WebGLTexture;
  lightSourcesTexture: WebGLTexture;

  // attributes locations
  vertexPositionLocation: number;
  vertexPositionLocationFrame: number;

  // uniforms locations
  cameraPositionLocation: WebGLUniformLocation;
  cameraDirectionLocation: WebGLUniformLocation;
  cameraDirectionXLocation: WebGLUniformLocation;
  cameraDirectionYLocation: WebGLUniformLocation;
  cameraFovLocation: WebGLUniformLocation;
  cameraWidthLocation: WebGLUniformLocation;
  cameraHeightLocation: WebGLUniformLocation;

  verticesLocation: WebGLUniformLocation;
  trianglesLocation: WebGLUniformLocation;
  objectsLocation: WebGLUniformLocation;
  materialsLocation: WebGLUniformLocation;
  lightSourcesLocation: WebGLUniformLocation;
  noiseLocation: WebGLUniformLocation;

  // Frame computing
  renderTextureLocation: WebGLUniformLocation;
  renderTextureLocationFrame: WebGLUniformLocation;
  frameNumberLocationFrame: WebGLUniformLocation;
  frameNumberLocation: WebGLUniformLocation;

  frameNumber = 0;
  previousCameraDirection = vec3.fromValues(0, 0, 0);
  previousCameraPosition = vec3.fromValues(0, 0, 0);

  constructor(gl: WebGL2RenderingContext) {
    super(gl);
  }

  render() {
    // Clear ?
    // this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Clear to fully transparent
    // this.gl.clearDepth(1.0); // Clear everything
    // this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Pingponging render texture

    const index_read = this.frameNumber % 2;
    const index_write = (this.frameNumber + 1) % 2;

    const renderTextures = [this.renderTexture0, this.renderTexture1];

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      renderTextures[index_write],
      0
    );

    this.gl.useProgram(this.shaderProgramFrame);
    this.gl.uniform1i(this.renderTextureLocationFrame, index_write); // texture unit 0 or 1

    this.gl.useProgram(this.shaderProgram);
    this.gl.uniform1i(this.renderTextureLocation, index_read); // texture unit 0 or 1

    // Tell WebGL which indices to use to index the vertices
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);

    // Compute raytracing to texture
    this.gl.useProgram(this.shaderProgram);
    this.gl.uniform1f(this.timeLocation, Date.now() % (2 * Math.PI)); // sending current time to GPU
    this.gl.uniform1f(this.frameNumberLocation, this.frameNumber); // sending current frame to GPU
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
    // this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    // Draw to canvas
    this.gl.useProgram(this.shaderProgramFrame);
    this.gl.uniform1f(this.frameNumberLocationFrame, this.frameNumber); // sending current frame to GPU
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    this.frameNumber++;
  }

  load() {
    this.initShaderProgram()!;

    // locations: link buffers to shader program
    this.loadBuffers();
    this.loadLocations();
    this.loadTextures();

    this.frameBuffer = this.gl.createFramebuffer()!;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      this.renderTexture0,
      0
    );

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  initShaderProgram() {
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let fragmentShaderFrame: WebGLShader | null = null;

    vertexShader = this.loadShader(
      this.gl.VERTEX_SHADER,
      raytracing_vertex_shader_src
    );
    fragmentShader = this.loadShader(
      this.gl.FRAGMENT_SHADER,
      raytracing_frag_shader_src
    );
    fragmentShaderFrame = this.loadShader(
      this.gl.FRAGMENT_SHADER,
      raytracing_frag_shader_frame_src
    );

    // Créer le programme shader

    if (
      vertexShader == null ||
      fragmentShader == null ||
      fragmentShaderFrame == null
    ) {
      console.log("error: vertex shader or fragment shader is null");
      return null;
    }

    this.shaderProgram = this.gl.createProgram()!;
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    // Si la création du programme shader a échoué, alerte

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      alert(
        "Impossible d'initialiser le programme shader : " +
          this.gl.getProgramInfoLog(this.shaderProgram)
      );
      return null;
    }

    // Frame programme

    this.shaderProgramFrame = this.gl.createProgram()!;
    this.gl.attachShader(this.shaderProgramFrame, vertexShader);
    this.gl.attachShader(this.shaderProgramFrame, fragmentShaderFrame);
    this.gl.linkProgram(this.shaderProgramFrame);

    // Si la création du programme shader a échoué, alerte

    if (
      !this.gl.getProgramParameter(this.shaderProgramFrame, this.gl.LINK_STATUS)
    ) {
      alert(
        "Impossible d'initialiser le programme shader frame : " +
          this.gl.getProgramInfoLog(this.shaderProgramFrame)
      );
      return null;
    }
  }

  loadBuffers() {
    this.trianglesCanvasBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 0, -1, 1, 0, 1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0,
      ]),
      this.gl.STATIC_DRAW
    );
  }

  loadLocations() {
    // uniforms locations
    this.cameraPositionLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uCameraPosition"
    )!;
    this.cameraDirectionLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uCameraDirection"
    )!;
    this.cameraDirectionXLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uCameraDirectionX"
    )!;
    this.cameraDirectionYLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uCameraDirectionY"
    )!;
    this.cameraFovLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uCameraFov"
    )!;
    this.cameraWidthLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uCameraWidth"
    )!;
    this.cameraHeightLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uCameraHeight"
    )!;

    this.timeLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uTime"
    )!;

    //textures
    this.verticesLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uVertices"
    )!;
    this.trianglesLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uTriangles"
    )!;
    this.objectsLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uObjects"
    )!;
    this.materialsLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uMaterials"
    )!;
    this.lightSourcesLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uLightSources"
    )!;
    this.noiseLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uNoiseTexture"
    )!;

    this.renderTextureLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uRenderTexture"
    )!;
    this.renderTextureLocationFrame = this.gl.getUniformLocation(
      this.shaderProgramFrame,
      "uRenderTexture"
    )!;
    this.frameNumberLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uFrameNumber"
    )!;
    this.frameNumberLocationFrame = this.gl.getUniformLocation(
      this.shaderProgramFrame,
      "uFrameNumber"
    )!;

    // attributes locations
    this.vertexPositionLocation = this.gl.getAttribLocation(
      this.shaderProgram,
      "aVertexPosition"
    );
    // this.vertexPositionLocationFrame = this.gl.getAttribLocation(
    //   this.shaderProgramFrame, // !!!!!! shaderProgram & shaderProgramFrame !!!!!!
    //   "aVertexPosition"
    // );

    // set attribute location to corresponding buffer with iteration parameters
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
    this.gl.vertexAttribPointer(
      this.vertexPositionLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(this.vertexPositionLocation);
  }

  loadTextures() {
    this.verticesTexture = this.gl.createTexture()!;
    this.trianglesTexture = this.gl.createTexture()!;
    this.objectsTexture = this.gl.createTexture()!;
    this.materialsTexture = this.gl.createTexture()!;
    this.lightSourcesTexture = this.gl.createTexture()!;
    this.noiseTexture = this.gl.createTexture()!;

    this.renderTexture0 = this.gl.createTexture()!;
    this.renderTexture1 = this.gl.createTexture()!;

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture0);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32UI,
      this.gl.canvas.width,
      this.gl.canvas.height,
      0,
      this.gl.RGBA_INTEGER,
      this.gl.UNSIGNED_INT,
      null
    );
    // this.gl.texParameteri(
    //   this.gl.TEXTURE_2D,
    //   this.gl.TEXTURE_MIN_FILTER,
    //   this.gl.LINEAR
    // );
    // this.gl.texParameteri(
    //   this.gl.TEXTURE_2D,
    //   this.gl.TEXTURE_WRAP_S,
    //   this.gl.CLAMP_TO_EDGE
    // );
    // this.gl.texParameteri(
    //   this.gl.TEXTURE_2D,
    //   this.gl.TEXTURE_WRAP_T,
    //   this.gl.CLAMP_TO_EDGE
    // );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture1);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32UI,
      this.gl.canvas.width,
      this.gl.canvas.height,
      0,
      this.gl.RGBA_INTEGER,
      this.gl.UNSIGNED_INT,
      null
    );
    // this.gl.texParameteri(
    //   this.gl.TEXTURE_2D,
    //   this.gl.TEXTURE_MIN_FILTER,
    //   this.gl.LINEAR
    // );
    // this.gl.texParameteri(
    //   this.gl.TEXTURE_2D,
    //   this.gl.TEXTURE_WRAP_S,
    //   this.gl.CLAMP_TO_EDGE
    // );
    // this.gl.texParameteri(
    //   this.gl.TEXTURE_2D,
    //   this.gl.TEXTURE_WRAP_T,
    //   this.gl.CLAMP_TO_EDGE
    // );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.verticesTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      4,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10])
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    this.gl.activeTexture(this.gl.TEXTURE3);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.trianglesTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32UI,
      2,
      1,
      0,
      this.gl.RGB_INTEGER,
      this.gl.UNSIGNED_INT,
      new Uint32Array([0, 1, 2, 0, 1, 3])
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    this.gl.activeTexture(this.gl.TEXTURE4);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.objectsTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      1,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array([0, 2, 0, 0, 0, 0, 1, 1, 1])
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    this.gl.activeTexture(this.gl.TEXTURE5);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.materialsTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      5,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0])
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    this.gl.activeTexture(this.gl.TEXTURE6);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightSourcesTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      2,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array([0, 0, 0, 0, 0, 0])
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    const noise_width = this.gl.canvas.width;
    const noise_height = this.gl.canvas.height;
    const noise_data: number[] = [];

    for (let i = 0; i < noise_width; i++) {
      for (let j = 0; j < noise_height; j++) {
        noise_data.push(Math.random());
        noise_data.push(Math.random());
        noise_data.push(Math.random());
      }
    }

    this.gl.activeTexture(this.gl.TEXTURE7);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noiseTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      noise_width,
      noise_height,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array(noise_data)
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );

    this.gl.useProgram(this.shaderProgramFrame);
    this.gl.uniform1i(this.renderTextureLocationFrame, 0); // texture unit 0

    this.gl.useProgram(this.shaderProgram);
    this.gl.uniform1i(this.renderTextureLocation, 1); // texture unit 1
    this.gl.uniform1i(this.verticesLocation, 2); // texture unit 2
    this.gl.uniform1i(this.trianglesLocation, 3); // texture unit 3
    this.gl.uniform1i(this.objectsLocation, 4); // texture unit 4
    this.gl.uniform1i(this.materialsLocation, 5); // texture unit 5
    this.gl.uniform1i(this.lightSourcesLocation, 6); // texture unit 6
    this.gl.uniform1i(this.noiseLocation, 7); // texture unit 7
  }

  setTextures(
    vertices: number[],
    triangles: number[],
    objects: number[],
    materials: number[],
    light_sources: number[]
  ) {
    console.log("Max :" + this.gl.MAX_TEXTURE_SIZE * 4);
    console.log(
      "Current : " +
        Math.max(vertices.length, objects.length, triangles.length) / 3
    );

    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.verticesTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      vertices.length / 3,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array(vertices)
    );

    this.gl.activeTexture(this.gl.TEXTURE3);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.trianglesTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32UI,
      triangles.length / 3,
      1,
      0,
      this.gl.RGB_INTEGER,
      this.gl.UNSIGNED_INT,
      new Uint32Array(triangles)
    );

    this.gl.activeTexture(this.gl.TEXTURE4);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.objectsTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      objects.length / 3,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array(objects)
    );

    this.gl.activeTexture(this.gl.TEXTURE5);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.materialsTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      materials.length / 3,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array(materials)
    );

    this.gl.activeTexture(this.gl.TEXTURE6);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightSourcesTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGB32F,
      light_sources.length / 3,
      1,
      0,
      this.gl.RGB,
      this.gl.FLOAT,
      new Float32Array(light_sources)
    );
  }

  setCameraUniforms(camera: Camera) {
    this.gl.useProgram(this.shaderProgram);
    // Set the shader uniform camera direction
    const [direction, ux, uy] = camera.getRepere();
    this.gl.uniform3f(
      this.cameraDirectionLocation,
      direction[0],
      direction[1],
      direction[2]
    );
    this.gl.uniform3f(this.cameraDirectionXLocation, ux[0], ux[1], ux[2]);
    this.gl.uniform3f(this.cameraDirectionYLocation, uy[0], uy[1], uy[2]);

    this.gl.uniform1f(this.cameraFovLocation, camera.fov);
    this.gl.uniform1f(this.cameraWidthLocation, camera.width);
    this.gl.uniform1f(this.cameraHeightLocation, camera.height);
    // Set the shader uniform camera position
    this.gl.uniform3f(
      this.cameraPositionLocation,
      camera.position[0],
      camera.position[1],
      camera.position[2]
    );

    if (
      this.previousCameraDirection[0] != direction[0] ||
      this.previousCameraDirection[1] != direction[1] ||
      this.previousCameraDirection[2] != direction[2] ||
      this.previousCameraPosition[0] != camera.position[0] ||
      this.previousCameraPosition[1] != camera.position[1] ||
      this.previousCameraPosition[2] != camera.position[2]
    ) {
      this.frameNumber = 1;
    }

    this.previousCameraDirection = direction;
    this.previousCameraPosition = camera.position;
  }
}

// class Raytracing extends GraphicMode {
//   shaderProgram: WebGLProgram;
//   shaderProgramFrame: WebGLProgram;

//   renderTexture: WebGLTexture;
//   timeLocation: WebGLUniformLocation;
//   trianglesCanvasBuffer: WebGLBuffer;
//   frameBuffer: WebGLFramebuffer;

//   // attributes locations
//   vertexPositionLocation: number;

//   // Frame computing
//   renderTextureLocation: WebGLUniformLocation;
//   frameNumberLocation: WebGLUniformLocation;

//   frameNumber = 0;
//   previousCameraDirection = vec3.fromValues(0, 0, 0);

//   constructor(gl: WebGL2RenderingContext) {
//     super(gl);
//   }

//   render() {
//     // Clear ?
//     // this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Clear to fully transparent
//     // this.gl.clearDepth(1.0); // Clear everything
//     // this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

//     // Tell WebGL which indices to use to index the vertices
//     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);

//     // Compute raytracing to texture
//     // this.gl.useProgram(this.shaderProgram);
//     // this.gl.uniform1f(this.timeLocation, Date.now() % (2 * Math.PI)); // sending current time to GPU
//     // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
//     // this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

//     // Draw to canvas
//     this.gl.useProgram(this.shaderProgramFrame);
//     this.gl.uniform1f(this.frameNumberLocation, this.frameNumber); // sending current time to GPU
//     this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
//     this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

//     this.frameNumber++;
//   }

//   load() {
//     this.initShaderProgram()!;

//     // locations: link buffers to shader program
//     this.loadBuffers();
//     this.loadTextures();
//     this.loadLocations();

//     this.frameBuffer = this.gl.createFramebuffer()!;
//     this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
//     this.gl.framebufferTexture2D(
//       this.gl.FRAMEBUFFER,
//       this.gl.COLOR_ATTACHMENT0,
//       this.gl.TEXTURE_2D,
//       this.renderTexture,
//       0
//     );

//     this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
//   }

//   initShaderProgram() {
//     let vertexShader: WebGLShader | null = null;
//     let fragmentShader: WebGLShader | null = null;
//     let fragmentShaderFrame: WebGLShader | null = null;

//     vertexShader = this.loadShader(
//       this.gl.VERTEX_SHADER,
//       raytracing_vertex_shader_src
//     );
//     fragmentShader = this.loadShader(
//       this.gl.FRAGMENT_SHADER,
//       raytracing_frag_shader_src
//     );
//     fragmentShaderFrame = this.loadShader(
//       this.gl.FRAGMENT_SHADER,
//       raytracing_frag_shader_frame_src
//     );

//     // Créer le programme shader

//     if (
//       vertexShader == null ||
//       fragmentShader == null ||
//       fragmentShaderFrame == null
//     ) {
//       console.log("error: vertex shader or fragment shader is null");
//       return null;
//     }

//     // this.shaderProgram = this.gl.createProgram()!;
//     // this.gl.attachShader(this.shaderProgram, vertexShader);
//     // this.gl.attachShader(this.shaderProgram, fragmentShader);
//     // this.gl.linkProgram(this.shaderProgram);

//     // // Si la création du programme shader a échoué, alerte

//     // if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
//     //   alert(
//     //     "Impossible d'initialiser le programme shader : " +
//     //       this.gl.getProgramInfoLog(this.shaderProgram)
//     //   );
//     //   return null;
//     // }

//     // Frame programme

//     this.shaderProgramFrame = this.gl.createProgram()!;
//     this.gl.attachShader(this.shaderProgramFrame, vertexShader);
//     this.gl.attachShader(this.shaderProgramFrame, fragmentShaderFrame);
//     this.gl.linkProgram(this.shaderProgramFrame);

//     // Si la création du programme shader a échoué, alerte

//     if (
//       !this.gl.getProgramParameter(this.shaderProgramFrame, this.gl.LINK_STATUS)
//     ) {
//       alert(
//         "Impossible d'initialiser le programme shader frame : " +
//           this.gl.getProgramInfoLog(this.shaderProgramFrame)
//       );
//       return null;
//     }
//   }

//   loadBuffers() {
//     this.trianglesCanvasBuffer = this.gl.createBuffer()!;
//     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
//     this.gl.bufferData(
//       this.gl.ARRAY_BUFFER,
//       new Float32Array([
//         -1, -1, 0, -1, 1, 0, 1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0,
//       ]),
//       this.gl.STATIC_DRAW
//     );
//   }

//   loadTextures() {
//     this.renderTexture = this.gl.createTexture()!;

//     this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture);
//     this.gl.texImage2D(
//       this.gl.TEXTURE_2D,
//       0,
//       this.gl.RGB,
//       1,
//       1,
//       0,
//       this.gl.RGB,
//       this.gl.UNSIGNED_BYTE,
//       new Uint8Array([255, 0, 0])
//     );

//     // Textures parameters

//     this.gl.activeTexture(this.gl.TEXTURE5);
//     this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture);
//     this.gl.texParameteri(
//       this.gl.TEXTURE_2D,
//       this.gl.TEXTURE_MAG_FILTER,
//       this.gl.NEAREST
//     );
//     this.gl.texParameteri(
//       this.gl.TEXTURE_2D,
//       this.gl.TEXTURE_MIN_FILTER,
//       this.gl.LINEAR
//     );
//     this.gl.texParameteri(
//       this.gl.TEXTURE_2D,
//       this.gl.TEXTURE_WRAP_S,
//       this.gl.CLAMP_TO_EDGE
//     );
//     this.gl.texParameteri(
//       this.gl.TEXTURE_2D,
//       this.gl.TEXTURE_WRAP_T,
//       this.gl.CLAMP_TO_EDGE
//     );

//     this.gl.useProgram(this.shaderProgramFrame);
//     this.gl.uniform1i(this.renderTextureLocation, 5); // texture unit 5
//   }

//   loadLocations() {
//     this.renderTextureLocation = this.gl.getUniformLocation(
//       this.shaderProgramFrame,
//       "uRenderTexture"
//     )!;
//     this.frameNumberLocation = this.gl.getUniformLocation(
//       this.shaderProgramFrame,
//       "uFrameNumber"
//     )!;
//     // attributes locations
//     this.vertexPositionLocation = this.gl.getAttribLocation(
//       this.shaderProgramFrame, // !!!!!! shaderProgram & shaderProgramFrame !!!!!!
//       "aVertexPosition"
//     );

//     // set attribute location to corresponding buffer with iteration parameters
//     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
//     this.gl.vertexAttribPointer(
//       this.vertexPositionLocation,
//       3,
//       this.gl.FLOAT,
//       false,
//       0,
//       0
//     );
//     this.gl.enableVertexAttribArray(this.vertexPositionLocation);
//   }

//   setTextures(
//     vertices: number[],
//     triangles: number[],
//     objects: number[],
//     materials: number[],
//     light_sources: number[]
//   ) {
//     console.log("Max :" + this.gl.MAX_TEXTURE_SIZE * 4);
//     console.log(
//       "Current : " +
//         Math.max(vertices.length, objects.length, triangles.length) / 3
//     );
//   }

//   setCameraUniforms(camera: Camera) {
//     // Set the shader uniform camera direction
//     const [direction, ux, uy] = camera.getRepere();
//     // this.gl.uniform3f(
//     //   this.cameraDirectionLocation,
//     //   direction[0],
//     //   direction[1],
//     //   direction[2]
//     // );
//     // this.gl.uniform3f(this.cameraDirectionXLocation, ux[0], ux[1], ux[2]);
//     // this.gl.uniform3f(this.cameraDirectionYLocation, uy[0], uy[1], uy[2]);

//     // this.gl.uniform1f(this.cameraFovLocation, camera.fov);
//     // this.gl.uniform1f(this.cameraWidthLocation, camera.width);
//     // this.gl.uniform1f(this.cameraHeightLocation, camera.height);
//     // // Set the shader uniform camera position
//     // this.gl.uniform3f(
//     //   this.cameraPositionLocation,
//     //   camera.position[0],
//     //   camera.position[1],
//     //   camera.position[2]
//     // );

//     if (this.previousCameraDirection[0] != direction[0]) {
//       this.frameNumber = 0;
//       this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuffer);
//       this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
//     }

//     this.previousCameraDirection = direction;
//   }
// }

export { Raytracing };
