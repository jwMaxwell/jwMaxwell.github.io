#define get(i,j) float( texture(iChannel1, (uv + vec2(i,j)*vec2(1.0/resolution) )).r > 0.)

const float innerRadius = 1.;
const float outerRadius = 10.;
const float growth = 1.;
const float decay = 1.;
const float alpha = 0.5;
const float beta = 0.26;
const float gamma = 0.46;
const float delta = 0.27;
const float epsilon = 0.36;

vec2 getConv (vec2 uv, vec2 resolution) {
    float ui = 0.;
    float uo = 0.;
    float uic = 0.;
    float uoc = 0.;

    for (float dx = -outerRadius; dx <= outerRadius; dx++) {
        float dxSq = dx * dx;
        for (float dy = -outerRadius; dy <= outerRadius; dy++) {
            float distSq = dxSq + dy * dy;
            
            if (distSq <= innerRadius * innerRadius) {
                ui += get(dx, dy);
                uic++;
            } else if (distSq <= outerRadius * outerRadius) {
                uo += get(dx, dy);
                uoc++;
            }
        }
    }
    
    return vec2(ui / uic, uo / uoc);
}

float life (float v, vec2 uv, vec2 resolution) {
    vec2 convolutions = getConv(uv, resolution);
    float ui = convolutions.x;
    float uo = convolutions.y;
    
    if ((ui >= alpha && uo >= beta && uo <= gamma) 
        || (ui < alpha && uo >= delta && uo <= epsilon))
        v += growth;
    else
        v -= decay;
    
    return clamp(v, 0., 1.);
}

void mainImage( out vec4 O, in vec2 c )
{
	vec2 resolution = iResolution.xy;
    vec2 uv = c.xy / resolution;
    float v = texture(iChannel1, uv).r;
    
    if(iFrame > 1)
    {
        O = vec4(vec3(life(v, uv, resolution)), 1.0);
    }
    else
    {
        O = texture(iChannel0, uv);
    }
}
