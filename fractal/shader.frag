vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 ezPalette(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1., 1., 1.);
  vec3 d = vec3(0.263, 0.416, 0.557);
  return palette(t, a, b, c, d);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord * 2. - iResolution.xy) / iResolution.y;
  vec2 uv0 = uv;
  vec3 finalColor = vec3(0.);

  for (float i = 0.; i < 6.0; i++) {
    uv = fract(uv * 1.5) - 0.5;
    float d = length(uv) * exp(-length(uv0));

    d = 0.01 / (sin(d * 8. + iTime) / 8.);
    finalColor += ezPalette(length(uv0) + i * 0.4 + iTime * 0.4) * d;
  }

  fragColor = vec4(finalColor, 1.);
}