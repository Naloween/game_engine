

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

    struct Object
    {
        uint triangle_index;
        uint nb_triangles;
        uint material_index;
    };

    struct Material
    {
        vec3 albedo; // the color of the material (for diffusion)
        vec3 transparency; // the transparency of the material percentage that get out for 1m
        vec3 metallic; //reflection irror like
        vec3 ior; // index of refraction ou IOR
        vec3 emmissive;
    };

    struct LightSource
    {
        vec3 lightAmount;
        vec3 position;
    };

    // Uniforms

    uniform sampler2D uVertices; // position
    uniform mediump usampler2D uTriangles; // vertices_index
    uniform mediump usampler2D uObjects; // start_triangle_index, nb_triangles, material_index [, position, dimensions, transform_matrix (rotate, translate, scale)]
    uniform sampler2D uMaterials; // Albedo, Transparency, Metallic, Ior, Emmissive
    uniform sampler2D uLightSources; // LightAmount, Position

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


        ivec2 vertices_sizes = textureSize(uVertices, 0);
        ivec2 triangles_sizes = textureSize(uTriangles, 0);
        ivec2 objects_sizes = textureSize(uObjects, 0);
        ivec2 materials_sizes = textureSize(uMaterials, 0);
        ivec2 light_sources_sizes = textureSize(uLightSources, 0);


        // Next Step
        float t = -1.;
        Material current_material;

        // loop on objects


        for (int object_index=0; object_index < objects_sizes.x; object_index++){

            uvec4 object_data = texture(uObjects, vec2( (float(object_index)+0.5) / float(objects_sizes.x) ));
            Object object = Object(object_data.x, object_data.y, object_data.z);

            vec4 albedo = texture(uMaterials, vec2( (float(object.material_index) + 0.5) / float(materials_sizes.x) ));
            vec4 transparency = texture(uMaterials, vec2( (float(object.material_index + uint(1)) + 0.5) / float(materials_sizes.x) ));
            vec4 metallic = texture(uMaterials, vec2( (float(object.material_index + uint(2)) + 0.5) / float(materials_sizes.x) ));
            vec4 ior = texture(uMaterials, vec2( (float(object.material_index + uint(3)) + 0.5) / float(materials_sizes.x) ));
            vec4 emissive = texture(uMaterials, vec2( (float(object.material_index + uint(4)) + 0.5) / float(materials_sizes.x) ));
            
            Material material = Material(albedo.xyz, transparency.xyz, metallic.xyz, ior.xyz, emissive.xyz);

            // loop on triangles
    
            for (uint triangle_index = object.triangle_index; triangle_index < object.triangle_index + object.nb_triangles; triangle_index++){
    
                // coords of texture between 0 and 1 (looped so 1.x = 0.x)
                vec2 triangle_coords = vec2( (float(triangle_index)+0.5)/float(triangles_sizes.x) , 0 );
                uvec4 triangle = texture(uTriangles, triangle_coords); // a channel always 1.
    
                float t2 = intersecTriangle(direction, triangle, vertices_sizes);
    
                if (t < 0. || (t2 > 0. && t2 < t)){
                    t = t2;
                    current_material = material;
                }
            }
        }

        // Si on a intersect qqchose
        if (t > 0.){

            return current_material.albedo;

            // depth
            float l = 1. - t/50.;
            // return vec3(l, l, l);
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
