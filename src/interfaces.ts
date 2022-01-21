import { mat4, vec3 } from 'gl-matrix'

export interface ProjectedMouse {
  rayStart: vec3
  rayEnd: vec3
  rayDirection: vec3
}

export interface BoundingBox {
  min: vec3
  max: vec3
}

export interface PerspectiveCamera {
  projectionMatrix: mat4
  viewMatrixInverse: mat4
  position: vec3
}
