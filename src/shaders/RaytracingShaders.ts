const raytracing_vertex_shader_src = `#version 300 es

precision highp float;

in vec4 aVertexPosition;

void main() {
    gl_Position = aVertexPosition;
}

`;

const raytracing_frag_shader_src = `#version 300 es

// Precisions

precision highp float;
precision mediump int;

// Structures

struct Object
{
    float inner_objects_index;
    float nb_inner_objects;
    float parent_object_index;

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
    vec3 roughness; // How the light is being dispersed when reflected
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
vec4 intersectMesh(vec3 object_absolute_position, vec3 object_absolute_dimensions, Object object, vec3 cast_point, vec3 direction, ivec2 vertices_sizes, ivec2 triangles_sizes);
float intersectTriangle(vec3 cast_point, vec3 direction, vec3 v0, vec3 v1, vec3 v2);
vec2 intersectBox(vec3 position, vec3 dimensions);
bool inBox(vec3 position, vec3 box_position, vec3 dimensions);
vec3 getPixelColor();

float rand(float x){
    // return 0.;
    float a = uTime * (gl_FragCoord.x + uCameraWidth*gl_FragCoord.y + x)/10.;
    return a -  floor(a);
    // return fract(sin(uTime + gl_FragCoord.x + uCameraWidth*gl_FragCoord.y + x)*424242.0);
}

vec4 intersectMesh(vec3 object_absolute_position, vec3 object_absolute_dimensions, Object object, vec3 cast_point, vec3 direction, ivec2 vertices_sizes, ivec2 triangles_sizes){

    float t = -1. ;
    vec3 normale = vec3(0.,0.,0.);
    float triangle_index = object.triangle_index;

    while (triangle_index < object.triangle_index + object.nb_triangles){
        
        // coords of texture between 0 and 1 (looped so 1.x = 0.x)
        vec2 triangle_coords = vec2( (triangle_index+0.5)/float(triangles_sizes.x) , 0 );
        uvec4 triangle = texture(uTriangles, triangle_coords); // a channel always 1.

        float vertices_width = float(vertices_sizes.x);

        vec3 v0 = texture(uVertices, vec2( (float(triangle.x) + 0.5)/ vertices_width, 0 )).xyz;
        vec3 v1 = texture(uVertices, vec2( (float(triangle.y) + 0.5)/vertices_width , 0 )).xyz;
        vec3 v2 = texture(uVertices, vec2( (float(triangle.z) + 0.5)/vertices_width , 0 )).xyz;

        v0 = object_absolute_position + v0 * object_absolute_dimensions;
        v1 = object_absolute_position + v1 * object_absolute_dimensions;
        v2 = object_absolute_position + v2 * object_absolute_dimensions;

        float t_triangle = intersectTriangle(cast_point, direction, v0, v1, v2);

        vec3 hitPointTriangle = cast_point + t_triangle * direction;
        bool is_in_box = inBox(hitPointTriangle, object_absolute_position, object_absolute_dimensions);
        if (is_in_box && (t_triangle > 0. && (t < 0. || t_triangle < t))){
            t = t_triangle;

            // Get normale
            float vertices_width = float(vertices_sizes.x);
            vec3 v0 = texture(uVertices, vec2( (float(triangle.x) + 0.5)/vertices_width, 0 )).xyz;
            vec3 v1 = texture(uVertices, vec2( (float(triangle.y) + 0.5)/vertices_width , 0 )).xyz;
            vec3 v2 = texture(uVertices, vec2( (float(triangle.z) + 0.5)/vertices_width , 0 )).xyz;
            
            normale = cross(v1 - v0, v2 - v0);
            normale = normalize(normale);
            // float area = length(normale); 
            // normale /= area;
        }

        triangle_index++;
    }

    return vec4(t, normale);
}

float intersectTriangle(vec3 cast_point, vec3 direction, vec3 v0, vec3 v1, vec3 v2){
    // Compute plane normale
    
    vec3 normale = normalize(cross(v1 - v0, v2 - v0));

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

vec2 intersectBox(vec3 cast_point, vec3 direction, vec3 position, vec3 dimensions){
    float min_t = 10000000.0;
    float max_t = -10000000.0;

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

    if (M0.y < position.y && M0.y>position.y-dimensions.y && M0.z<position.z && M0.z>position.z-dimensions.z){
        if (t0 < min_t){
            min_t = t0;
        }
        if (t0 > max_t){
            max_t = t0;
        }
    }
    if (M1.y < position.y && M1.y>position.y-dimensions.y && M1.z<position.z && M1.z>position.z-dimensions.z){
        if (t1 < min_t){
            min_t = t1;
        }
        if (t1 > max_t){
            max_t = t1;
        }
    }
    if (M2.x < position.x && M2.x>position.x-dimensions.x && M2.z<position.z && M2.z>position.z-dimensions.z){
        if (t2 < min_t){
            min_t = t2;
        }
        if (t2 > max_t){
            max_t = t2;
        }
    }
    if (M3.x < position.x && M3.x>position.x-dimensions.x && M3.z<position.z && M3.z>position.z-dimensions.z){
        if (t3 < min_t){
            min_t = t3;
        }
        if (t3 > max_t){
            max_t = t3;
        }
    }
    if (M4.y < position.y && M4.y>position.y-dimensions.y && M4.x<position.x && M4.x>position.x-dimensions.x){
        if (t4 < min_t){
            min_t = t4;
        }
        if (t4 > max_t){
            max_t = t4;
        }
    }
    if (M5.y < position.y && M5.y>position.y-dimensions.y && M5.x<position.x && M5.x>position.x-dimensions.x){
        if (t5 < min_t){
            min_t = t5;
        }
        if (t5 > max_t){
            max_t = t5;
        }
    }

    return vec2(min_t, max_t);
}

vec3 getPixelColor(){
    // texture sizes
    ivec2 vertices_sizes = textureSize(uVertices, 0);
    ivec2 triangles_sizes = textureSize(uTriangles, 0);
    ivec2 objects_sizes = textureSize(uObjects, 0);
    ivec2 materials_sizes = textureSize(uMaterials, 0);
    ivec2 light_sources_sizes = textureSize(uLightSources, 0);

    // Direction of the ray

    // random number to offset ray
    float rand_num =  rand(-1.);

    float dx = uCameraFov * (rand_num + gl_FragCoord.x - uCameraWidth/2.) / uCameraHeight;
    float dy = uCameraFov * (uCameraHeight - (rand_num + gl_FragCoord.y) - uCameraHeight/2.) / uCameraHeight;

    vec3 direction =  -(uCameraDirection.xyz - dx * uCameraDirectionX.xyz - dy * uCameraDirectionY.xyz);
    direction = normalize(direction);

    // skybox_color defined by the direction
    vec3 sky_box_color = vec3(direction.x/2. + 0.5, direction.y/2. + 0.5, direction.z/2. + 0.5);



    int step = 0;
    int max_step = 20;
    float distance = 0.;
    vec3 cast_point = uCameraPosition;

    float ray_percentage = 1.;
    vec3 inLight = vec3(0.,0.,0.);
    float diaphragme = 0.5;

    float parent_object_index = 0.;

    vec4 parent_object_inner_objects = texture(uObjects, vec2( (parent_object_index + 0.5) / float(objects_sizes.x) ));
    vec4 parent_object_indices = texture(uObjects, vec2( (parent_object_index + 1. + 0.5) / float(objects_sizes.x) ));
    vec4 parent_object_position = texture(uObjects, vec2( (parent_object_index + 2. + 0.5) / float(objects_sizes.x) ));
    vec4 parent_object_dimensions = texture(uObjects, vec2( (parent_object_index + 3. + 0.5) / float(objects_sizes.x) ));
    Object parent_object = Object(parent_object_inner_objects.x, parent_object_inner_objects.y, parent_object_inner_objects.z, parent_object_indices.x, parent_object_indices.y, parent_object_indices.z, parent_object_position.xyz, parent_object_dimensions.xyz);    
    
    vec3 parent_position = vec3(0.);
    vec3 parent_dimensions = vec3(-1.);

    // All ray steps
    while (step < max_step && ray_percentage > 0.001){

        float nb_inner_objects =  parent_object.nb_inner_objects;
        float inner_object_index = parent_object.inner_objects_index;

        // loop on inner objects

        float next_t = -1.;
        float t_object = -1.;
        
        // Find closest inner_object

        Object closest_object;
        bool hitting_object = false;
        vec3 dh = vec3(0.1);

        while (inner_object_index < parent_object.inner_objects_index + 4.*nb_inner_objects){
            vec4 object_inner_objects = texture(uObjects, vec2( (inner_object_index + 0.5) / float(objects_sizes.x) ));
            vec4 object_indices = texture(uObjects, vec2( (inner_object_index + 1. + 0.5) / float(objects_sizes.x) ));
            vec4 object_position = texture(uObjects, vec2( (inner_object_index + 2. + 0.5) / float(objects_sizes.x) ));
            vec4 object_dimensions = texture(uObjects, vec2( (inner_object_index + 3. + 0.5) / float(objects_sizes.x) ));
            Object inner_object = Object(object_inner_objects.x, object_inner_objects.y, object_inner_objects.z, object_indices.x, object_indices.y, object_indices.z, object_position.xyz, object_dimensions.xyz);

            vec2 min_max_t = intersectBox(cast_point, direction, parent_position + inner_object.position, inner_object.dimensions);
            float min_t = min_max_t.x;
            float max_t = min_max_t.y;

            if (min_t < max_t && max_t>0.){ // Si le rayon intersect la box
                float t = max(min_t, 0.); // Si min_t < 0. on est dans l'objet

                if (t_object<0. || t < t_object){
                    hitting_object = true;
                    closest_object = inner_object;
                    t_object = t;
                    next_t = max_t - t_object + 0.01;
                }
            }

            inner_object_index += 4.;
        }

        // Go in closest_object
        if (hitting_object){

            // change step
            cast_point = cast_point + t_object * direction;
            distance += t_object;

            if (closest_object.nb_inner_objects > 0.){

                // change parent_object
                parent_object = closest_object;
                parent_position += closest_object.position;

            } else {

                // intersect Mesh

                vec4 res = intersectMesh(parent_position + closest_object.position, closest_object.dimensions,
                    closest_object, cast_point, direction, vertices_sizes, triangles_sizes);

                float t_mesh = res.r;
                vec3 normale = res.gba;
                
                float box_transparency = 0.9;

                if (t_mesh > 0.){ // si on intersecte le mesh

                    // Material
    
                    vec4 albedo = texture(uMaterials, vec2( (closest_object.material_index + 0.5) / float(materials_sizes.x) ));
                    vec4 transparency = texture(uMaterials, vec2( (closest_object.material_index + 1. + 0.5) / float(materials_sizes.x) ));
                    vec4 metallic = texture(uMaterials, vec2( (closest_object.material_index + 2. + 0.5) / float(materials_sizes.x) ));
                    vec4 roughness = texture(uMaterials, vec2( (closest_object.material_index + 3. + 0.5) / float(materials_sizes.x) ));
                    vec4 ior = texture(uMaterials, vec2( (closest_object.material_index + 4. + 0.5) / float(materials_sizes.x) ));
                    vec4 emissive = texture(uMaterials, vec2( (closest_object.material_index + 5. + 0.5) / float(materials_sizes.x) ));
                    
                    Material material = Material(albedo.xyz, transparency.xyz, metallic.xyz, roughness.xyz, ior.xyz, emissive.xyz);    

                    // box color (transparent)
                    // float light_throug = pow(box_transparency, t_mesh);
                    // inLight += ray_percentage*vec3(1.-light_throug, 0., 0.);
                    // ray_percentage *= light_throug;

                    // go to mesh
                    cast_point = cast_point + t_mesh * direction;
                    distance += t_mesh;
                    
                    // Reflection
                    if (rand(float(step)) < material.metallic.x){
                        cast_point -= 0.001 * direction;
                        float c = dot(direction, normale);

                        if (c < 0.){
                            direction -= 2. * dot(direction, normale) * normale;
                        } else {
                            direction += 2. * dot(direction, normale) * normale;
                        }
                        direction = normalize(direction);
                    } else {
                        // triangle light
                        vec3 triangle_light = material.emmissive;
                        inLight += ray_percentage*triangle_light;
                        cast_point = cast_point + 0.001 * direction;
                        break;
                    }

                } else {
                    // float light_throug = pow(box_transparency, next_t);
                    // inLight += ray_percentage*vec3(1.-light_throug, 0., 0.);
                    // ray_percentage *= light_throug;

                    cast_point = cast_point + next_t * direction;
                    distance += next_t;
                }
            }
        } else {
            if (parent_object.parent_object_index < 0.){ // we hit the skybox
                sky_box_color = vec3(direction.x/2. + 0.5, direction.y/2. + 0.5, direction.z/2. + 0.5);
                inLight += ray_percentage*sky_box_color;
                // inLight = vec3(ray_percentage);
                break;
            } else { // we go to parent box

                // Move cast point

                vec2 min_max_t = intersectBox(cast_point, direction, parent_position, parent_object.dimensions);
                float min_t = min_max_t.x;
                float max_t = min_max_t.y;

                float parent_next_t = max_t + 0.01;

                cast_point = cast_point + parent_next_t * direction;
                distance += parent_next_t;

                // Change parent_object
                parent_position -= parent_object.position;

                vec4 parent_object_inner_objects = texture(uObjects, vec2( (parent_object.parent_object_index + 0.5) / float(objects_sizes.x) ));
                vec4 parent_object_indices = texture(uObjects, vec2( (parent_object.parent_object_index + 1. + 0.5) / float(objects_sizes.x) ));
                vec4 parent_object_position = texture(uObjects, vec2( (parent_object.parent_object_index + 2. + 0.5) / float(objects_sizes.x) ));
                vec4 parent_object_dimensions = texture(uObjects, vec2( (parent_object.parent_object_index + 3. + 0.5) / float(objects_sizes.x) ));
                parent_object = Object(parent_object_inner_objects.x, parent_object_inner_objects.y, parent_object_inner_objects.z,
                    parent_object_indices.x, parent_object_indices.y, parent_object_indices.z,
                    parent_object_position.xyz, parent_object_dimensions.xyz);    
            }
        }

        step++;
    }
    // return vec3(float(step)/float(max_step));
    // return vec3(distance/300.);
    return diaphragme * inLight;
}


out vec4 fragColor;

void main() {
    vec3 color = getPixelColor();
    fragColor = vec4(color ,1.);
}

`;

export { raytracing_vertex_shader_src, raytracing_frag_shader_src };
