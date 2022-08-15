import { vec3, mat4 } from "gl-matrix";
import { GraphicEngine } from "./GraphicEngine";
import { Camera } from "./Camera";
import { GameObject, Mesh } from "./GameObject";
import { Material } from "./Material";

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

class GameEngine {
  //Graphic engine
  camera: Camera;
  engine: GraphicEngine;

  player: Player;
  view: HTMLElement;

  dt_fps = 0;
  previousTimeStamp = 0;
  fps = 0;

  constructor(view: HTMLCanvasElement, player: Player) {
    this.player = player;
    this.view = view;

    //camera

    const render_distance = 1000;

    this.camera = new Camera(view.width, view.height, render_distance);

    //Graphic engine
    this.engine = new GraphicEngine(view.getContext("webgl2")!);

    this.generate_world();

    // Events
    this.load_events();

    this.camera.position = vec3.clone(this.player.position);
    this.camera.phi = this.player.phi;
    this.camera.teta = this.player.teta;
    this.camera.update();

    this.engine.setCameraUniforms(this.camera);
    this.engine.render();
  }

  // load_mode(mode: "Rasterization" | "Raytracing") {
  //   this.engine.loadMode(mode);

  //   const TransformMatrix = mat4.create();
  //   this.engine.setTransformVertices(TransformMatrix);
  //   this.engine.setCameraUniforms(this.camera);
  //   this.engine.setCurrentMaterialUniforms([0.99, 0.99, 0.99], [1, 1, 1]);

  //   this.engine.render();
  // }

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

  generate_world() {
    const game_objects: GameObject[] = [];

    const vertices = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1, 0, 0),
      vec3.fromValues(0, 1, 0),
      vec3.fromValues(1, 1, 0),
      vec3.fromValues(0.5, 0.5, 0.5),
    ];

    const triangles = [
      vec3.fromValues(0, 1, 2),
      vec3.fromValues(1, 3, 2),
      vec3.fromValues(0, 4, 1),
      vec3.fromValues(0, 2, 4),
      vec3.fromValues(1, 4, 3),
      vec3.fromValues(2, 3, 4),
    ];

    const my_mesh = new Mesh(vertices, triangles);

    const material = new Material();
    material.emmissive = vec3.fromValues(1, 0, 0);
    material.metallic = vec3.fromValues(0.5, 0, 0);

    const width = 20;
    const height = 20;

    for (let k = 0; k < 5; k++) {
      for (let k2 = 0; k2 < 5; k2++) {
        const my_object = new GameObject(
          vec3.fromValues((height + 1) * k, (width + 1) * k2, -8),
          vec3.fromValues(height, width, 10),
          my_mesh,
          material
        );

        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            const my_object2 = new GameObject(
              vec3.fromValues(2 * i, 2 * j, 0),
              vec3.fromValues(
                0.5 + Math.random(),
                0.5 + Math.random(),
                0.5 + Math.random()
              ),
              my_mesh,
              material
            );
            // this.objects.push(my_object2);
            my_object.addInnerObject(my_object2);
          }
        }

        game_objects.push(my_object);
      }
    }

    this.load_scene(game_objects);
  }

  load_scene(game_objects: GameObject[]) {
    const vertices: number[] = [];
    const triangles: number[] = [];
    const objects: number[] = [];
    const materials: number[] = [];
    const lights: number[] = [100, 100, 100, 0, 0, 0];

    const worldObject = new GameObject(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1, 1, 1),
      new Mesh([], []),
      new Material()
    );

    for (let object of game_objects) {
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
      object.load(objects, vertices, triangles, materials);
    }

    // console.log(objects);
    // console.log(vertices);
    this.engine.setTextures(vertices, triangles, objects, materials, lights);
  }
}

export { GameEngine, Player };
