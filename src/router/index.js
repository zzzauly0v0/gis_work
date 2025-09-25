import { createRouter, createWebHistory } from 'vue-router'
import OpenLayers from '../components/OpenLayers.vue'
import ShowLayers from '../components/ShowLayers.vue'
import ShiyanMap from '../components/ShiyanMap.vue'
import GeoServer from '../components/GeoServer.vue'

const routes = [
    {
        path: '/ShowLayers',
        name:'ShowLayers',
        component: ShowLayers
    },
    {
        path:'/OpenLayers',
        name:'OpenLayers',
        component: OpenLayers
    },
    {
        path:'/ShiyanMap',
        name:'ShiyanMap',
        component: ShiyanMap
    },
    {
        path:'/GeoServer',
        name:'GeoServer',
        component:GeoServer
    },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router