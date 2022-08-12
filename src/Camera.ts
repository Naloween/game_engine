import { vec3, mat4 } from "gl-matrix";

class Camera {
  width: number;
  height: number;

  position: vec3;
  teta: number;
  phi: number;

  aspect: number;
  zNear: number;
  zFar: number;
  fov: number;
  diaphragme: number;

  projectionMatrix: mat4;

  constructor(width: number, height: number, render_distance = 100) {
    this.width = width;
    this.height = height;

    this.position = [0.0, 0.0, 0.0];
    this.teta = 0.0;
    this.phi = Math.PI / 2.0;

    this.aspect = this.width / this.height;
    this.zNear = 0.1;
    this.zFar = render_distance;
    this.fov = (45 * Math.PI) / 180; //in radiant
    this.diaphragme = 1;

    this.projectionMatrix = mat4.create();

    this.update();
  }

  update() {
    mat4.perspective(
      this.projectionMatrix,
      this.fov,
      this.aspect,
      this.zNear,
      this.zFar
    );
    mat4.rotate(
      this.projectionMatrix,
      this.projectionMatrix,
      this.phi,
      [1, 0, 0]
    );
    mat4.rotate(
      this.projectionMatrix,
      this.projectionMatrix,
      this.teta - Math.PI / 2,
      [0, 0, -1]
    );
    mat4.translate(this.projectionMatrix, this.projectionMatrix, this.position);
  }

  getRepere() {
    const u = vec3.fromValues(
      Math.sin(this.phi) * Math.cos(this.teta),
      Math.sin(this.phi) * Math.sin(this.teta),
      Math.cos(this.phi)
    );

    const uy = vec3.fromValues(
      -Math.cos(this.phi) * Math.cos(this.teta),
      -Math.cos(this.phi) * Math.sin(this.teta),
      Math.sin(this.phi)
    );

    // ux produit vectoriel de u et uy

    const ux = vec3.create();
    vec3.cross(ux, u, uy);

    return [u, ux, uy];
  }
}

export { Camera };
