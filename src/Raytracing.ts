import { Camera } from "./Camera";
import { GraphicMode } from "./GraphicMode";

import {
  raytracing_vertex_shader_src,
  raytracing_frag_shader_src,
} from "./shaders/RaytracingShaders";

class Raytracing extends GraphicMode {
  // buffers
  trianglesCanvasBuffer: WebGLBuffer;

  // textures
  verticesTexture: WebGLTexture;
  trianglesTexture: WebGLTexture;
  objectsTexture: WebGLTexture;
  materialsTexture: WebGLTexture;
  lightSourcesTexture: WebGLTexture;

  // attributes locations
  vertexPositionLocation: number;

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

  timeLocation: WebGLUniformLocation;

  constructor(gl: WebGL2RenderingContext) {
    super(gl);
  }

  render() {
    this.gl.uniform1f(this.timeLocation, Date.now() % (2 * Math.PI)); // sending current time to GPU

    this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Clear to fully transparent
    this.gl.clearDepth(1.0); // Clear everything

    // Clear the canvas before we start drawing on it.
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Tell WebGL which indices to use to index the vertices
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  load() {
    this.shaderProgram = this.initShaderProgram()!;
    this.gl.useProgram(this.shaderProgram);

    // locations: link buffers to shader program
    this.loadBuffers();
    this.loadTextures();
    this.loadLocations();
  }

  initShaderProgram() {
    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;

    vertexShader = this.loadShader(
      this.gl.VERTEX_SHADER,
      raytracing_vertex_shader_src
    );
    fragmentShader = this.loadShader(
      this.gl.FRAGMENT_SHADER,
      raytracing_frag_shader_src
    );

    // Créer le programme shader

    if (vertexShader == null || fragmentShader == null) {
      console.log("error: vertex shader or fragment shader is null");
      return null;
    }

    const shaderProgram = this.gl.createProgram()!;
    this.gl.attachShader(shaderProgram, vertexShader);
    this.gl.attachShader(shaderProgram, fragmentShader);
    this.gl.linkProgram(shaderProgram);

    // Si la création du programme shader a échoué, alerte

    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      alert(
        "Impossible d'initialiser le programme shader : " +
          this.gl.getProgramInfoLog(shaderProgram)
      );
      return null;
    }

    return shaderProgram;
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

  loadTextures() {
    this.verticesTexture = this.gl.createTexture()!;
    this.trianglesTexture = this.gl.createTexture()!;
    this.objectsTexture = this.gl.createTexture()!;
    this.materialsTexture = this.gl.createTexture()!;
    this.lightSourcesTexture = this.gl.createTexture()!;

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
      new Float32Array([100, 100, 100, 0, 0, 0])
    );

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.verticesTexture);
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
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.trianglesTexture);
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
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.objectsTexture);
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
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.materialsTexture);
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
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightSourcesTexture);
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

    this.materialsLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uMaterials"
    )!;
    this.lightSourcesLocation = this.gl.getUniformLocation(
      this.shaderProgram,
      "uLightSources"
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
    this.gl.uniform1i(this.verticesLocation, 0); // texture unit 0
    this.gl.uniform1i(this.trianglesLocation, 1); // texture unit 1
    this.gl.uniform1i(this.objectsLocation, 2); // texture unit 2
    this.gl.uniform1i(this.materialsLocation, 3); // texture unit 3
    this.gl.uniform1i(this.lightSourcesLocation, 4); // texture unit 4

    // attributes locations
    this.vertexPositionLocation = this.gl.getAttribLocation(
      this.shaderProgram,
      "aVertexPosition"
    );

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
      -camera.position[0],
      -camera.position[1],
      -camera.position[2]
    );
  }
}

export { Raytracing };
