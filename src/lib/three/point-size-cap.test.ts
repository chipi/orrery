import { describe, it, expect } from 'vitest';
import { ShaderLib } from 'three';
import { patchPointsShader } from './point-size-cap';

describe('patchPointsShader', () => {
  it('caps the point size after attenuation and rounds the point', () => {
    const { vertexShader, fragmentShader } = patchPointsShader(
      ShaderLib.points.vertexShader,
      ShaderLib.points.fragmentShader,
      4,
    );
    const atten = vertexShader.indexOf('gl_PointSize *=');
    const cap = vertexShader.indexOf('gl_PointSize = min(gl_PointSize, 4.0);');
    expect(atten).toBeGreaterThan(0);
    expect(cap).toBeGreaterThan(atten);
    expect(fragmentShader).toContain('discard');
  });

  it('fails loudly when three moves the hooks', () => {
    expect(() => patchPointsShader('void main(){}', 'void main(){}', 4)).toThrow();
  });
});
