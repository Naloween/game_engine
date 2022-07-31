

// Shader Programs

const TriangleVertexShaderSource = `
    precision highp float;

    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec3 aVertexDiffuseColor;
    attribute vec3 aVertexTransparency;

    uniform mat4 uTransformMatrix;
    uniform mat4 uProjectionMatrix;
    uniform vec3 uCameraPosition;
    uniform vec3 uCurrentTransparency;
    uniform vec3 uCurrentDiffuseColor;

    varying vec3 vDiffuseLighting;

    void main() {
        gl_Position = uProjectionMatrix * uTransformMatrix * aVertexPosition;

        // Apply lighting effect

        vec3 ambientLight = vec3(0.3, 0.3, 0.3);
        vec3 directionalLightColor = vec3(1, 1, 1);
        vec3 directionalVector = normalize(vec3(1., 1., 1.));

        float distance = length(aVertexPosition.xyz - uCameraPosition);
  
        float directional = max(dot(aVertexNormal.xyz, directionalVector), 0.0);

        vec3 current_material_percentage = 1. - vec3(pow(uCurrentTransparency.r, distance), pow(uCurrentTransparency.g, distance), pow(uCurrentTransparency.b, distance));
        vec3 vertex_material_percentage = 1. - vec3(pow(aVertexTransparency.r, distance), pow(aVertexTransparency.g, distance), pow(aVertexTransparency.b, distance));

        vDiffuseLighting = current_material_percentage * uCurrentDiffuseColor + (1. - current_material_percentage) * directional * aVertexDiffuseColor;
    }
`;

const TriangleFragmentShaderSource = `
    precision highp float;

    varying highp vec3 vDiffuseLighting;

    void main() {
        
        gl_FragColor = vec4(vDiffuseLighting, 1.);
    }
`;

const RayTracingVertexShaderSource = `#version 300 es
    precision highp float;

    in vec4 aVertexPosition;

    void main() {
        gl_Position = aVertexPosition;
    }
`;


// TODO: Brocolage (inversion direction = - direction & v0, v1, v2 = -v0, -v1, -v2)
const RayTracingFragmentShaderSource = `#version 300 es

    // Precisions

    precision mediump float;
    precision mediump int;



    // Structures

    struct Material
    {
        vec3 metallic; //reflection irror like
        vec3 albedo; // the color of the material (for diffusion)
        vec3 transparency; // the transparency of the material percentage that get out for 1m
        vec3 ior; // index of refraction ou IOR
        vec3 emmissive;
    };

    struct LightSource
    {
        float power;
        vec3 color;
        vec3 position;
    };



    // Uniforms

    uniform Material uMaterials[10];
    uniform LightSource uLightSources[10];
    uniform sampler2D uVertices;
    uniform mediump usampler2D uTriangles;

    uniform vec3 uCameraPosition;
    uniform vec3 uCameraDirection;
    uniform vec3 uCameraDirectionY;
    uniform vec3 uCameraDirectionX;
    uniform float uCameraFov;
    uniform float uCameraWidth;
    uniform float uCameraHeight;



    // Functions

    float intersecTriangle(vec3 direction, uvec4 triangle);
    vec3 getPixelColor();

    float intersecTriangle(vec3 direction_param, uvec4 triangle, ivec2 vertices_sizes){

        vec3 direction = - direction_param;

        float vertices_width = float(vertices_sizes.x);

        vec3 v0 = texture(uVertices, vec2( (float(triangle.x) + 0.5)/ vertices_width, 0 )).xyz;
        vec3 v1 = texture(uVertices, vec2( (float(triangle.y) + 0.5)/vertices_width , 0 )).xyz;
        vec3 v2 = texture(uVertices, vec2( (float(triangle.z) + 0.5)/vertices_width , 0 )).xyz;

        // Compute plane normale
        
        vec3 normale = cross(v1 - v0, v2 - v0); // no need to normalize
        float area = length(normale); 
        normale /= area;

        // check if ray parallel to triangle
        // float NdotRayDirection = dot(normale, direction); 
        // if (fabs(NdotRayDirection) < 0.001)  //almost 0 
        //     return false;  //they are parallel so they don't intersect ! 

        // compute t
        float t = dot(v0 - uCameraPosition, normale) / dot(direction, normale);
        vec3 M = uCameraPosition + t * direction;

        // inside / outside test V1
        vec3 C;  //vector perpendicular to triangle's plane
     
        // edge 0
        C = cross(M - v0, v1 - v0); 
        if (dot(C, normale) > 0.) return -1.;  //M on the wrong side on the edge
     
        // edge 1
        C = cross(M - v0, v2 - v0); 
        if (dot(C, normale) < 0.) return -1.;
     
        // edge 2
        C = cross(M - v1, v2 - v1); 
        if (dot(C, normale) > 0.) return -1.; 

        return t;
    }

    vec3 getPixelColor(){

        // Direction of the ray

        float dx = uCameraFov * (gl_FragCoord.x - uCameraWidth/2.) / uCameraWidth;
        float dy = uCameraFov * (uCameraHeight - gl_FragCoord.y - uCameraHeight/2.) / uCameraWidth;

        vec3 direction =  (uCameraDirection.xyz - dx * uCameraDirectionX.xyz - dy * uCameraDirectionY.xyz);

        direction = normalize(direction);

        // skybox_color defined by the direction

        vec3 sky_box_color = vec3(direction.x/2. + 0.5, direction.y/2. + 0.5, direction.z/2. + 0.5);

        // loop on triangles
        ivec2 triangles_sizes = textureSize(uTriangles, 0);
        ivec2 vertices_sizes = textureSize(uVertices, 0);

        float t = -1.;

        for (int triangle_index=0; triangle_index < triangles_sizes.x; triangle_index++){

            // coords of texture between 0 and 1 (looped so 1.x = 0.x)
            vec2 triangle_coords = vec2( (float(triangle_index)+0.5)/float(triangles_sizes.x) , 0 );
            uvec4 triangle = texture(uTriangles, triangle_coords); // a channel always 1.

            float t2 = intersecTriangle(direction, triangle, vertices_sizes);

            if (t < 0. || (t2 > 0. && t2 < t)){
                t = t2;
            }
        }

        if (t > 0.){
            float l = 1. - t/50.;
            return vec3(l, l, l);
        }

        return sky_box_color;
    }

    out vec4 fragColor;

    void main() {
        vec3 color = getPixelColor();
        fragColor = vec4(color ,1.);
    }
`;

export {TriangleFragmentShaderSource, TriangleVertexShaderSource, RayTracingFragmentShaderSource, RayTracingVertexShaderSource}
