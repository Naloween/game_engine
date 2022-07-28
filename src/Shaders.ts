

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

const RayTracingVertexShaderSource = `
    precision highp float;

    attribute vec4 aVertexPosition;

    void main() {
        gl_Position = aVertexPosition;
    }
`;

const RayTracingFragmentShaderSource = `

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
    uniform sampler2D uTriangles;

    uniform vec3 uCameraPosition;
    uniform vec3 uCameraDirection;
    uniform vec3 uCameraDirectionY;
    uniform vec3 uCameraDirectionX;
    uniform float uCameraFov;
    uniform float uCameraWidth;
    uniform float uCameraHeight;



    // Functions

    vec3 getPixelColor();

    vec3 getPixelColor(){
        float dx = uCameraFov * (gl_FragCoord.x - uCameraWidth/2.) / uCameraWidth;
        float dy = uCameraFov * ((uCameraHeight - gl_FragCoord.y) - uCameraHeight/2.) / uCameraWidth;
    
        vec3 direction = vec3(
            uCameraDirection.x - dx * uCameraDirectionX.x - dy * uCameraDirectionY.x,
            uCameraDirection.y - dx * uCameraDirectionX.y - dy * uCameraDirectionY.y,
            uCameraDirection.z - dx * uCameraDirectionX.z - dy * uCameraDirectionY.z
        );

        direction = normalize(direction);

        // float vertices_sizes = textureSize(uVertices, 0);
        // float l = vertices_sizes / 100.;

        vec4 vertex = texture2D(uVertices, vec2(0,0));

        return vec3(vertex.a, vertex.g, vertex.g);

        // return vec3(direction.x/2. + 0.5, direction.y/2. + 0.5, direction.z/2. + 0.5);
    }

    void main() {
        vec3 color = getPixelColor();
        gl_FragColor = vec4(color ,1.);
    }
`;

export {TriangleFragmentShaderSource, TriangleVertexShaderSource, RayTracingFragmentShaderSource, RayTracingVertexShaderSource}
