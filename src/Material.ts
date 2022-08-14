import { vec3 } from "gl-matrix";

class Material {
  static next_id = 0;

  id: number;

  albedo: vec3; // the color of the material (for diffusion)
  metallic: vec3; //reflection irror like
  roughness: vec3;
  transparency: vec3; // the transparency of the material percentage that get out for 1m
  ior: vec3; // index of refraction ou IOR
  emmissive: vec3; // amount of light emited for rgb
  array_index = -1;

  constructor(
    albedo: vec3 = [1, 1, 1],
    metallic: vec3 = [0, 0, 0],
    roughness: vec3 = [0, 0, 0],
    transparency: vec3 = [0, 0, 0],
    ior: vec3 = [1, 1, 1],
    emmissive: vec3 = [0, 0, 0]
  ) {
    this.albedo = albedo; // diffusion pour chaque couleur, entre 0 (transparent) et 1 (opaque)
    this.metallic = metallic; // entre 0 et 1
    this.roughness = roughness;
    this.transparency = transparency;
    this.ior = ior; //n1*sin(i) = n2*sin(r)
    this.emmissive = emmissive;

    this.id = -1;
  }

  load(materials: number[]) {
    if (this.array_index < 0) {
      this.array_index = materials.length / 3;
    }
    materials.push(this.albedo[0]);
    materials.push(this.albedo[1]);
    materials.push(this.albedo[2]);
    materials.push(this.transparency[0]);
    materials.push(this.transparency[1]);
    materials.push(this.transparency[2]);
    materials.push(this.metallic[0]);
    materials.push(this.metallic[1]);
    materials.push(this.metallic[2]);
    materials.push(this.roughness[0]);
    materials.push(this.roughness[1]);
    materials.push(this.roughness[2]);
    materials.push(this.ior[0]);
    materials.push(this.ior[1]);
    materials.push(this.ior[2]);
    materials.push(this.emmissive[0]);
    materials.push(this.emmissive[1]);
    materials.push(this.emmissive[2]);
  }
}

export { Material };
