<template>
  <div class="controls-container">
    <div class="controls-group">
      <button class="control-btn" @click="activateDragBoxSelect">拉框选择</button>
      <button class="control-btn" @click="activateMeasure('distance')">测距</button>
      <button class="control-btn" @click="activateMeasure('area')">测面</button>
      <button class="control-btn clear-btn" @click="clearInteractionsAndFeatures">清除</button>
    </div>
  </div>
  <div id="map" class="map"></div>
</template>

<script setup>
/* eslint-disable */
import { onMounted, ref } from 'vue';
import { Map, View, Overlay } from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { fromLonLat, get as getProjection } from 'ol/proj';
import 'ol/ol.css';

// 导入所需的 OpenLayers 模块
import ScaleLine from 'ol/control/ScaleLine';
import { DragBox, Select, Draw } from 'ol/interaction';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Fill, Stroke, Style, Circle } from 'ol/style';
import { getArea, getLength } from 'ol/sphere';
import { LineString, Polygon } from 'ol/geom';
import { unByKey } from 'ol/Observable';
import GeoJSON from 'ol/format/GeoJSON';
import { platformModifierKeyOnly } from 'ol/events/condition';

// 定义响应式变量
const map = ref(null);
const activeInteraction = ref(null);
const measureSource = ref(null);
const measureTooltipElement = ref(null);
const measureTooltip = ref(null);
let measureListener = null;

// 示例的 GeoServer WMS/WFS 地址
const wmsUrl = 'http://localhost:8080/geoserver/shiyan1/wms';
const wfsUrl = 'http://localhost:8080/geoserver/shiyan1/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=shiyan1:cities&outputFormat=application/json';

onMounted(() => {
  // 定义 WMS 图层
  const ProvinceLayer = new TileLayer({
    source: new TileWMS({
      url: wmsUrl,
      params: { 'LAYERS': 'shiyan1:province', 'FORMAT': 'image/png' },
      serverType: 'geoserver',
      crossOrigin: 'anonymous',
    }),
  });

  const CityLayer = new TileLayer({
    source: new TileWMS({
      url: wmsUrl,
      params: { 'LAYERS': 'shiyan1:cities', 'FORMAT': 'image/png' },
      serverType: 'geoserver',
      crossOrigin: 'anonymous',
    }),
  });

  // 用于拉框选择的矢量图层
  const selectVectorSource = new VectorSource({
    url: wfsUrl,
    format: new GeoJSON(),
  });
  const selectVectorLayer = new VectorLayer({
    source: selectVectorSource,
    style: new Style({
      fill: new Fill({ color: 'rgba(255, 255, 255, 0.6)' }),
      stroke: new Stroke({ color: '#319FD3', width: 1 }),
    }),
  });

  // 用于测量的矢量图层
  measureSource.value = new VectorSource();
  const measureLayer = new VectorLayer({
    source: measureSource.value,
    style: new Style({
      fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
      stroke: new Stroke({ color: '#ffcc33', width: 2 }),
      image: new Circle({ radius: 7, fill: new Fill({ color: '#ffcc33' }) }),
    }),
  });

  // 初始化地图
  map.value = new Map({
    target: 'map',
    layers: [ProvinceLayer, CityLayer, selectVectorLayer, measureLayer],
    view: new View({
      center: fromLonLat([116.397428, 39.90923]),
      zoom: 4,
      projection: 'EPSG:3857',
    }),
    // 添加比例尺控件
    controls: [new ScaleLine()],
  });

  // 默认激活拉框选择功能
  activateDragBoxSelect();
});

// --- 拉框选择功能 ---
function activateDragBoxSelect() {
  if (activeInteraction.value) {
    map.value.removeInteraction(activeInteraction.value);
  }

  const dragBox = new DragBox({
    condition: platformModifierKeyOnly,
  });
  map.value.addInteraction(dragBox);
  activeInteraction.value = dragBox;

  const select = new Select();
  map.value.addInteraction(select);

  dragBox.on('boxend', () => {
    select.getFeatures().clear();
    const extent = dragBox.getGeometry().getExtent();
    
    const selectVectorSource = map.value.getLayers().getArray().find(l => l.getSource() instanceof VectorSource).getSource();

    selectVectorSource.forEachFeatureIntersectingExtent(extent, (feature) => {
      select.getFeatures().push(feature);
    });
  });

  map.value.on('click', () => {
    if (select.getFeatures().getLength() > 0) {
      select.getFeatures().clear();
    }
  });
}

// --- 距离和面积测量功能 ---
function createMeasureTooltip() {
  if (measureTooltipElement.value) {
    measureTooltipElement.value.parentNode.removeChild(measureTooltipElement.value);
  }
  measureTooltipElement.value = document.createElement('div');
  measureTooltipElement.value.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip.value = new Overlay({
    element: measureTooltipElement.value,
    offset: [0, -15],
    positioning: 'bottom-center',
  });
  map.value.addOverlay(measureTooltip.value);
}

function formatLength(line) {
  const length = getLength(line, { projection: getProjection('EPSG:3857') });
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' km';
  } else {
    output = Math.round(length * 100) / 100 + ' m';
  }
  return output;
}

function formatArea(polygon) {
  const area = getArea(polygon, { projection: getProjection('EPSG:3857') });
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' km²';
  } else {
    output = Math.round(area * 100) / 100 + ' m²';
  }
  return output;
}

function activateMeasure(type) {
  if (activeInteraction.value) {
    map.value.removeInteraction(activeInteraction.value);
    if (measureListener) unByKey(measureListener);
  }

  const geometryType = type === 'distance' ? 'LineString' : 'Polygon';
  const draw = new Draw({
    source: measureSource.value,
    type: geometryType,
    style: new Style({
      fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
      stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 2 }),
      image: new Circle({ radius: 5, stroke: new Stroke({ color: 'rgba(0, 0, 0, 0.7)' }), fill: new Fill({ color: 'rgba(255, 255, 255, 0.2)' }) })
    })
  });
  map.value.addInteraction(draw);
  activeInteraction.value = draw;

  createMeasureTooltip();

  draw.on('drawstart', (evt) => {
    let sketch = evt.feature;
    let tooltipCoord = evt.coordinate;
    measureListener = sketch.getGeometry().on('change', (e) => {
      const geom = e.target;
      let output;
      if (geom instanceof Polygon) {
        output = formatArea(geom);
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof LineString) {
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
      }
      measureTooltipElement.value.innerHTML = output;
      measureTooltip.value.setPosition(tooltipCoord);
    });
  });

  draw.on('drawend', () => {
    measureTooltipElement.value.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.value.setOffset([0, -7]);
    measureTooltipElement.value = null;
    createMeasureTooltip();
    unByKey(measureListener);
  });
}

function clearInteractionsAndFeatures() {
  if (activeInteraction.value) {
    map.value.removeInteraction(activeInteraction.value);
    if (measureListener) unByKey(measureListener);
  }
  measureSource.value.clear();

  const selectInteraction = map.value.getInteractions().getArray().find(
    (interaction) => interaction instanceof Select
  );
  if (selectInteraction) {
    selectInteraction.getFeatures().clear();
  }

  activateDragBoxSelect();
}
</script>

<style scoped>
#map {
  width: 100%;
  height: 100vh;
}

/* UI 容器样式 */
.controls-container {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.controls-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 按钮样式 */
.control-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  color: #fff;
  background-color: #319FD3;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background-color: #2a81aa;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.clear-btn {
  background-color: #e74c3c;
}

.clear-btn:hover {
  background-color: #c0392b;
}

/* OpenLayers 控件和提示框样式 */
.ol-tooltip {
  position: relative;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  color: #fff;
  padding: 8px 12px;
  white-space: nowrap;
  font-size: 14px;
  cursor: default;
  user-select: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.ol-tooltip-measure {
  opacity: 1;
  font-weight: bold;
}

.ol-tooltip-static {
  background-color: #3498db;
  color: white;
  border: 1px solid #fff;
}

/* === 关键修复: 比例尺样式 === */
:deep(.ol-scale-line) {
  background-color: rgba(0, 0, 0, 0.6) !important;
  color: #fff !important;
  padding: 5px 8px !important;
  border-radius: 5px !important;
  bottom: 10px !important;
  left: 10px !important;
}

:deep(.ol-scale-line-inner) {
  border-color: #fff !important;
}
</style>