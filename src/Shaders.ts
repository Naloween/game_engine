

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

    float intersecTriangle(vec3 direction, uvec4 triangle, ivec2 vertices_sizes){

        vec4 vertexA = texture(uVertices, vec2( float(triangle.x)/float(vertices_sizes.x) , 0 ));
        vec4 vertexB = texture(uVertices, vec2( float(triangle.y)/float(vertices_sizes.x) , 0 ));
        vec4 vertexC = texture(uVertices, vec2( float(triangle.z)/float(vertices_sizes.x) , 0 ));

        return vertexC.z;
    }

    vec3 getPixelColor(){

        // Direction of the ray

        float dx = uCameraFov * (gl_FragCoord.x - uCameraWidth/2.) / uCameraWidth;
        float dy = uCameraFov * ((uCameraHeight - gl_FragCoord.y) - uCameraHeight/2.) / uCameraWidth;
    
        vec3 direction = vec3(
            uCameraDirection.x - dx * uCameraDirectionX.x - dy * uCameraDirectionY.x,
            uCameraDirection.y - dx * uCameraDirectionX.y - dy * uCameraDirectionY.y,
            uCameraDirection.z - dx * uCameraDirectionX.z - dy * uCameraDirectionY.z
        );

        direction = normalize(direction);

        // skybox_color defined by the direction

        vec3 sky_box_color = vec3(direction.x/2. + 0.5, direction.y/2. + 0.5, direction.z/2. + 0.5);

        // loop on triangles
        ivec2 triangles_sizes = textureSize(uTriangles, 0);
        ivec2 vertices_sizes = textureSize(uVertices, 0);

        for (int triangle_index=0; triangle_index<triangles_sizes.x; triangle_index++){

            // coords of texture between 0 and 1 (looped so 1.x = 0.x)
            vec2 triangle_coords = vec2( float(triangle_index)/float(triangles_sizes.x) , 0 );
            uvec4 triangle = texture(uTriangles, triangle_coords); // a channel always 1.

            float t = intersecTriangle(direction, triangle, vertices_sizes);

            if (t == 1.){
                return sky_box_color;
            }
        }

        float l = float(triangles_sizes.x)/10.;

        vec3 pixel_color = vec3(l, l, l);

        return pixel_color;
        // return sky_box_color;
    }

    out vec4 fragColor;

    void main() {
        vec3 color = getPixelColor();
        fragColor = vec4(color ,1.);
    }
`;

export {TriangleFragmentShaderSource, TriangleVertexShaderSource, RayTracingFragmentShaderSource, RayTracingVertexShaderSource}
