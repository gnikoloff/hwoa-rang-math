import { mat4, vec2, vec3, vec4 } from 'gl-matrix'
import { BoundingBox, ProjectedMouse, PerspectiveCamera } from './interfaces'

/**
 * Clamp number to a given range
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (num: number, min: number, max: number): number =>
  Math.min(Math.max(num, min), max)

/**
 * Maps a number from one range to another
 * @param {number} val
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {number}
 */
export const mapNumberRange = (
  val: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

/**
 * Check if number is power of 2
 * @param {number} value
 * @returns {number}
 */
export const isPowerOf2 = (value: number): boolean =>
  (value & (value - 1)) === 0

/**
 * Normalizes a number
 * @param {number} min
 * @param {number} max
 * @param {number} val
 * @returns {number}
 */
export const normalizeNumber = (
  min: number,
  max: number,
  val: number,
): number => (val - min) / (max - min)

/**
 * Used when creating round-cube geometry edge vertices
 * @param {number} t
 * @returns {number}
 */
export const triangleWave = (t: number): number => {
  t -= Math.floor(t * 0.5) * 2
  t = Math.min(Math.max(t, 0), 2)
  return 1 - Math.abs(t - 1)
}

/**
 * Convert degree to radian
 * @param {number} deg
 * @returns {number}
 */
export const deg2Rad = (deg: number): number => (deg * Math.PI) / 180

/**
 * Convert radian to degree
 * @param {number} deg
 * @returns {number}
 */
export const rad2Deg = (rad: number): number => (rad * 180) / Math.PI

/**
 * Project a mouse coord in NDC space to world space
 * @see https://stackoverflow.com/questions/20140711/picking-in-3d-with-ray-tracing-using-ninevehgl-or-opengl-i-phone
 * @param {vec2} normMouseCoords
 * @param {PerspectiveCamera} camera
 * @param {number} rayScale
 * @returns {ProjectedMouse}
 */
export const projectMouseToWorldSpace = (
  normMouseCoords: vec2,
  camera: PerspectiveCamera,
  rayScale = 999,
): ProjectedMouse => {
  const normX = normMouseCoords[0]
  const normY = normMouseCoords[1]
  // Homogeneous clip coordinates
  const vec4Clip = vec4.fromValues(normX, normY, -1, 1)
  // 4D eye (camera) coordinates
  const vec4Eye = vec4.create()
  const matInvProjection = mat4.create()
  mat4.invert(matInvProjection, camera.projectionMatrix)
  vec4.transformMat4(vec4Eye, vec4Clip, matInvProjection)
  vec4Eye[2] = -1
  vec4Eye[3] = 0
  // 4D world coordinates
  const vec4World = vec4.create()
  vec4.transformMat4(vec4World, vec4Eye, camera.viewMatrixInverse)
  const ray = vec3.fromValues(vec4World[0], vec4World[1], vec4World[2])
  vec3.normalize(ray, ray)
  // get rayStart and rayEnd
  const rayStart = vec3.fromValues(
    camera.position[0],
    camera.position[1],
    camera.position[2],
  )
  const rayEnd = vec3.create()
  vec3.copy(rayEnd, rayStart)
  const rayMul = vec3.create()
  vec3.copy(rayMul, ray)
  vec3.scale(rayMul, ray, rayScale)
  vec3.add(rayEnd, rayStart, rayMul)
  // get direction between two points
  const rayDirection = vec3.create()
  vec3.subtract(rayDirection, rayEnd, rayStart)

  return {
    rayStart,
    rayEnd,
    rayDirection,
  }
}

/**
 * Do a line-plane intersection
 * @param {vec3} rayStart
 * @param {vec3} rayDirection
 * @param {vec3} planePos
 * @param {vec3} planeNormal
 * @returns {[number, vec3] | null} - time along the ray normal and intersectPoint as vec3 if success, null if not
 */
export const intersectRayWithPlane = (
  rayStart: vec3,
  rayDirection: vec3,
  planePos: vec3,
  planeNormal: vec3,
): [number, vec3] | null => {
  const rayToPlaneDelta = vec3.create()
  vec3.sub(rayToPlaneDelta, planePos, rayStart)

  // project ray to plane distance vector onto plane normal
  const wp = vec3.dot(rayToPlaneDelta, planeNormal)
  // project ray direction distance vector onto plane normal
  const vp = vec3.dot(rayDirection, planeNormal)

  // check for zero
  const time = wp / vp
  if (time >= 0) {
    // find Intersection Point
    const intersectPoint = vec3.create()
    vec3.scale(intersectPoint, rayDirection, time)
    vec3.add(intersectPoint, intersectPoint, rayStart)
    return [time, intersectPoint]
  }
  return null
}

/**
 * Test ray against a triangle
 * @see https://www.youtube.com/watch?v=OOqDkG035T0
 * @param {vec3} rayStart
 * @param {vec3} rayDirection
 * @param {[vec3, vec3, vec3]} verticesArr - The three vertices of the triangle in world space
 * @returns {[number, vec3] | null} - time along the ray normal and intersectPoint as vec3 if success, null if not
 */
export const intersectRayWithTriangle = (
  rayStart: vec3,
  rayDirection: vec3,
  verticesArr: [vec3, vec3, vec3],
): [number, vec3] | null => {
  // calculate position and normal of the plane the triangle positions occupy
  const planeNormal = vec3.create()
  const v0 = verticesArr[0] // any point on the triangle will do as a start
  const v1 = verticesArr[1]
  const v2 = verticesArr[2]
  const edge0 = vec3.create()
  vec3.sub(edge0, v1, v0)
  // const edge1 = vec3.create()
  // vec3.sub(edge1, v2, v1)
  const edge2 = vec3.create()
  vec3.sub(edge2, v2, v0)

  // cross (v1 - v0, v2 - v0) counter clockwise to get correct direction
  vec3.cross(planeNormal, edge0, edge2)
  // find ratio (time) of intersection of ray vector with the plane the triangle occupies
  const interesction = intersectRayWithPlane(
    rayStart,
    rayDirection,
    v0,
    planeNormal,
  )

  if (!interesction) {
    return null
  }
  const [rayTime, intersectPoint] = interesction

  const edge = vec3.create() // length of edge
  const intersectPointLength = vec3.create() // intersection point length from starting of edge
  const crossProductEdgeIntersectPointLength = vec3.create()

  for (let i = 0, ii; i < verticesArr.length; i++) {
    ii = (i + 1) % 3 // wrap index through v1, v2, v0
    // edge length
    vec3.copy(edge, verticesArr[ii])
    vec3.sub(edge, edge, verticesArr[i])
    // intersection to edge length
    vec3.copy(intersectPointLength, intersectPoint)
    vec3.sub(intersectPointLength, intersectPointLength, verticesArr[i])
    // cross product of edge and intersectPointLength
    vec3.cross(crossProductEdgeIntersectPointLength, edge, intersectPointLength)
    if (vec3.dot(planeNormal, crossProductEdgeIntersectPointLength) < 0) {
      return null
    }
  }
  return [rayTime, intersectPoint]
}

/**
 * Test ray against a quad
 * @param {vec3} rayStart
 * @param {vec3} rayDirection
 * @param {[vec3, vec3, vec3, vec3]} verticesArr - The four vertices of the quad in world space
 * @returns {[number, vec3] | null} - time along the ray normal and intersectPoint as vec3 if success, null if not
 */
export const intersectRayWithQuad = (
  rayStart: vec3,
  rayDirection: vec3,
  verticesArr: [vec3, vec3, vec3, vec3],
): [number, vec3] | null => {
  const v0 = verticesArr[0]
  const v1 = verticesArr[1]
  const v2 = verticesArr[2]
  // const v3 = verticesArr[3]

  // figure out the normal direction of the quad
  // take 3 sequential corners, get two vector lengths for two edges and cross apply in clockwise order
  const planeNormal = vec3.create()
  const edge0 = vec3.create()
  vec3.sub(edge0, v0, v1)
  const edge1 = vec3.create()
  vec3.sub(edge1, v2, v1)
  vec3.cross(planeNormal, edge1, edge0)

  const intersection = intersectRayWithPlane(
    rayStart,
    rayDirection,
    v0,
    planeNormal,
  )
  if (!intersection) {
    return null
  }

  const [rayTime, intersectPoint] = intersection

  vec3.sub(edge0, v1, v0)
  const plen = vec3.create()
  vec3.sub(plen, intersectPoint, v0)
  let t = vec3.dot(plen, edge0) / vec3.dot(edge0, edge0)
  if (t < 0 || t > 1) {
    return null
  }

  vec3.sub(edge1, v2, v1)
  vec3.sub(plen, intersectPoint, v1)
  t = vec3.dot(plen, edge1) / vec3.dot(edge1, edge1)
  if (t < 0 || t > 1) {
    return null
  }

  return [rayTime, intersectPoint]
}

/**
 * Test ray against Axis Aligned Bounding Box
 * @see https://gdbooks.gitbooks.io/3dcollisions/content/Chapter3/raycast_aabb.html
 * @param {BoundingBox} box
 * @param {vec3} origin
 * @param {vec3} direction
 * @returns {number | null}
 */
export const intersectRayWithAABB = (
  origin: vec3,
  direction: vec3,
  box: BoundingBox,
): number | null => {
  const tMinX = (box.min[0] - origin[0]) / direction[0]
  const tMaxX = (box.max[0] - origin[0]) / direction[0]
  const tMinY = (box.min[1] - origin[1]) / direction[1]
  const tMaxY = (box.max[1] - origin[1]) / direction[1]
  const tMinZ = (box.min[2] - origin[2]) / direction[2]
  const tMaxZ = (box.max[2] - origin[2]) / direction[2]
  const tmin = Math.max(
    Math.max(Math.min(tMinX, tMaxX), Math.min(tMinY, tMaxY)),
    Math.min(tMinZ, tMaxZ),
  )
  const tmax = Math.min(
    Math.min(Math.max(tMinX, tMaxX), Math.max(tMinY, tMaxY)),
    Math.max(tMinZ, tMaxZ),
  )

  if (tmax < 0) {
    return null
  }

  if (tmin > tmax) {
    return null
  }

  return tmin
}
