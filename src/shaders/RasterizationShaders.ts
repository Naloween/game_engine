// Shader Programs

const RasterizationVertexShaderSource = `
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

const RasterizationFragmentShaderSource = `
    precision highp float;

    varying highp vec3 vDiffuseLighting;

    void main() {
        
        gl_FragColor = vec4(vDiffuseLighting, 1.);
    }
`;

export { RasterizationFragmentShaderSource, RasterizationVertexShaderSource };
