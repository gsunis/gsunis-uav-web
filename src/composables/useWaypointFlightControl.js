import { ref, onBeforeUnmount } from 'vue'
import { defined, Math as CesiumMath, Cartographic, ScreenSpaceEventType, ScreenSpaceEventHandler } from 'cesium'

export function useWaypointFlightControl(viewer, onLeftClick, onLeftDown, onLeftUp, onMouseMove) {
  const isMoving = ref(false)
  const handler = new ScreenSpaceEventHandler(viewer.canvas)

  function getCoordinates(position) {
    const cartesian = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)

    if (defined(cartesian)) {
      const picked = viewer.scene.pick(position)
      const cartographic = Cartographic.fromCartesian(cartesian)

      return {
        longitude: CesiumMath.toDegrees(cartographic.longitude),
        latitude: CesiumMath.toDegrees(cartographic.latitude),
        picked
      }
    } else {
      return null
    }
  }

  handler.setInputAction((event) => {
    const picked = viewer.scene.pick(event.position)
    const ray = viewer.camera.getPickRay(event.position)
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene)

    if (defined(cartesian)) {
      const cartographic = Cartographic.fromCartesian(cartesian)
      const longitude = CesiumMath.toDegrees(cartographic.longitude)
      const latitude = CesiumMath.toDegrees(cartographic.latitude)
      const height = cartographic.height

      onLeftClick(longitude, latitude, Math.round(height), picked)
    }
  }, ScreenSpaceEventType.LEFT_CLICK)

  handler.setInputAction((event) => {
    const coords = getCoordinates(event.position)

    if (coords?.picked?.id?.id.includes('waypoint')) {
      isMoving.value = true
      onLeftDown(coords.picked)
      viewer.scene.screenSpaceCameraController.enableRotate = false
    }
  }, ScreenSpaceEventType.LEFT_DOWN)

  handler.setInputAction(() => {
    onLeftUp()
    isMoving.value = false
    viewer.scene.screenSpaceCameraController.enableRotate = true
  }, ScreenSpaceEventType.LEFT_UP)

  handler.setInputAction((event) => {
    if (isMoving.value) {
      const ray = viewer.camera.getPickRay(event.endPosition)
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene)

      if (defined(cartesian)) {
        const cartographic = Cartographic.fromCartesian(cartesian)
        const longitude = CesiumMath.toDegrees(cartographic.longitude)
        const latitude = CesiumMath.toDegrees(cartographic.latitude)
        const height = cartographic.height

        onMouseMove(longitude, latitude, Math.round(height))
      }
    }
  }, ScreenSpaceEventType.MOUSE_MOVE)

  onBeforeUnmount(() => handler.destroy())
}
