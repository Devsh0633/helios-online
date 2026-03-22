precision highp float;

varying vec2 vUv;
varying float vRadius;

uniform float innerRadius;
uniform float outerRadius;
uniform float gapCenter;
uniform float gapHalfWidth;
uniform vec3 ringColor;
uniform vec3 highlightColor;
uniform float opacity;

void main() {
  float radial = (vRadius - innerRadius) / max(outerRadius - innerRadius, 0.0001);

  if (radial <= 0.0 || radial >= 1.0) {
    discard;
  }

  float edgeFade = smoothstep(0.0, 0.08, radial) * smoothstep(1.0, 0.86, radial);
  float bands = 0.65 + 0.22 * sin(radial * 52.0) + 0.13 * sin(radial * 126.0 + vUv.x * 60.0);
  float grain = 0.9 + 0.1 * sin(vUv.x * 420.0 + radial * 240.0);
  float gapMask = 1.0;

  if (gapHalfWidth > 0.0) {
    float gapRise = smoothstep(gapCenter - gapHalfWidth, gapCenter - gapHalfWidth * 0.2, vRadius);
    float gapFall = 1.0 - smoothstep(gapCenter + gapHalfWidth * 0.2, gapCenter + gapHalfWidth, vRadius);
    gapMask -= gapRise * gapFall;
  }

  vec3 color = mix(ringColor, highlightColor, radial * 0.45 + bands * 0.2);
  float alpha = edgeFade * bands * grain * gapMask * opacity;

  gl_FragColor = vec4(color, alpha);
}
