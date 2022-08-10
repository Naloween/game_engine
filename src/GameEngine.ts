// import * as te from "./triangle_engine.js";
// import * as mat4 from "./glMatrix/src/mat4.js";
// import * as vec3 from "./glMatrix/src/vec3.js";

import { Camera, GraphicEngine } from "./GraphicEngine";
import { vec3, mat4 } from "gl-matrix";

class Player {
  position: vec3;
  vitesse = vec3.create();
  teta: number;
  phi: number;

  u = vec3.create();
  ux = vec3.create();
  uy = vec3.create();

  move_speed = 2;

  // events

  sensibilite = 0.0003;

  rendering = false;
  mouse_movement_x = 0;
  mouse_movement_y = 0;

  change_mode = false;
  move_left = false;
  move_right = false;
  move_front = false;
  move_back = false;
  move_up = false;
  move_down = false;

  constructor(position: vec3, teta: number, phi: number) {
    this.position = position;
    this.teta = teta;
    this.phi = phi;

    this.update();
  }

  update() {
    this.u = vec3.fromValues(
      Math.sin(this.phi) * Math.cos(this.teta),
      Math.sin(this.phi) * Math.sin(this.teta),
      Math.cos(this.phi)
    );

    this.uy = vec3.fromValues(
      -Math.cos(this.phi) * Math.cos(this.teta),
      -Math.cos(this.phi) * Math.sin(this.teta),
      Math.sin(this.phi)
    );

    // ux produit vectoriel de u et uy

    this.ux = vec3.create();
    vec3.cross(this.ux, this.u, this.uy);
  }

  move(dt: number) {
    // Mouse

    this.teta += this.sensibilite * this.mouse_movement_x;
    this.phi += this.sensibilite * this.mouse_movement_y;

    this.mouse_movement_x = 0;
    this.mouse_movement_y = 0;

    this.update();

    // Movements

    let vitesse: vec3 = [this.vitesse[0], this.vitesse[1], this.vitesse[2]];

    if (this.move_left) {
      vec3.scaleAndAdd(vitesse, vitesse, this.ux, this.move_speed);
    }
    if (this.move_right) {
      vec3.scaleAndAdd(vitesse, vitesse, this.ux, -this.move_speed);
    }
    if (this.move_front) {
      vec3.scaleAndAdd(vitesse, vitesse, this.u, this.move_speed);
    }
    if (this.move_back) {
      vec3.scaleAndAdd(vitesse, vitesse, this.u, -this.move_speed);
    }
    if (this.move_up) {
      this.vitesse[2] = 0;
      vitesse[2] += this.move_speed;
    }
    if (this.move_down) {
      this.vitesse[2] = 0;
      vitesse[2] -= this.move_speed;
    }

    vec3.scaleAndAdd(this.position, this.position, vitesse, dt);
  }
}

class Material {
  static next_id = 0;

  id: number;

  albedo: vec3; // the color of the material (for diffusion)
  metallic: vec3; //reflection irror like
  roughness: vec3;
  transparency: vec3; // the transparency of the material percentage that get out for 1m
  ior: vec3; // index of refraction ou IOR
  emmissive: vec3; // amount of light emited for rgb

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
}

class Light {
  static next_id = 0;

  id: number;
  power: number;
  color: vec3;
  position: vec3;

  constructor(power: number, color: vec3, position: vec3) {
    this.power = power;
    this.color = color;
    this.position = position;
    this.id = -1;
  }

  toArray() {
    let result = [this.power];
    result.push(this.color[0]);
    result.push(this.color[1]);
    result.push(this.color[2]);
    result.push(this.position[0]);
    result.push(this.position[1]);
    result.push(this.position[2]);

    return result;
  }
}

class GameObject {
  position: vec3;
  dimensions: vec3;

  triangles: vec3[];
  vertices: vec3[];
  parent_object: GameObject | null = null;
  innerObjects: GameObject[] = [];
  material: Material;

  array_index = -1;

  constructor(
    position: vec3,
    dimensions: vec3,
    vertices: vec3[],
    triangles: vec3[],
    material: Material
  ) {
    this.position = position;
    this.dimensions = dimensions;
    this.vertices = vertices;
    this.triangles = triangles;
    this.material = material;
  }

  addInnerObject(object: GameObject) {
    object.parent_object = this;
    this.innerObjects.push(object);
  }
}

class GameEngine {
  //Graphic engine
  camera: Camera;
  engine: GraphicEngine;

  player: Player;
  view: HTMLElement;

  dt_fps = 0;
  previousTimeStamp = 0;
  fps = 0;

  objects: GameObject[] = [];
  lights: Light[] = [];

  constructor(view: HTMLCanvasElement, player: Player) {
    this.player = player;
    this.view = view;

    //camera
    const width = 1000;
    const height = 600;

    const render_distance = 1000;

    this.camera = new Camera(width, height, render_distance);

    //Graphic engine
    this.engine = new GraphicEngine(view.getContext("webgl2")!);

    this.generate_world();

    this.load_mode("Raytracing");

    // Events
    this.load_events();
  }

  load_mode(mode: "Rasterization" | "Raytracing") {
    this.engine.loadMode(mode);

    const TransformMatrix = mat4.create();
    this.engine.setTransformVertices(TransformMatrix);
    this.engine.setCameraUniforms(this.camera);
    this.engine.setCurrentMaterialUniforms([0.99, 0.99, 0.99], [1, 1, 1]);

    this.engine.render();
  }

  load_events() {
    //lock view
    this.view.addEventListener("click", (event) => {
      if (event.button == 0) {
        this.view.requestPointerLock();
      }
    });

    // Player control
    window.addEventListener("keydown", (event) => {
      if (event.code == "AltLeft") {
        this.player.change_mode = true;
      } else if (event.code == "KeyW") {
        this.player.move_front = true;
      } else if (event.code == "KeyS") {
        this.player.move_back = true;
      } else if (event.code == "KeyA") {
        this.player.move_left = true;
      } else if (event.code == "KeyD") {
        this.player.move_right = true;
      } else if (event.code == "Space") {
        this.player.move_up = true;
      } else if (event.code == "ShiftLeft") {
        this.player.move_down = true;
      } else if (event.code == "ArrowUp") {
        this.player.move_speed *= 2;
      } else if (event.code == "ArrowDown") {
        this.player.move_speed /= 2;
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.code == "AltLeft") {
        this.player.change_mode = false;
      } else if (event.code == "KeyW") {
        this.player.move_front = false;
      } else if (event.code == "KeyS") {
        this.player.move_back = false;
      } else if (event.code == "KeyA") {
        this.player.move_left = false;
      } else if (event.code == "KeyD") {
        this.player.move_right = false;
      } else if (event.code == "Space") {
        this.player.move_up = false;
      } else if (event.code == "ShiftLeft") {
        this.player.move_down = false;
      }
    });

    document.addEventListener(
      "pointerlockchange",
      (() => {
        if (document.pointerLockElement === this.view) {
          if (!this.player.rendering) {
            this.player.rendering = true;
          }
        } else {
          this.player.rendering = false;
        }
      }).bind(this),
      false
    );

    document.addEventListener(
      "mousemove",
      ((event: any) => {
        if (this.player.rendering) {
          this.player.mouse_movement_x += event.movementX;
          this.player.mouse_movement_y += event.movementY;
        }
      }).bind(this),
      false
    );
  }

  addObjectToArrays(
    object: GameObject,
    objects_array: number[],
    vertices: number[],
    triangles: number[],
    materials: number[]
  ) {
    const min_point = vec3.fromValues(Infinity, Infinity, Infinity);
    const max_point = vec3.fromValues(-Infinity, -Infinity, -Infinity);

    for (let triangle of object.triangles) {
      for (let i = 0; i < 3; i++) {
        const vertex = object.vertices[triangle[i]];

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

    const scale = vec3.fromValues(
      object.dimensions[0] / (max_point[0] - min_point[0]),
      object.dimensions[1] / (max_point[1] - min_point[1]),
      object.dimensions[2] / (max_point[2] - min_point[2])
    );

    objects_array.push(
      object.innerObjects.length > 0
        ? object.innerObjects[0].array_index * 4
        : 0
    );
    objects_array.push(object.innerObjects.length);
    objects_array.push(0);
    objects_array.push(triangles.length / 3);
    objects_array.push(object.triangles.length);
    objects_array.push(materials.length / 3);
    objects_array.push(-object.position[0]);
    objects_array.push(-object.position[1]);
    objects_array.push(-object.position[2]);
    objects_array.push(object.dimensions[0] + 0.2);
    objects_array.push(object.dimensions[1] + 0.2);
    objects_array.push(object.dimensions[2] + 0.2);

    const start_vertices_index = vertices.length;
    for (let vertex of object.vertices) {
      vertices.push(
        -((vertex[0] - min_point[0]) * scale[0] + object.position[0] + 0.1)
      );
      vertices.push(
        -((vertex[1] - min_point[1]) * scale[1] + object.position[1] + 0.1)
      );
      vertices.push(
        -((vertex[2] - min_point[2]) * scale[2] + object.position[2] + 0.1)
      );
    }
    for (let triangle of object.triangles) {
      triangles.push(start_vertices_index + triangle[0]);
      triangles.push(start_vertices_index + triangle[1]);
      triangles.push(start_vertices_index + triangle[2]);
    }

    //material
    materials.push(object.material.albedo[0]);
    materials.push(object.material.albedo[1]);
    materials.push(object.material.albedo[2]);
    materials.push(object.material.transparency[0]);
    materials.push(object.material.transparency[1]);
    materials.push(object.material.transparency[2]);
    materials.push(object.material.metallic[0]);
    materials.push(object.material.metallic[1]);
    materials.push(object.material.metallic[2]);
    materials.push(object.material.ior[0]);
    materials.push(object.material.ior[1]);
    materials.push(object.material.ior[2]);
    materials.push(object.material.emmissive[0]);
    materials.push(object.material.emmissive[1]);
    materials.push(object.material.emmissive[2]);
  }

  load_scene() {
    const vertices: number[] = [];
    const triangles: number[] = [];
    const objects: number[] = [];
    const materials: number[] = [];
    const lights: number[] = [100, 100, 100, 0, 0, 0];

    const worldObject = new GameObject(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1, 1, 1),
      [],
      [],
      new Material()
    );

    for (let object of this.objects) {
      worldObject.addInnerObject(object);
    }

    let next_object_idndex = 0;

    const objectsToAdd: GameObject[] = [worldObject];

    // Make so that the objects are in the right order, each inner objects are successive
    let object_index = 0;
    while (object_index < objectsToAdd.length) {
      const object = objectsToAdd[object_index];
      object.array_index = next_object_idndex;
      next_object_idndex++;

      for (let inner_object of object.innerObjects) {
        objectsToAdd.push(inner_object);
      }

      object_index++;
    }

    for (let object of objectsToAdd) {
      this.addObjectToArrays(object, objects, vertices, triangles, materials);
    }

    console.log(objects);

    this.engine.setTextures(vertices, triangles, objects, materials, lights);
  }

  generate_world() {
    this.objects = [];

    const vertices = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1, 0, 0),
      vec3.fromValues(0, 1, 0),
      vec3.fromValues(1, 1, 0),
      vec3.fromValues(0.5, 0.5, 0.5),
    ];

    const triangles = [
      vec3.fromValues(0, 1, 2),
      vec3.fromValues(1, 2, 3),
      vec3.fromValues(0, 1, 4),
      vec3.fromValues(0, 2, 4),
      vec3.fromValues(1, 3, 4),
      vec3.fromValues(2, 3, 4),
    ];

    const material = new Material(vec3.fromValues(1, 0, 0));

    const my_object2 = new GameObject(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1, 1, 1),
      vertices,
      triangles,
      material
    );

    const my_object = new GameObject(
      vec3.fromValues(10, -10, 10),
      vec3.fromValues(20, 50, 10),
      vertices,
      triangles,
      material
    );

    this.objects.push(my_object);
    this.objects.push(my_object2);

    this.load_scene();
  }

  nextFrame(timestamp: number) {
    if (this.player.rendering) {
      //time
      const dt = (timestamp - this.previousTimeStamp) / 1000; // in secondes
      this.previousTimeStamp = timestamp;

      // Player & camera

      //gravity
      // this.player.vitesse[2] -= 10 * dt;

      //update player position
      this.player.move(dt);

      // const h = this.landscape(this.player.position[0], this.player.position[1]);
      // if (this.player.position[2] < h + 2){
      //     this.player.position[2] = h + 2;
      //     this.player.vitesse[2] = 0;
      // }

      //draw frame
      this.camera.position = vec3.clone(this.player.position);
      this.camera.phi = this.player.phi;
      this.camera.teta = this.player.teta;
      this.camera.update();

      this.engine.setCameraUniforms(this.camera);

      this.engine.render();

      //update infos

      //fps
      this.dt_fps += dt;
      this.fps += 1;

      if (this.dt_fps > 0.5) {
        let fps = document.getElementById("fps")!;
        fps.innerText = (1 / dt).toFixed(2) + "fps";
        this.dt_fps = 0;
        this.fps = 0;

        //this.update_world();
      }

      //position infos
      let element_position_x = document.getElementById("position_x")!;
      let element_position_y = document.getElementById("position_y")!;
      let element_position_z = document.getElementById("position_z")!;
      element_position_x.innerText = "x: " + this.player.position[0].toFixed(2);
      element_position_y.innerText = "y: " + this.player.position[1].toFixed(2);
      element_position_z.innerText = "z: " + this.player.position[2].toFixed(2);

      window.requestAnimationFrame(this.nextFrame.bind(this));
    } else {
      this.previousTimeStamp = timestamp;
      window.requestAnimationFrame(this.nextFrame.bind(this));
    }
  }

  run() {
    console.log("starting Game...");
    window.requestAnimationFrame(this.nextFrame.bind(this));
  }
}

export { GameEngine, Player };
