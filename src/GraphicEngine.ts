import { Camera } from "./Camera";
import { GraphicMode } from "./GraphicMode";
import { Raytracing } from "./Raytracing";

class GraphicEngine {
  gl: WebGL2RenderingContext;
  mode: GraphicMode;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.mode = new Raytracing(gl);
    this.mode.load();
  }

  render() {
    this.mode.render();
  }

  setTextures(
    vertices: number[],
    triangles: number[],
    objects: number[],
    materials: number[],
    light_sources: number[]
  ) {
    this.mode.setTextures(
      vertices,
      triangles,
      objects,
      materials,
      light_sources
    );
  }

  setCameraUniforms(camera: Camera) {
    this.mode.setCameraUniforms(camera);
  }
}

export { GraphicEngine };
