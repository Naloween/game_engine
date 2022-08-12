import { vec3 } from "gl-matrix";
import { Material } from "./Material";

class Mesh {
  triangles: vec3[];
  vertices: vec3[];
  triangle_index = -1;

  constructor(vertices: vec3[], triangles: vec3[]) {
    this.triangles = triangles;
    this.vertices = [];

    const min_point = vec3.fromValues(Infinity, Infinity, Infinity);
    const max_point = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    for (let vertex of vertices) {
      if (vertex[0] < min_point[0]) {
        min_point[0] = vertex[0];
      }
      if (vertex[0] > max_point[0]) {
        max_point[0] = vertex[0];
      }

      if (vertex[1] < min_point[1]) {
        min_point[1] = vertex[1];
      }
      if (vertex[1] > max_point[1]) {
        max_point[1] = vertex[1];
      }

      if (vertex[2] < min_point[2]) {
        min_point[2] = vertex[2];
      }
      if (vertex[2] > max_point[2]) {
        max_point[2] = vertex[2];
      }
    }

    const scale = vec3.fromValues(
      max_point[0] - min_point[0],
      max_point[1] - min_point[1],
      max_point[2] - min_point[2]
    );

    for (let vertex of vertices) {
      this.vertices.push(
        vec3.fromValues(
          (vertex[0] - min_point[0]) / (scale[0] > 0 ? scale[0] : 0),
          (vertex[1] - min_point[1]) / (scale[1] > 0 ? scale[1] : 0),
          (vertex[2] - min_point[2]) / (scale[2] > 0 ? scale[2] : 0)
        )
      );
    }

    console.log(min_point);
    console.log(max_point);
  }

  load(vertices: number[], triangles: number[]) {
    if (this.triangle_index < 0) {
      this.triangle_index = triangles.length / 3;
      const start_vertices_index = vertices.length / 3;

      for (let vertex of this.vertices) {
        vertices.push(-vertex[0]);
        vertices.push(-vertex[1]);
        vertices.push(-vertex[2]);
      }
      for (let triangle of this.triangles) {
        triangles.push(start_vertices_index + triangle[0]);
        triangles.push(start_vertices_index + triangle[1]);
        triangles.push(start_vertices_index + triangle[2]);
      }
    }
  }

  getMinMax(): [vec3, vec3] {
    const min_point = vec3.fromValues(Infinity, Infinity, Infinity);
    const max_point = vec3.fromValues(-Infinity, -Infinity, -Infinity);

    for (let triangle of this.triangles) {
      for (let i = 0; i < 3; i++) {
        const vertex = this.vertices[triangle[i]];

        for (let j = 0; j < 3; j++) {
          if (vertex[i] < min_point[i]) {
            min_point[i] = vertex[i];
          }

          if (vertex[i] > max_point[i]) {
            max_point[i] = vertex[i];
          }
        }
      }
    }

    return [min_point, max_point];
  }
}

class GameObject {
  position: vec3;
  dimensions: vec3;

  mesh: Mesh;
  parent_object: GameObject | null = null;
  innerObjects: GameObject[] = [];
  material: Material;

  array_index = -1;

  constructor(
    position: vec3,
    dimensions: vec3,
    mesh: Mesh,
    material: Material
  ) {
    this.position = position;
    this.dimensions = dimensions;
    this.mesh = mesh;
    this.material = material;
  }

  addInnerObject(object: GameObject) {
    object.parent_object = this;
    this.innerObjects.push(object);
  }

  load(
    objects_array: number[],
    vertices: number[],
    triangles: number[],
    materials: number[]
  ) {
    this.mesh.load(vertices, triangles);
    this.material.load(materials);

    objects_array.push(
      this.innerObjects.length > 0 ? this.innerObjects[0].array_index * 4 : 0
    );
    objects_array.push(this.innerObjects.length);
    objects_array.push(
      this.parent_object == null ? -1 : this.parent_object.array_index * 4
    );

    objects_array.push(this.mesh.triangle_index);
    objects_array.push(this.mesh.triangles.length);
    objects_array.push(this.material.array_index);

    objects_array.push(-this.position[0]);
    objects_array.push(-this.position[1]);
    objects_array.push(-this.position[2]);

    objects_array.push(this.dimensions[0] + 0.2);
    objects_array.push(this.dimensions[1] + 0.2);
    objects_array.push(this.dimensions[2] + 0.2);
  }
}

export { GameObject, Mesh };
