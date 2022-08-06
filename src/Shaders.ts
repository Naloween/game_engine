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

// TODO set time uniform and implement random function that is different for each pixel and each time

// TODO: Bricolage (inversion direction = - direction & v0, v1, v2 = -v0, -v1, -v2)
const RayTracingFragmentShaderSource = `#version 300 es

    // Precisions

    precision mediump float;
    precision mediump int;

    // Structures

    struct Object
    {
        float triangle_index;
        float nb_triangles;
        float material_index;

        vec3 position;
        vec3 dimensions;
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
    uniform sampler2D uObjects; // start_triangle_index, nb_triangles, material_index [, position, dimensions, transform_matrix (rotate, translate, scale)]
    uniform sampler2D uMaterials; // Albedo, Transparency, Metallic, Ior, Emmissive
    uniform sampler2D uLightSources; // LightAmount, Position

    uniform vec3 uCameraPosition;
    uniform vec3 uCameraDirection;
    uniform vec3 uCameraDirectionY;
    uniform vec3 uCameraDirectionX;
    uniform float uCameraFov;
    uniform float uCameraWidth;
    uniform float uCameraHeight;

    uniform float uTime;

    // Functions

    float rand(float seed);
    float intersecTriangle(vec3 cast_point, vec3 direction, uvec4 triangle);
    float intersectBox(vec3 position, vec3 dimensions);
    bool inBox(vec3 position, vec3 box_position, vec3 dimensions);
    vec3 getPixelColor();

    float rand(float x){
        return fract(sin(x)*424242.0);
    }

    float intersecTriangle(vec3 cast_point, vec3 direction_param, uvec4 triangle, ivec2 vertices_sizes){

        vec3 direction = direction_param;

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
        float t = dot(v0 - cast_point, normale) / dot(direction, normale);
        vec3 M = cast_point + t * direction;

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

    bool inBox(vec3 position, vec3 box_position, vec3 dimensions){
        return position.x < box_position.x && position.x > box_position.x - dimensions.x
        && position.y < box_position.y && position.y > box_position.y - dimensions.y
        && position.z < box_position.z && position.z > box_position.z - dimensions.z;
    }

    float intersectBox(vec3 cast_point, vec3 direction, vec3 position, vec3 dimensions){

        // if inside return 0.
        if (inBox(cast_point, position, dimensions)){
            return 0.;
        }

        float t = -1.;

        float t0 = (position.x - cast_point.x) / direction.x;
        vec3 M0 = cast_point + t0 * direction;
        float t1 = (position.x - dimensions.x - cast_point.x) / direction.x;
        vec3 M1 = cast_point + t1 * direction;
        float t2 = (position.y - cast_point.y) / direction.y;
        vec3 M2 = cast_point + t2 * direction;
        float t3 = (position.y - dimensions.y - cast_point.y) / direction.y;
        vec3 M3 = cast_point + t3 * direction;
        float t4 = (position.z - cast_point.z) / direction.z;
        vec3 M4 = cast_point + t4 * direction;
        float t5 = (position.z - dimensions.z - cast_point.z) / direction.z;
        vec3 M5 = cast_point + t5 * direction;

        if ((t<0. || (t0>0. && t0<t)) && (M0.y < position.y && M0.y>position.y-dimensions.y && M0.z<position.z && M0.z>position.z-dimensions.z)){
            t = t0;
        }
        if ((t1>0. && (t<0. || t1<t)) && (M1.y < position.y && M1.y>position.y-dimensions.y && M1.z<position.z && M1.z>position.z-dimensions.z)){
            t = t1;
        }
        if ((t2>0. && (t<0. || t2<t)) && (M2.x < position.x && M2.x>position.x-dimensions.x && M2.z<position.z && M2.z>position.z-dimensions.z)){
            t = t2;
        }
        if ((t3>0. && (t<0. || t3<t)) && (M3.x < position.x && M3.x>position.x-dimensions.x && M3.z<position.z && M3.z>position.z-dimensions.z)){
            t = t3;
        }
        if ((t4>0. && (t<0. || t4<t)) && (M4.y < position.y && M4.y>position.y-dimensions.y && M4.x<position.x && M4.x>position.x-dimensions.x)){
            t = t4;
        }
        if ((t5>0. && (t<0. || t5<t)) && (M5.y < position.y && M5.y>position.y-dimensions.y && M5.x<position.x && M5.x>position.x-dimensions.x)){
            t = t5;
        }

        return t;
    }

    vec3 getPixelColor(){

        float rand_num =  rand(uTime + gl_FragCoord.x + uCameraWidth*gl_FragCoord.y);

        // Direction of the ray

        float dx = uCameraFov * (rand_num + gl_FragCoord.x - uCameraWidth/2.) / uCameraHeight;
        float dy = uCameraFov * (uCameraHeight - (rand_num + gl_FragCoord.y) - uCameraHeight/2.) / uCameraHeight;

        vec3 direction =  -(uCameraDirection.xyz - dx * uCameraDirectionX.xyz - dy * uCameraDirectionY.xyz);

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
        bool hitting_box = false;
        bool hitting_triangle = false;

        for (int object_index=0; object_index < objects_sizes.x; object_index+=3){

            vec4 object_indices = texture(uObjects, vec2( (float(object_index) + 0.5) / float(objects_sizes.x) ));
            vec4 object_position = texture(uObjects, vec2( (float(object_index) + 1. + 0.5) / float(objects_sizes.x) ));
            vec4 object_dimensions = texture(uObjects, vec2( (float(object_index) + 2. + 0.5) / float(objects_sizes.x) ));
            Object object = Object(object_indices.x, object_indices.y, object_indices.z, object_position.xyz, object_dimensions.xyz);

            float t_box = intersectBox(uCameraPosition, direction, object.position, object.dimensions);

            // if (t_box > 0. && (t<0. || t_box < t)){
            //     t = t_box;
            // }

            if (t_box >= 0.){ // if we hit the bounding box of the object

                hitting_box = true;

                vec3 hitPoint = uCameraPosition + t_box * direction;

                vec4 albedo = texture(uMaterials, vec2( (object.material_index + 0.5) / float(materials_sizes.x) ));
                vec4 transparency = texture(uMaterials, vec2( (object.material_index + 1. + 0.5) / float(materials_sizes.x) ));
                vec4 metallic = texture(uMaterials, vec2( (object.material_index + 2. + 0.5) / float(materials_sizes.x) ));
                vec4 ior = texture(uMaterials, vec2( (object.material_index + 3. + 0.5) / float(materials_sizes.x) ));
                vec4 emissive = texture(uMaterials, vec2( (object.material_index + 4. + 0.5) / float(materials_sizes.x) ));
                
                Material material = Material(albedo.xyz, transparency.xyz, metallic.xyz, ior.xyz, emissive.xyz);
    
                // loop on triangles
                float triangle_index = object.triangle_index;
        
                while (triangle_index < object.triangle_index + object.nb_triangles){
        
                    // coords of texture between 0 and 1 (looped so 1.x = 0.x)
                    vec2 triangle_coords = vec2( (triangle_index+0.5)/float(triangles_sizes.x) , 0 );
                    uvec4 triangle = texture(uTriangles, triangle_coords); // a channel always 1.
        
                    float t2 = intersecTriangle(hitPoint, direction, triangle, vertices_sizes);

                    vec3 hitPointTriangle = hitPoint + t2 * direction;
                    bool is_in_box = inBox(hitPointTriangle, object.position, object.dimensions);
                    if (is_in_box && (t2 > 0. && (t < 0. || t_box + t2 < t))){
                        t = t_box + t2;
                        current_material = material;
                        hitting_triangle = true;
                    }

                    triangle_index++;
                }
            }

        }

        // Si on a intersect qqchose
        if (t >= 0.){

            // return current_material.albedo;

            // depth
            float l = 1. - t/100.;
            return vec3(l, l, l);
        }

        if (hitting_triangle){
            return vec3(0.,0.,0.5);
        }

        if (hitting_box){
            return vec3(0.5,0.,0.);
        }

        return sky_box_color;
    }

    out vec4 fragColor;

    void main() {
        vec3 color = getPixelColor();
        fragColor = vec4(color ,1.);
    }
`;

export {
  TriangleFragmentShaderSource,
  TriangleVertexShaderSource,
  RayTracingFragmentShaderSource,
  RayTracingVertexShaderSource,
};
