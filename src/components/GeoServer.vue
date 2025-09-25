<template>
  <div id="map" class="map-container"></div>
  <div class="map-controls">
    <div class="control-group">
      <button @click="zoomIn" title="放大">+</button>
      <button @click="zoomOut" title="缩小">-</button>
      <button @click="resetView" title="复位">↺</button>
      <button @click="toggleRotation" title="旋转">{{ rotationEnabled ? '锁定' : '旋转' }}</button>
    </div>
    <div class="control-group">
      <div class="mouse-position">
        <span>经度: {{ mousePosition.lon || '--' }}</span>
        <span>纬度: {{ mousePosition.lat || '--' }}</span>
      </div>
    </div>
    <div class="control-group">
      <div class="scale-control">
        比例尺: 1:{{ currentScale }}
      </div>
    </div>
    <div class="control-group layer-control">
      <h4>图层控制</h4>
      <label>
        <input type="checkbox" v-model="layers.vector.visible" @change="toggleLayer('vector')" />
        天地图矢量
      </label>
      <label>
        <input type="checkbox" v-model="layers.annotation.visible" @change="toggleLayer('annotation')" />
        天地图注记
      </label>
      <label>
        <input type="checkbox" v-model="layers.MapImage.visible" @change="toggleLayer('MapImage')"/>
        天地图影像图层
      </label>
      <label>
        <input type="checkbox" v-model="layers.MapCia.visible" @change="toggleLayer('MapCia')"/>
        天地图影像注记图层
      </label>
      <label>
        <input type="checkbox" v-model="layers.MapTer.visible" @change="toggleLayer('MapTer')"/>
        天地图地形图层
      </label>
      <label>
        <input type="checkbox" v-model="layers.MapCta.visible" @change="toggleLayer('MapCta')"/>
        天地图地形注记图层
      </label>
      <label>
        <input type="checkbox" v-model="layers.wms.visible" @change="toggleLayer('wms')" />
        GeoServer WMS
      </label>
      <div v-if="layers.wms.visible" class="opacity-control">
        <span>透明度: </span>
        <input
            type="range"
            min="0"
            max="100"
            v-model="layers.wms.opacity"
            @input="updateLayerOpacity('wms')"
        />
        <span>{{ layers.wms.opacity }}%</span>
      </div>
    </div>
    <!-- 测量工具控制 -->
    <div class="control-group measurement-control">
      <h4>测量工具</h4>
      <div class="measurement-buttons">
        <button
            @click="toggleMeasurement('distance')"
            :class="{ active: activeMeasurement === 'distance' }"
            title="距离测量"
        >
          距离测量
        </button>
        <button
            @click="toggleMeasurement('area')"
            :class="{ active: activeMeasurement === 'area' }"
            title="面积测量"
        >
          面积测量
        </button>
        <button @click="clearMeasurements" title="清除测量">清除</button>
      </div>
      <div v-if="measurementResult" class="measurement-result">
        <p v-if="activeMeasurement === 'distance'">距离: {{ measurementResult }}</p>
        <p v-if="activeMeasurement === 'area'">面积: {{ measurementResult }}</p>
      </div>
    </div>
  </div>
  <!-- 移除独立的overviewMap div，因为OverviewMap控件会自动创建 -->
</template>

<script setup>
import { onMounted, nextTick, ref, reactive } from 'vue'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import XYZ from 'ol/source/XYZ'
import { defaults as defaultControls, Zoom,Rotate, ScaleLine, MousePosition, OverviewMap } from 'ol/control'
import { toStringXY } from 'ol/coordinate'
import { defaults as defaultInteractions, DragPan, MouseWheelZoom, PinchZoom, KeyboardPan, KeyboardZoom } from 'ol/interaction'
// import Projection from 'ol/proj/Projection'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Draw, Modify, Snap } from 'ol/interaction'
import { LineString, Polygon } from 'ol/geom'
import { getLength, getArea } from 'ol/sphere'
import { Style, Stroke, Fill, Circle } from 'ol/style'
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css'

// 天地图URL配置
const tiandituVecUrl = 'http://t0.tianditu.gov.cn/vec_w/wmts?tk=806184186f4a0c4f3ef1f1f6c65d9c2c&layer=vec&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}'
const tiandituCvaUrl = 'http://t0.tianditu.gov.cn/cva_w/wmts?tk=806184186f4a0c4f3ef1f1f6c65d9c2c&layer=cva&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}'
const MapImageurl = 'http://t0.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c'
const MapCiaurl = 'http://t0.tianditu.com/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c'
const MapTerurl = 'http://t0.tianditu.com/DataServer?T=ter_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c'
const MapCtaurl = 'http://t0.tianditu.com/DataServer?T=cta_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c'
const wmsUrl = 'http://localhost:8080/geoserver/shiyan1/wms';
// const wfsUrl = 'http://localhost:8080/geoserver/shiyan1/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=shiyan1:cities&outputFormat=application/json';
// 图层状态管理
const layers = reactive({
  vector: { visible: true, layer: null },
  annotation: { visible: true, layer: null },
  MapImage: {visible:true, layer:null},
  MapCia: {visible:true, layer:null},
  MapTer: {visible:true, layer:null},
  MapCta: {visible:true, layer:null},
  wms: { visible: true, opacity: 80, layer: null }
})

// 鼠标位置
const mousePosition = reactive({
  lon: null,
  lat: null
})

// 当前比例尺
const currentScale = ref('--')

// 旋转控制
const rotationEnabled = ref(false)

// 测量相关
const activeMeasurement = ref(null) // 'distance', 'area', or null
const measurementResult = ref(null)

let map = null
let overviewMapControl = null
let drawInteraction = null
let modifyInteraction = null
let snapInteraction = null
let vectorSource = null
let vectorLayer = null

// 创建测量图层
const createMeasurementLayer = () => {
  vectorSource = new VectorSource()

  vectorLayer = new VectorLayer({
    source: vectorSource,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 0, 0.2)'
      }),
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2
      }),
      image: new Circle({
        radius: 7,
        fill: new Fill({
          color: '#ffcc33'
        })
      })
    })
  })

  return vectorLayer
}

// 创建天地图矢量图层
const createTiandituVecLayer = () => {
  const layer = new TileLayer({
    source: new XYZ({
      url: tiandituVecUrl,
      tileSize: 256,
      crossOrigin: 'anonymous',
    }),
    visible: layers.vector.visible,
    zIndex: 0
  })
  layers.vector.layer = layer
  return layer
}

// 创建天地图注记图层
const createTiandituCvaLayer = () => {
  const layer = new TileLayer({
    source: new XYZ({
      url: tiandituCvaUrl,
      tileSize: 256,
      crossOrigin: 'anonymous',
    }),
    visible: layers.annotation.visible,
    zIndex: 1
  })
  layers.annotation.layer = layer
  return layer
}

//创建天地图影像图层
const createTiandiMap_img = () => {
  const layer = new TileLayer({
    source: new XYZ({
      url:MapImageurl,
      titleSize:256,
      crossOrigin:'anonymous',
    }),
    visible: layers.MapImage.visible,
    zIndex:1
  })
  layers.MapImage.layer = layer
  return layer
}

//创建天地图影像注记图层
const createTiandiMap_cia = () => {
  const layer = new TileLayer({
    source: new XYZ({
      url:MapCiaurl,
      titleSize:256,
      crossOrigin:'anonymous',
    }),
    visible: layers.MapCia.visible,
    zIndex:1
  })
  layers.MapCia.layer = layer
  return layer
}

//创建天地图地形图层
const createTiandiMap_ter = () => {
  const layer = new TileLayer({
    source: new XYZ({
      url:MapTerurl,
      titleSize:256,
      crossOrigin:'anonymous',
    }),
    visible: layers.MapTer.visible,
    zIndex:1
  })
  layers.MapTer.layer = layer
  return layer
}

//创建天地图地形注记图层
const createTiandiMap_cta = () => {
  const layer = new TileLayer({
    source: new XYZ({
      url:MapCtaurl,
      titleSize:256,
      crossOrigin:'anonymous',
    }),
    visible: layers.MapCta.visible,
    zIndex:1
  })
  layers.MapCta.layer = layer
  return layer
}

// 创建GeoServer WMS图层
const createGeoserverLayer = () => {
  const layer = new TileLayer({
    source: new TileWMS({
      url: wmsUrl,
      params: {
        'LAYERS': 'shiyan1:province',
        'TILED': true,
        'FORMAT': 'image/png',
        'TRANSPARENT': true,
      },
      serverType: 'geoserver',
      crossOrigin: 'anonymous',
      warpX:false,
    }),
    visible: layers.wms.visible,
    opacity: layers.wms.opacity / 100,
    zIndex: 2
  })
  layers.wms.layer = layer
  return layer
}
//获取GeoServer的标注图层
const createGeoserverCvaLayer = () => {
  const layer = new TileLayer({
    source: new TileWMS({
      url: wmsUrl,
      params: { 'LAYERS': 'shiyan1:cities', 'FORMAT': 'image/png' },
      serverType: 'geoserver',
      crossOrigin: 'anonymous',
      warpX:false,
    }),
    visible: layers.vector.visible,
    zIndex: 0
  })
  layers.wms.layer = layer
  return layer
}
// 切换图层显示状态
const toggleLayer = (layerType) => {
  if (layers[layerType].layer) {
    layers[layerType].layer.setVisible(layers[layerType].visible)
  }
}

// 更新图层透明度
const updateLayerOpacity = (layerType) => {
  if (layers[layerType].layer) {
    layers[layerType].layer.setOpacity(layers[layerType].opacity / 100)
  }
}

// 地图控制函数
const zoomIn = () => {
  const view = map.getView()
  const zoom = view.getZoom()
  view.setZoom(zoom + 1)
}

const zoomOut = () => {
  const view = map.getView()
  const zoom = view.getZoom()
  view.setZoom(zoom - 1)
}

const resetView = () => {
  const view = map.getView()
  view.setCenter([116.397428, 39.90923])
  view.setZoom(4)
  view.setRotation(0)
  rotationEnabled.value = false
}

const toggleRotation = () => {
  rotationEnabled.value = !rotationEnabled.value
  const interactions = map.getInteractions()
  interactions.getArray().forEach(interaction => {
    if (interaction instanceof DragPan) {
      interaction.set('constrainRotation', rotationEnabled.value ? 0 : false)
    }
  })
}

// 测量功能
const toggleMeasurement = (type) => {
  // 如果点击的是当前已激活的测量类型，则取消测量
  if (activeMeasurement.value === type) {
    clearMeasurements()
    return
  }

  // 清除之前的测量
  clearMeasurements()

  // 设置新的测量类型
  activeMeasurement.value = type

  // 根据类型创建绘制交互
  let geometryType
  if (type === 'distance') {
    geometryType = 'LineString'
  } else if (type === 'area') {
    geometryType = 'Polygon'
  }

  // 创建绘制交互
  drawInteraction = new Draw({
    source: vectorSource,
    type: geometryType,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 0, 0.2)'
      }),
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2
      }),
      image: new Circle({
        radius: 7,
        fill: new Fill({
          color: '#ffcc33'
        })
      })
    })
  })

  // 监听绘制完成事件
  drawInteraction.on('drawend', (event) => {
    const geometry = event.feature.getGeometry()
    calculateMeasurement(geometry)

    // 添加修改交互，允许用户修改已绘制的图形
    modifyInteraction = new Modify({ source: vectorSource })
    modifyInteraction.on('modifyend', (event) => {
      const features = event.features.getArray()
      if (features.length > 0) {
        calculateMeasurement(features[0].getGeometry())
      }
    })

    map.addInteraction(modifyInteraction)

    // 添加捕捉交互，使新点能吸附到已有图形上
    snapInteraction = new Snap({ source: vectorSource })
    map.addInteraction(snapInteraction)
  })

  map.addInteraction(drawInteraction)
}

// 计算测量结果
const calculateMeasurement = (geometry) => {
  if (geometry instanceof LineString) {
    // 计算距离
    // const coordinates = geometry.getCoordinates()
    const length = getLength(geometry)

    // 格式化显示
    if (length > 1000) {
      measurementResult.value = (length / 1000).toFixed(2) + ' 公里'
    } else {
      measurementResult.value = length.toFixed(2) + ' 米'
    }
  } else if (geometry instanceof Polygon) {
    // 计算面积
    const area = getArea(geometry)

    // 格式化显示
    if (area > 1000000) {
      measurementResult.value = (area / 1000000).toFixed(2) + ' 平方公里'
    } else {
      measurementResult.value = area.toFixed(2) + ' 平方米'
    }
  }
}

// 清除测量
const clearMeasurements = () => {
  // 移除交互
  if (drawInteraction) {
    map.removeInteraction(drawInteraction)
    drawInteraction = null
  }

  if (modifyInteraction) {
    map.removeInteraction(modifyInteraction)
    modifyInteraction = null
  }

  if (snapInteraction) {
    map.removeInteraction(snapInteraction)
    snapInteraction = null
  }

  // 清除测量图形
  if (vectorSource) {
    vectorSource.clear()
  }

  // 重置状态
  activeMeasurement.value = null
  measurementResult.value = null
}

// 初始化地图
const initMap = async () => {
  await nextTick()

  const mapContainer = document.getElementById('map')
  if (!mapContainer) {
    console.error('Map container not found')
    return
  }

  // 如果尺寸为0，添加紧急修复
  if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
    mapContainer.style.height = 'calc(100vh - 60px)'
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // 创建地图控件
  const zoomControl = new Zoom()
  const rotateControl = new Rotate()
  const scaleControl = new ScaleLine({
    units: 'metric',
    bar: true,
    steps: 4,
    text: true,
    minWidth: 100
  })

  const mousePositionControl = new MousePosition({
    coordinateFormat: coord => {
      if (coord) {
        mousePosition.lon = coord[0].toFixed(6)
        mousePosition.lat = coord[1].toFixed(6)
        return toStringXY(coord, 6)
      }
      return '--'
    },
    projection: 'EPSG:4326',
    className: 'custom-mouse-position'
  })

  // 创建鹰眼地图控件
  overviewMapControl = new OverviewMap({
    className: 'ol-overviewmap',
    layers: [
      new TileLayer({
        source: new XYZ({
          url: tiandituVecUrl,
          tileSize: 256,
          crossOrigin: 'anonymous',
        })
      })
    ],
    collapseLabel: '\u00BB',
    label: '\u00AB',
    collapsed: false
  })

  // 创建地图实例
  map = new Map({
    target: 'map',
    layers: [
      createTiandituVecLayer(),
      createTiandituCvaLayer(),
      createTiandiMap_img(),
      createTiandiMap_cia(),
      createTiandiMap_ter(),
      createTiandiMap_cta(),
      createGeoserverLayer(),
      createGeoserverCvaLayer(),
      createMeasurementLayer() // 添加测量图层
    ],
    view: new View({
      center: fromLonLat([116.397428, 39.90923]),
      zoom: 4,
      projection: 'EPSG:3857',
    }),
    controls: defaultControls().extend([
      zoomControl,
      rotateControl,
      scaleControl,
      mousePositionControl,
      overviewMapControl  // 将鹰眼控件添加到地图
    ]),
    interactions: defaultInteractions().extend([
      new DragPan({ constrainRotation: false }),
      new MouseWheelZoom(),
      new PinchZoom(),
      new KeyboardPan(),
      new KeyboardZoom()
    ])
  })

  // 监听视图变化更新比例尺
  map.getView().on('change:resolution', () => {
    const resolution = map.getView().getResolution()
    const units = map.getView().getProjection().getUnits()
    const dpi = 25.4 / 0.28
    const mpu = units === 'degrees' ? 111320 : 1
    currentScale.value = Math.round(resolution * mpu * dpi * 39.37)
  })

  // 添加尺寸变化监听
  map.on('change:size', () => {
    map.updateSize()
  })

  // 确保地图尺寸正确
  setTimeout(() => {
    map.updateSize()
  }, 100)
}

onMounted(() => {
  // 添加延迟确保样式应用
  setTimeout(initMap, 100)
})
</script>

<style scoped>
.map-container {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
}

.map-controls {
  position: absolute;
  top: 70px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 250px;
}

.control-group {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.control-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.control-group button {
  margin: 0 5px 5px 0;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
  font-weight: bold;
}

.control-group button:hover {
  background: #e9ecef;
}

.control-group button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.mouse-position {
  font-size: 12px;
  display: flex;
  flex-direction: column;
}

.mouse-position span {
  margin-bottom: 3px;
}

.scale-control {
  font-size: 12px;
  font-weight: bold;
  color: #333;
}

.layer-control h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.layer-control label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  cursor: pointer;
}

.opacity-control {
  margin-top: 8px;
  display: flex;
  align-items: center;
  font-size: 12px;
}

.opacity-control input {
  margin: 0 8px;
  width: 80px;
}

.measurement-control h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
}

.measurement-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.measurement-buttons button {
  flex: 1;
  min-width: 70px;
  font-size: 12px;
  padding: 6px 8px;
}

.measurement-result {
  font-size: 12px;
  font-weight: bold;
  color: #007bff;
  background: #f8f9fa;
  padding: 5px;
  border-radius: 4px;
  text-align: center;
}

:deep(.custom-mouse-position) {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #ccc;
}

/* 鹰眼地图样式 */
:deep(.ol-overviewmap) {
  bottom: 10px !important;
  left: auto !important;
  right: 10px !important;
  top: auto !important;
}

:deep(.ol-overviewmap .ol-overviewmap-map) {
  border: 1px solid #999;
  height: 150px;
  width: 200px;
}

:deep(.ol-overviewmap:not(.ol-collapsed)) {
  border: 2px solid #ccc;
  border-radius: 4px;
  background: white;
}

:deep(.ol-overviewmap .ol-overviewmap-box) {
  border: 2px solid rgba(0, 60, 136, 0.5);
}
</style>