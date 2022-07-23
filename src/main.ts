
import { GameEngine, Player } from "./GameEngine";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";

// Materials

// Landscape
const altitude_max = 50;

const noise: NoiseFunction2D = createNoise2D();

const landscape = (a: number, b: number) => {

    const f = 100;
    const detail = 6
    let res = 0;

    for (let k=0; k<detail; k++){
        res += altitude_max * noise(a * 2**k / f, b * 2**k / f)/ 2**k;
    }

    if (res < -1){
        res = -1
    }

    return res;
}


// Main

let player = new Player([0,0,0], 0, Math.PI/2);

let width = 1100;
let height = 600;

let canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
document.getElementById("view")!.appendChild(canvas);

let game = new GameEngine(canvas, player, landscape);
game.run();