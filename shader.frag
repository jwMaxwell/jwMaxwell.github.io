float distanceField(vec3 position) {
  vec3 newPosition = position * 2.0 + iTime;
  return length(position + vec3(sin(iTime * 0.7))) * log(length(position) + 1.0) +
    sin(newPosition.x + sin(newPosition.z + sin(newPosition.y))) * 0.5 - 1.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord * 2. - iResolution.xy) / iResolution.y * 0.55;
  vec3 accColor = vec3(0.0);
  float offset = 2.5;

  float timeFactorX = iTime * 0.4;
  float timeFactorY = iTime * 0.3;
  for (int iteration = 0; iteration <= 4; ++iteration) {
    vec3 currentUV = vec3(0.0, 0.0, 5.0) + normalize(vec3(uv, -1.0)) * offset;
    
    float distanceValue = distanceField(currentUV);
    
    accColor = (accColor + smoothstep(2.5, 0.0, distanceValue) * 0.7) * 
      (vec3(0.1, 0.3, 0.4) + vec3(5.0, 2.5, 3.0) 
      * clamp((distanceValue - distanceField(currentUV + 0.1)) * 0.5, -0.1, 1.0));

    offset += min(distanceValue, 1.0);
  }

  fragColor = vec4(accColor, 1.0);
}

