<script setup>
import { onMounted } from 'vue'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import 'ol/ol.css'
import TileWMS from 'ol/source/TileWMS'
import { fromLonLat } from 'ol/proj'

// 天地图矢量图层URL
const tiandituVecUrl = 'http://t0.tianditu.gov.cn/vec_w/wmts?tk=806184186f4a0c4f3ef1f1f6c65d9c2c&layer=vec&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}'
// 天地图注记图层URL
const tiandituCvaUrl = 'http://t0.tianditu.gov.cn/cva_w/wmts?tk=806184186f4a0c4f3ef1f1f6c65d9c2c&layer=cva&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}'


onMounted(() => {
  // 创建矢量图层
  const tiandituVecLayer = new TileLayer({
    source: new XYZ({
      url: tiandituVecUrl,
      tileSize: 256,
      crossOrigin: 'anonymous', 
    }),
  })

  //中国地图
  const chinaVecLayer = new TileLayer({
  source: new TileWMS({
    url:'http://localhost:8080/geoserver/test/wms',
    params:{
      'LAYERS':'test:省级行政区',
      'TILED':true,
      'FORMAT':'image/png',
    },
    serverType: 'geoserver',
    crossOrigin: 'anonymous',
  }),
})
  // 创建注记图层
  const tiandituCvaLayer = new TileLayer({
    source: new XYZ({
      url: tiandituCvaUrl,
      tileSize: 256,
      crossOrigin: 'anonymous',
    }),
  })

  // 创建地图
  new Map({
    target: 'map',
    layers: [tiandituVecLayer, chinaVecLayer,tiandituCvaLayer],
    view: new View({
      center: fromLonLat([116.397428, 39.90923]),
      zoom: 4,
      projection: 'EPSG:3857',
    }),
  })
})
</script>

<template>
  <div id="map" class="map"></div>
</template>

<style scoped>
#map {
  width: 100%;
  height: 100vh;
}
</style>