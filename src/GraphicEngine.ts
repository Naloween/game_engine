
// import * as mat4 from "/modules/glMatrix/src/mat4.js";
// import * as vec3 from "/modules/glMatrix/src/vec3.js";
// import * as vec2 from "/modules/glMatrix/src/vec2.js";

import { mat4, vec3, vec2 } from "gl-matrix";
import { TriangleFragmentShaderSource, TriangleVertexShaderSource,
    RayTracingFragmentShaderSource, RayTracingVertexShaderSource } from "./Shaders";

// Classes

class Light{
    static next_id = 0;

    id: number;
    power: number;
    color: vec3;
    position: vec3;

    constructor(power: number, color: vec3, position: vec3){
        this.power = power;
        this.color = color;
        this.position = position;
        this.id = -1;
    }

    toArray(){
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

class Material{
    static next_id = 0;

    id: number;

    metallic: vec3; //reflection irror like
    albedo: vec3; // the color of the material (for diffusion)
    transparency: vec3; // the transparency of the material percentage that get out for 1m
    ior: vec3; // index of refraction ou IOR
    emmissive: vec3; // amount of light emited for rgb

    constructor(albedo: vec3 = [1,1,1], transparency: vec3 = [0,0,0], metallic: vec3 = [0,0,0], ior: vec3 = [1,1,1], emmissive: vec3 = [0,0,0]){
        this.albedo = albedo; // diffusion pour chaque couleur, entre 0 (transparent) et 1 (opaque)
        this.transparency = transparency;
        this.metallic = metallic; // entre 0 et 1
        this.ior = ior; //n1*sin(i) = n2*sin(r)
        this.emmissive = emmissive;

        this.id = -1;
    }

    toArray(){
        let result = Array(this.albedo);
        result = result.concat(this.transparency);
        result = result.concat(this.metallic);
        result = result.concat(this.ior);
        result = result.concat(this.emmissive);

        return result //[albedo, transparency, metallic, ior, emmissive]
    }
}

class Camera{

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

    constructor(width: number, height: number, render_distance=100){
        this.width = width;
        this.height = height;

        this.position = [0.0,0.0,0.0];
        this.teta = 0.0;
        this.phi = Math.PI/2.0;

        this.aspect = this.width / this.height;
        this.zNear = 0.1;
        this.zFar = render_distance;
        this.fov = 45 * Math.PI / 180; //in radiant
        this.diaphragme = 1;

        this.projectionMatrix = mat4.create();

        this.update();
    }

    update(){
        
        mat4.perspective(this.projectionMatrix, this.fov, this.aspect, this.zNear, this.zFar);
        mat4.rotate(this.projectionMatrix, this.projectionMatrix, this.phi, [1, 0, 0]);
        mat4.rotate(this.projectionMatrix, this.projectionMatrix, this.teta, [0, 0, -1]);
        mat4.translate(this.projectionMatrix, this.projectionMatrix, this.position);
    }

    getRepere(){
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
        
        const ux = vec3.fromValues(
            u[1] * uy[2] - u[2] * uy[1],
            u[2] * uy[0] - u[0] * uy[2],
            u[0] * uy[1] - u[1] * uy[0]
        );
        
        return [u, ux, uy];
    }
}

class GraphicEngine{

    gl: WebGL2RenderingContext;
    shaderProgram: WebGLProgram;
    
    nb_triangles_indexes = 0;
    mode: "Triangle" | "Raytracing";

    // buffers
    
    trianglesCanvasBuffer: WebGLBuffer;

    trianglesBuffer: WebGLBuffer;

    positionBuffer: WebGLBuffer;
    normalBuffer: WebGLBuffer;
    diffuseColorBuffer: WebGLBuffer;
    transparencyBuffer: WebGLBuffer;

    materialsBuffer: WebGLBuffer;
    lightSourcesBuffer: WebGLBuffer;

    // textures
    verticesTexture: WebGLTexture;
    trianglesTexture: WebGLTexture;
    
    // attributes locations
    vertexPositionLocation: number;
    vertexNormalLocation: number;
    vertexDiffuseColorLocation: number;
    vertexTransparencyLocation: number;

    // uniforms locations
    projectionMatrixLocation: WebGLUniformLocation;
    TransformMatrixLocation: WebGLUniformLocation;
    cameraPositionLocation: WebGLUniformLocation;
    cameraDirectionLocation: WebGLUniformLocation;
    cameraDirectionXLocation: WebGLUniformLocation;
    cameraDirectionYLocation: WebGLUniformLocation;
    cameraFovLocation: WebGLUniformLocation;
    cameraWidthLocation: WebGLUniformLocation;
    cameraHeightLocation: WebGLUniformLocation;

    currentTransparencyLocation: WebGLUniformLocation;
    currentDiffuseColorLocation: WebGLUniformLocation;

    materialsLocation: WebGLUniformLocation;
    lightSourcesLocation: WebGLUniformLocation;
    verticesLocation: WebGLUniformLocation;
    trianglesLocation: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext){
        this.gl = gl;

        this.gl.enable(this.gl.DEPTH_TEST);           // Enable depth testing
        this.gl.depthFunc(this.gl.LEQUAL);            // Near things obscure far things

        // buffers: load them independently of current mode
        this.loadBuffers();
    }

    render(){
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to fully transparent
        this.gl.clearDepth(1.0);                 // Clear everything
        
        // Clear the canvas before we start drawing on it.
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Tell WebGL which indices to use to index the vertices
        if (this.mode == "Triangle"){
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.trianglesBuffer);
            this.gl.drawElements(this.gl.TRIANGLES, this.nb_triangles_indexes, this.gl.UNSIGNED_INT, 0);
        } else if (this.mode == "Raytracing"){
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        }

    }

    loadMode(mode: "Triangle" | "Raytracing"){
        this.mode = mode;
        
        this.shaderProgram = this.initShaderProgram()!;
        
        // locations: link buffers to shader program
        this.loadLocations();

        this.gl.useProgram(this.shaderProgram);
    }

    initShaderProgram() {

        let vertexShader: WebGLShader | null = null;
        let fragmentShader: WebGLShader | null = null;

        if (this.mode == "Triangle"){
            vertexShader = this.loadShader(this.gl.VERTEX_SHADER, TriangleVertexShaderSource);
            fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, TriangleFragmentShaderSource);
        } else if (this.mode == "Raytracing"){
            vertexShader = this.loadShader(this.gl.VERTEX_SHADER, RayTracingVertexShaderSource);
            fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, RayTracingFragmentShaderSource);
        }
    
        // Créer le programme shader

        if (vertexShader == null || fragmentShader == null){
            console.log("error: vertex shader or fragment shader is null");
            return null;
        }
    
        const shaderProgram = this.gl.createProgram()!;
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);

        // Si la création du programme shader a échoué, alerte
    
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            alert("Impossible d'initialiser le programme shader : " + this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }
    
        return shaderProgram;
    }
    
    loadShader(type: number, source: string) {
        // Crée un shader du type fourni, charge le source et le compile.


        const shader = this.gl.createShader(type)!;
    
        // Envoyer le source à l'objet shader
        this.gl.shaderSource(shader, source);
    
        // Compiler le programme shader
        this.gl.compileShader(shader);
    
        // Vérifier s'il a été compilé avec succès
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
    
        return shader;
    }

    loadBuffers(){
        this.trianglesCanvasBuffer = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1., -1., 0.,
            -1., 1., 0.,
            1., -1., 0.,
            1., -1., 0.,
            -1., 1., 0.,
            1., 1., 0.,
          ]), this.gl.STATIC_DRAW);

        this.trianglesBuffer = this.gl.createBuffer()!;

        this.positionBuffer = this.gl.createBuffer()!;
        this.normalBuffer = this.gl.createBuffer()!;
        this.diffuseColorBuffer = this.gl.createBuffer()!;
        this.transparencyBuffer = this.gl.createBuffer()!;
    }

    loadTextures() {    
        function isPowerOf2(value: number) {
            return (value & (value - 1)) == 0;
        }

        this.verticesTexture = this.gl.createTexture()!;
        this.trianglesTexture = this.gl.createTexture()!;

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.verticesTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, 0, 0, 0,
            this.gl.RGB, this.gl.UNSIGNED_BYTE, new Uint8Array([]));
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.trianglesTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, 0, 0, 0,
            this.gl.RGB, this.gl.UNSIGNED_BYTE, new Uint8Array([]));
    }

    loadLocations(){

        if (this.mode == "Triangle"){

            // uniforms locations
            this.projectionMatrixLocation = this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix')!;
            this.TransformMatrixLocation = this.gl.getUniformLocation(this.shaderProgram, 'uTransformMatrix')!;
            this.cameraPositionLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraPosition')!;
            this.currentTransparencyLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCurrentTransparency')!;
            this.currentDiffuseColorLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCurrentDiffuseColor')!;

            // attributes locations
            this.vertexPositionLocation = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
            this.vertexNormalLocation = this.gl.getAttribLocation(this.shaderProgram, 'aVertexNormal');
            this.vertexDiffuseColorLocation = this.gl.getAttribLocation(this.shaderProgram, 'aVertexDiffuseColor');
            this.vertexTransparencyLocation = this.gl.getAttribLocation(this.shaderProgram, 'aVertexTransparency');

            // set attribute location to corresponding buffer with iteration parameters
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
            this.gl.vertexAttribPointer(this.vertexPositionLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.vertexPositionLocation);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
            this.gl.vertexAttribPointer(this.vertexNormalLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.vertexNormalLocation);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.diffuseColorBuffer);
            this.gl.vertexAttribPointer(this.vertexDiffuseColorLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.vertexDiffuseColorLocation);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transparencyBuffer);
            this.gl.vertexAttribPointer(this.vertexTransparencyLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.vertexTransparencyLocation);

        } else if (this.mode == "Raytracing"){

            // uniforms locations
            this.cameraPositionLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraPosition')!;
            this.cameraDirectionLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraDirection')!;
            this.cameraDirectionXLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraDirectionX')!;
            this.cameraDirectionYLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraDirectionY')!;
            this.cameraFovLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraFov')!;
            this.cameraWidthLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraWidth')!;
            this.cameraHeightLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCameraHeight')!;
            
            this.currentTransparencyLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCurrentTransparency')!;
            this.currentDiffuseColorLocation = this.gl.getUniformLocation(this.shaderProgram, 'uCurrentDiffuseColor')!;
            this.materialsLocation = this.gl.getUniformLocation(this.shaderProgram, 'uMaterials')!;
            this.lightSourcesLocation = this.gl.getUniformLocation(this.shaderProgram, 'uLightSources')!;
            this.verticesLocation = this.gl.getUniformLocation(this.shaderProgram, 'uVertices')!;
            this.trianglesLocation = this.gl.getUniformLocation(this.shaderProgram, 'uTriangles')!;

            // attributes locations
            this.vertexPositionLocation = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');

            // set attribute location to corresponding buffer with iteration parameters
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trianglesCanvasBuffer);
            this.gl.vertexAttribPointer(this.vertexPositionLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.vertexPositionLocation);
        }
    }

    setBuffers(positions: number[], normals: number[], diffuseColor: number[], transparency: number[], indexes: number[]) {
  
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);    
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.diffuseColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(diffuseColor), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transparencyBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(transparency), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.trianglesBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexes), this.gl.STATIC_DRAW);
    }

    setTextures(vertices: number[], triangles: number[]){

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.verticesTexture);

        let width = vertices.length;
        let height = 1;
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, width, height, 0,
            this.gl.RGB, this.gl.UNSIGNED_BYTE, new Uint8Array(vertices));
        
        width = triangles.length;
        height = 1;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.trianglesTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, width, height, 0,
            this.gl.RGB, this.gl.UNSIGNED_BYTE, new Uint8Array(triangles));
    };

    updateVertices(offset: number, positions: number[], normals: number[], diffuseColor: number[], transparency: number[]) {
  
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);    
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset * 4, new Float32Array(positions));

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset * 4, new Float32Array(normals));

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.diffuseColorBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset * 4, new Float32Array(diffuseColor));

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transparencyBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset * 4, new Float32Array(transparency));
    }

    setCameraUniforms(camera: Camera){
        // Set the shader uniform projection matrix
        if (this.mode == "Triangle"){
            this.gl.uniformMatrix4fv(this.projectionMatrixLocation, false, camera.projectionMatrix);
        } else if (this.mode == "Raytracing"){

            // Set the shader uniform camera direction
            const [direction, ux, uy] = camera.getRepere();
            this.gl.uniform3f(this.cameraDirectionLocation, -direction[0], -direction[1], -direction[2]);
            this.gl.uniform3f(this.cameraDirectionXLocation, -ux[0], -ux[1], -ux[2]);
            this.gl.uniform3f(this.cameraDirectionYLocation, -uy[0], -uy[1], -uy[2]);

            this.gl.uniform1f(this.cameraFovLocation, camera.fov);
            this.gl.uniform1f(this.cameraWidthLocation, camera.width);
            this.gl.uniform1f(this.cameraHeightLocation, camera.height);
        }
        // Set the shader uniform camera position
        this.gl.uniform3f(this.cameraPositionLocation, -camera.position[0], -camera.position[1], -camera.position[2]);

    }

    setCurrentMaterialUniforms(transparency: vec3, diffuseColor: vec3){
        this.gl.uniform3f(this.currentTransparencyLocation, transparency[0], transparency[1], transparency[2]);
        this.gl.uniform3f(this.currentDiffuseColorLocation, diffuseColor[0], diffuseColor[1], diffuseColor[2]);
    }

    setTransformVertices(TransformMatrix: mat4){
        // Set the shader uniforms
        if (this.mode == "Triangle"){

            this.gl.uniformMatrix4fv(this.TransformMatrixLocation, false, TransformMatrix);
        }
    }
}

export {Light, Material, Camera, GraphicEngine}
