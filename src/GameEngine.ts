
// import * as te from "./triangle_engine.js";
// import * as mat4 from "./glMatrix/src/mat4.js";
// import * as vec3 from "./glMatrix/src/vec3.js";

import { Camera, GraphicEngine } from "./GraphicEngine";
import { vec3, mat4 } from "gl-matrix";

class Player{

    
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

    constructor(position: vec3, teta: number, phi: number){

        this.position = position;
        this.teta = teta;
        this.phi = phi;

        this.update();
    }

    update(){        
        this.u[0] = -Math.sin(this.phi) * Math.sin(this.teta);
        this.u[1] = Math.sin(this.phi) * Math.cos(this.teta);
        this.u[2] = Math.cos(this.phi);
        
        this.uy[0] = Math.cos(this.phi) * Math.sin(this.teta);
        this.uy[1] = -Math.cos(this.phi) * Math.cos(this.teta);
        this.uy[2] = Math.sin(this.phi);
        
        // ux produit vectoriel de u et uy
        
        this.ux[0] = this.u[1] * this.uy[2] - this.u[2] * this.uy[1];
        this.ux[1] = this.u[2] * this.uy[0] - this.u[0] * this.uy[2];
        this.ux[2] = this.u[0] * this.uy[1] - this.u[1] * this.uy[0];
    }

    move(dt: number){

        // Mouse

        this.teta += this.sensibilite * this.mouse_movement_x;
        this.phi += this.sensibilite * this.mouse_movement_y;

        this.mouse_movement_x = 0;
        this.mouse_movement_y = 0;

        this.update();

        // Movements

        let vitesse: vec3 = [this.vitesse[0], this.vitesse[1], this.vitesse[2]];

        if (this.move_left){
            vec3.scaleAndAdd(vitesse, vitesse, this.ux, this.move_speed);
        }
        if (this.move_right){
            vec3.scaleAndAdd(vitesse, vitesse, this.ux, -this.move_speed);
        } 
        if (this.move_front){
            vec3.scaleAndAdd(vitesse, vitesse, this.u, this.move_speed);
        }
        if (this.move_back){
            vec3.scaleAndAdd(vitesse, vitesse, this.u, -this.move_speed);
        }
        if (this.move_up){
            this.vitesse[2] = 0;
            vitesse[2] += this.move_speed;
        }
        if (this.move_down){
            this.vitesse[2] = 0;
            vitesse[2] -= this.move_speed;
        }

        vec3.scaleAndAdd(this.position, this.position, vitesse, dt);
    }
}

class Chunk{

    static next_id = 0;

    id: number;

    position: vec3;
    size: number;
    side_length: number;
    dl: number;

    vertex_offset: number;

    positions: number[] = [];
    normals: number[] = [];
    diffuseColors: number[] = [];
    transparency: number[] = [];
    indexes: number[] = [];

    constructor(vertex_offset: number, position: vec3, size: number, side_length: number){
        this.id = Chunk.next_id;
        Chunk.next_id += 1;

        this.position = position;
        this.size = size;
        this.side_length = side_length;
        this.dl = size/(side_length-1);

        this.vertex_offset = vertex_offset;
    }

    generate(landscape: Function){
        this.positions = [];
        this.normals = [];
        this.diffuseColors = [];
        this.transparency = [];
        this.indexes = [];

        for (let i=0; i<this.side_length; i++){
            for (let j=0; j<this.side_length; j++){

                let x = this.position[0] + this.dl * i;
                let y = this.position[1] + this.dl * j;
                let z = landscape(x, y);
                this.positions.push(-x);
                this.positions.push(-y);
                this.positions.push(-z);

                let u = vec3.fromValues(this.dl, 0, landscape(x+this.dl, y)-z);
                let v = vec3.fromValues(0, this.dl, landscape(x, y+this.dl)-z);
                vec3.cross(u, u, v);
                vec3.normalize(u, u);
                this.normals.push(u[0]);
                this.normals.push(u[1]);
                this.normals.push(u[2]);

                let r = 0.1;
                let g = 0.1;
                let b = 0.5;

                if (z>0 && z<20){
                    r = 0.5;
                    g = 0.5;
                    b = 0.5;
                } else if(z >= 20) {
                    r = 1.;
                    g = 1.;
                    b = 1.;
                }

                this.diffuseColors.push(r);
                this.diffuseColors.push(g);
                this.diffuseColors.push(b);

                this.transparency.push(0.0);
                this.transparency.push(0.0);
                this.transparency.push(0.0);
            }
        }

        for (let i=0; i<this.side_length-1; i++){
            for (let j=0; j<this.side_length-1; j++){
                this.indexes.push(this.vertex_offset + this.side_length*i+j);
                this.indexes.push(this.vertex_offset + this.side_length*i+j+1);
                this.indexes.push(this.vertex_offset + this.side_length*(i+1)+j);

                this.indexes.push(this.vertex_offset + this.side_length*(i+1)+j+1);
                this.indexes.push(this.vertex_offset + this.side_length*i+j+1);
                this.indexes.push(this.vertex_offset + this.side_length*(i+1)+j);
            }
        }
    }
}

class GameEngine{

    //Graphic engine
    camera: Camera;
    engine: GraphicEngine;

    player: Player;
    view: HTMLElement;
    landscape: Function;

    dt_fps = 0;
    previousTimeStamp = 0;
    fps = 0;
    
    nb_chunk = 10;
    chunk_size = 50;
    side_length = 100;
    chunks: Chunk[] = [];

    constructor(view: HTMLCanvasElement, player: Player, landscape: Function){

        this.player = player;
        this.view = view;
        this.landscape = landscape;

        //camera
        const width = 1000;
        const height = 600;

        const render_distance = 1000;

        this.camera = new Camera(width, height, render_distance);

        //Graphic engine
        this.engine = new GraphicEngine(view.getContext("webgl2")!);

        const TransformMatrix = mat4.create();
        this.engine.setTransformVertices(TransformMatrix);
        this.engine.setCameraUniforms(this.camera);
        this.engine.setCurrentMaterialUniforms([0.99, 0.99, 0.99], [1., 1., 1.]);

        this.generate_world();

        this.engine.render();
        
        // Events
        this.load_events();
        
    }

    load_events(){
        //lock view
        this.view.addEventListener("click",(event)=> {
            if (event.button == 0){
                this.view.requestPointerLock();
            }
        });

        // Player control
        window.addEventListener("keydown", (event) => {
            if (event.code == "AltLeft"){
                this.player.change_mode = true;
            } else if(event.code == "KeyW"){
                this.player.move_front = true;
            } else if(event.code == "KeyS"){
                this.player.move_back = true;
            } else if(event.code == "KeyA"){
                this.player.move_left = true;
            } else if(event.code == "KeyD"){
                this.player.move_right = true;
            }  else if(event.code == "Space"){
                this.player.move_up = true;
            } else if(event.code == "ShiftLeft"){
                this.player.move_down = true;
            } else if(event.code == "ArrowUp"){
                this.player.move_speed *= 2;
            } else if(event.code == "ArrowDown"){
                this.player.move_speed /= 2;
            }
        });
        
        window.addEventListener("keyup", (event) => {
            if (event.code == "AltLeft"){
                this.player.change_mode = false;
            } else if(event.code == "KeyW"){
                this.player.move_front = false;
            } else if(event.code == "KeyS"){
                this.player.move_back = false;
            } else if(event.code == "KeyA"){
                this.player.move_left = false;
            } else if(event.code == "KeyD"){
                this.player.move_right = false;
            }  else if(event.code == "Space"){
                this.player.move_up = false;
            } else if(event.code == "ShiftLeft"){
                this.player.move_down = false;
            }
        });

        document.addEventListener('pointerlockchange', (()=>{
            if (document.pointerLockElement === this.view) {
                if (!this.player.rendering){
                    this.player.rendering = true;
                }
            } else {
                this.player.rendering = false;
            }
        }).bind(this), false);

        document.addEventListener("mousemove", ((event: any)=>{
            if( this.player.rendering){
                this.player.mouse_movement_x += event.movementX;
                this.player.mouse_movement_y += event.movementY;
            }
        }).bind(this), false);
    }

    generate_world(){
        const positions: number[] = [];
        const normals: number[] = [];
        const diffuseColors: number[] = [];
        const transparency: number[] = [];
        const indexes: number[] = [];

        let vertex_offset = 0;

        for (let i=0; i< this.nb_chunk; i++){
            for (let j=0; j< this.nb_chunk; j++){
                let chunk_x = i * this.chunk_size;
                let chunk_y = j * this.chunk_size;
                let chunk_z = 0;

                let side_length = this.side_length;//Math.max(Math.floor(this.side_length/(2**i)), 2);

                let chunk = new Chunk(vertex_offset, [chunk_x, chunk_y, chunk_z], this.chunk_size, side_length);

                this.chunks.push(chunk);
                chunk.generate(this.landscape);

                for (let k=0; k<chunk.positions.length; k++){
                    positions.push(chunk.positions[k]);
                    normals.push(chunk.normals[k]);
                    diffuseColors.push(chunk.diffuseColors[k]);
                    transparency.push(chunk.transparency[k]);
                }

                for (let k=0; k<chunk.indexes.length; k++){
                    indexes.push(chunk.indexes[k]);
                }

                vertex_offset += side_length * side_length;
            }
        }

        this.engine.setBuffers(positions, normals, diffuseColors, transparency, indexes);
        this.engine.nb_indexes = indexes.length;
    }

    update_world(){
        const dl = this.nb_chunk * this.chunk_size;

        for (let chunk of this.chunks){
            let u = vec3.create();
            let position: vec3 = [chunk.position[0] + chunk.size/2, chunk.position[1] + chunk.size/2, chunk.position[2] + chunk.size/2];
            vec3.subtract(u, this.player.position, position);

            if (Math.round(u[0]/dl) != 0 || Math.round(u[1]/dl) != 0){
                chunk.position[0] += Math.round(u[0]/dl) * dl;
                chunk.position[1] += Math.round(u[1]/dl) * dl;
                chunk.generate(this.landscape);
                this.engine.updateVertices(chunk.vertex_offset * 3, chunk.positions, chunk.normals, chunk.diffuseColors, chunk.transparency);
            }
        }
    }

    nextFrame(timestamp: number){

        if (this.player.rendering){
            //time
            const dt = (timestamp - this.previousTimeStamp)/1000; // in secondes
            this.previousTimeStamp = timestamp;
            
            // Player & camera

            //gravity
            this.player.vitesse[2] -= 10 * dt;

            //update player position
            this.player.move(dt);

            const h = this.landscape(this.player.position[0], this.player.position[1]);
            if (this.player.position[2] < h + 2){
                this.player.position[2] = h + 2;
                this.player.vitesse[2] = 0;
            }

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

            if (this.dt_fps > 0.5){
                let fps = document.getElementById("fps")!;
                fps.innerText = (1/dt).toFixed(2) + "fps";
                this.dt_fps = 0;
                this.fps = 0;

                this.update_world();
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

    run(){
        console.log("starting Game...");
        window.requestAnimationFrame(this.nextFrame.bind(this));
    }
}

export{GameEngine, Player}
