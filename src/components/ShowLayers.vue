<script setup>
import { onMounted } from 'vue'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile';
// import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
// import {fromLonLat} from 'ol/proj';
// import {defaults as defaultControls} from "ol/control";
import MousePosition from "ol/control/MousePosition";
import {createStringXY} from "ol/coordinate";

onMounted(() => {
  //map中的图层数组
  const layer = [];
//图层名称数组
  const layerName = [];
//图层可见属性数组
  const layerVisibility = [];

  /**
   * 加载图层列表数据
   * @param {ol.Map} map 地图对象
   * @param {string} id 图层列表容器ID
   */
  function loadLayersControl(map, id) {
    //图层目录容器
    const treeContent = document.getElementById(id);
    //获取地图中所有图层
    const layers = map.getLayers();
    for (let i = 0; i < layers.getLength() ; i++) {
      //获取每个图层的名称、是否可见属性
      layer[i] = layers.item(i);
      layerName[i] = layer[i].get('name');
      layerVisibility[i] = layer[i].getVisible();
      //新增li元素，用来承载图层项
      const elementLi = document.createElement('li');
      // 添加子节点
      treeContent.appendChild(elementLi);
      //创建复选框元素
      const elementInput = document.createElement('input');
      elementInput.type = "checkbox";
      elementInput.name = "layers";
      elementLi.appendChild(elementInput);
      //创建label元素
      const elementLable = document.createElement('label');
      elementLable.className = "layer";
      //设置图层名称
      setInnerText(elementLable, layerName[i]);
      elementLi.appendChild(elementLable);
      //设置图层默认显示状态
      if (layerVisibility[i]) {
        elementInput.checked = true;
      }
      //为checkbox添加变更事件
      addChangeEvent(elementInput, layer[i]);
    }
  }

  function addChangeEvent(element, layer) {
    element.onclick = function () {
      if (element.checked) {
        //显示图层
        layer.setVisible(true);
      }
      else {
        //不显示图层
        layer.setVisible(false);
      }
    };
  }
  /**
   * 动态设置元素文本内容（兼容）
   */
  function setInnerText(element, text) {
    if (typeof element.textContent == "string") {
      element.textContent = text;
    } else {
      element.innerText = text;
    }
  }

const TiandiMap_vec = new TileLayer({
  name: "天地图矢量图层",
  source: new XYZ({
    url: "http://t0.tianditu.com/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c",
    wrapX: false
  })
});
const TiandiMap_cva = new TileLayer({
  name: "天地图矢量注记图层",
  source: new XYZ({
    url: "http://t0.tianditu.com/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c",
    wrapX: false
  })
});
const TiandiMap_img = new TileLayer({
  name: "天地图影像图层",
  source: new XYZ({
    url: "http://t0.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c",
    wrapX: false
  })
});
const TiandiMap_cia = new TileLayer({
  name: "天地图影像注记图层",
  source: new XYZ({
    url: "http://t0.tianditu.com/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c",
    wrapX: false
  })
});
const TiandiMap_ter = new TileLayer({
  name:'天地图地形晕渲图层',
  source: new XYZ({
    url:"http://t0.tianditu.com/DataServer?T=ter_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c"
  })
});
const TiandiMap_cta = new TileLayer({
  name:'天地图地形标注图层',
  source: new XYZ({
    url:"http://t0.tianditu.com/DataServer?T=cta_w&x={x}&y={y}&l={z}&tk=806184186f4a0c4f3ef1f1f6c65d9c2c"
  })
});

  const mousePositionControl = new MousePosition({
    //坐标格式
    coordinateFormat: createStringXY(5),
    //地图投影坐标系（若未设置则输出为默认投影坐标系下的坐标）
    projection: "EPSG:4326",
    //坐标信息显示样式类名，默认是'ol-mouse-position'
    className: "custom-mouse-position",
    //显示鼠标位置信息的目标容器
    target: document.getElementById("mouse-position"),
    //未定义坐标的标记
    undefinedHTML: "&nbsp;"
  });

//实例化Map对象加载地图
const map = new Map({
  //地图容器div的ID
  target: 'map',
  //地图容器中加载的图层
  layers: [TiandiMap_vec, TiandiMap_cva, TiandiMap_img, TiandiMap_cia, TiandiMap_ter, TiandiMap_cta],
  //地图视图设置
  view: new View({
    //地图初始中心点
    center: [0, 0],
    //地图初始显示级别
    zoom: 2
  })
})
  map.addControl(mousePositionControl);
//加载图层列表数据
  loadLayersControl(map, "layerTree");
})
</script>

<template>
  <div id="map" class="map">
    <div id="mouse-position"></div>
    <div id="layerControl" class="layerControl">
      <div class="title"><label>图层列表</label></div>
      <ul id="layerTree" class="layerTree"></ul>
    </div>
  </div>
</template>

<style scoped>
#map {
  width: 100%;
  height: 100vh;
}
.layerControl {
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 200px;
  max-height: 200px;
  z-index: 201;
  color: #ffffff;
  background-color: #4c4e5a;
  border-radius: 10px;
  padding: 10px;
}
.title {
  font-weight: bold;
  font-size: 15px;
  margin-bottom: 10px;
}
.layerTree {
  list-style: none;
  padding: 0;
  margin: 0;
}
.layer-tree li {
  margin: 5px 0;
}
/* 鼠标位置控件层样式设置 */
#mouse-position {
  float: left;
  position: absolute;
  bottom: 10px;
  width: 330px;
  height: 20px;
  /*在地图容器中的层，要设置z-index的值让其显示在地图上层*/
  z-index: 100;
}
</style>