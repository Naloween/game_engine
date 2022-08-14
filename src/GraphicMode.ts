import { Camera } from "./Camera";

class GraphicMode {
  gl: WebGL2RenderingContext;
  shaderProgram: WebGLProgram;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  load() {}

  render() {}

  setCameraUniforms(camera: Camera) {}
  setTextures(
    vertices: number[],
    triangles: number[],
    objects: number[],
    materials: number[],
    light_sources: number[]
  ) {}

  loadShader(type: number, source: string) {
    // Crée un shader du type fourni, charge le source et le compile.

    const shader = this.gl.createShader(type)!;

    // Envoyer le source à l'objet shader
    this.gl.shaderSource(shader, source);

    // Compiler le programme shader
    this.gl.compileShader(shader);

    // Vérifier s'il a été compilé avec succès
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert(
        "An error occurred compiling the shaders: " +
          this.gl.getShaderInfoLog(shader)
      );
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }
}

export { GraphicMode };
