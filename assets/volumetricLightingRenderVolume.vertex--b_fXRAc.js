import{aT as e}from"./index-ByxBSQZw.js";import{a as s,b as i,c as n,d as a}from"./index-1vuGljV0.js";import"./mesh.vertexData.functions-BXkNVxNr.js";const r="volumetricLightingRenderVolumeVertexShader",t=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;e.ShadersStore[r]||(e.ShadersStore[r]=t);const c=[s,i,n,a];for(const o of c)e.IncludesShadersStore[o.name]||(e.IncludesShadersStore[o.name]=o.shader);const h={name:r,shader:t};export{h as volumetricLightingRenderVolumeVertexShader};
