precision highp float;

varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform vec3 glowColor;
uniform float intensity;
uniform float power;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), power);
  float shimmer = 0.94 + 0.06 * sin(vWorldPosition.y * 0.03 + vWorldPosition.x * 0.02);
  vec3 color = glowColor * fresnel * intensity * shimmer;

  gl_FragColor = vec4(color, clamp(fresnel * intensity, 0.0, 1.0));
}
