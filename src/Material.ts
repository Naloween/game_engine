import { vec3 } from "gl-matrix";

class Material {
  static next_id = 0;

  id: number;

  albedo: vec3; // the color of the material (for diffusion)
  transparency: vec3; // the transparency of the material percentage that get out for 1m
  emmissive: vec3; // amount of light emited for rgb
  metallic: number; //reflection irror like
  roughness: number;
  ior: number; // index of refraction ou IOR

  array_index = -1;

  constructor(
    albedo: vec3 = [0, 0, 0],
    transparency: vec3 = [0, 0, 0],
    emmissive: vec3 = [0, 0, 0],
    metallic: number = 0,
    roughness: number = 0,
    ior: number = 1
  ) {
    this.albedo = albedo; // diffusion pour chaque couleur, entre 0 (transparent) et 1 (opaque)
    this.transparency = transparency;
    this.emmissive = emmissive;
    this.metallic = metallic; // entre 0 et 1
    this.roughness = roughness;
    this.ior = ior; //n1*sin(i) = n2*sin(r)

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
    materials.push(this.emmissive[0]);
    materials.push(this.emmissive[1]);
    materials.push(this.emmissive[2]);
    materials.push(this.metallic);
    materials.push(this.roughness);
    materials.push(this.ior);
  }
}

export { Material };
