precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int octave = 0; octave < 4; octave += 1) {
    value += amplitude * noise(p);
    p *= 2.06;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float radius = length(uv);

  if (radius > 1.0) {
    discard;
  }

  float angle = atan(uv.y, uv.x);
  float turbulence = fbm(vec2(angle * 4.0, radius * 7.0 - uTime * 0.2));
  float spikes = pow(
    max(0.0, cos(angle * 10.0 + turbulence * 4.5 - uTime * 0.8)),
    6.0
  );
  float innerCore = smoothstep(0.6, 0.0, radius);
  float plume = smoothstep(1.12, 0.18, radius) * (0.55 + spikes * 1.1 + turbulence * 0.55);
  float radialFade = smoothstep(1.02, 0.22, radius);

  vec3 color = mix(uColorB, uColorA, innerCore) + uColorA * plume * 0.85;
  float alpha = clamp(innerCore * 0.82 + plume * 0.5, 0.0, 1.0) * radialFade;

  gl_FragColor = vec4(color, alpha);
}
