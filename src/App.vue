<template>
  <!-- <div id="app">
    <OpenLayers />
  </div> -->
  <div>
    <nav>
      <router-link to="/ShowLayers">图层选择</router-link> |
      <router-link to="/OpenLayers">天地图</router-link> |
      <!-- <router-link to="/ShiyanMap">实验课</router-link> | -->
      <router-link to="/GeoServer">GeoServer</router-link>
    </nav>
    <router-view></router-view>
  </div>
</template>

<script>
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
