import{aT as e}from"./index-ByxBSQZw.js";import{H as r,I as d}from"./index-1vuGljV0.js";import"./mesh.vertexData.functions-BXkNVxNr.js";const a="selectionPixelShader",n=`#ifdef INSTANCES
flat varying float vSelectionId;
#else
uniform float selectionId;
#endif
#ifdef STORE_CAMERASPACE_Z
varying float vViewPosZ;
#else
varying float vDepthMetric;
#endif
#ifdef ALPHATEST
varying vec2 vUV;uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (texture2D(diffuseSampler,vUV).a<0.4)
discard;
#endif
#ifdef INSTANCES
float id=vSelectionId;
#else
float id=selectionId;
#endif
#ifdef STORE_CAMERASPACE_Z
gl_FragColor=vec4(id,vViewPosZ,0.0,1.0);
#else
gl_FragColor=vec4(id,vDepthMetric,0.0,1.0);
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;e.ShadersStore[a]||(e.ShadersStore[a]=n);const o=[r,d];for(const i of o)e.IncludesShadersStore[i.name]||(e.IncludesShadersStore[i.name]=i.shader);const s={name:a,shader:n};export{s as selectionPixelShader};
