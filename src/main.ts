import { GameEngine, Player } from "./GameEngine";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";
import { GameObject, Mesh } from "./GameObject";

// Materials

// Landscape
// const altitude_max = 50;

// const noise: NoiseFunction2D = createNoise2D();

// const landscape = (a: number, b: number) => {
//   const f = 100;
//   const detail = 6;
//   let res = 0;

//   for (let k = 0; k < detail; k++) {
//     res += (altitude_max * noise((a * 2 ** k) / f, (b * 2 ** k) / f)) / 2 ** k;
//   }

//   if (res < -1) {
//     res = -1;
//   }

//   return res;
// };

// Main

let player = new Player([0, 0, 0], 0, Math.PI / 2);

let width = 600;
let height = 400;

let canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
canvas.style.width = "100%";
canvas.style.height = "100%";
document.getElementById("view")!.appendChild(canvas);

let game = new GameEngine(canvas, player);

const objects: GameObject[] = [];

// const planete_mesh = new Mesh(vec3)
// for (let k=0; k< 10; k++){
//   const planete = new GameObject
// }

// game events
// document
//   .getElementById("switch_mode_btn")
//   ?.addEventListener("click", (event) => {
//     if (game.engine.mode == "Rasterization") {
//       game.load_mode("Raytracing");
//     } else {
//       game.load_mode("Rasterization");
//     }
//   });

game.run();

// DONE

// Use WebGL
// Make game environment
// Static object dimensions (in game engine)
// Inner objects in shader
// Dynamic object position and scale (point to the same mesh but with transforms)
// Make Mode class to be able to switch mode easily

// TODO

// Use frameBuffer
// Use material to make use of the ray to have beautiful graphics -> refraction/roughness/emmissive
// Use lights (or not ? and use only emmissive objects ?)
// Incrementing the data usage of texture by using lines
// Rotate transform of objects
// use different primitives (other than triangles, spheres etc...)
// Use texture and non-uniform materials on object (+ normals)
// Refacto game structure
// See (again) about direction and why coords are reversed (reversed direction and reversed coords objects and triangles)
// Create the game engine app
// App file structure
// Installer
// Readme
