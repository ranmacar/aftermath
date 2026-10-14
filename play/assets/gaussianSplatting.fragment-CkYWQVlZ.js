import{g as a}from"./ExtrasAsMetadata-B5hAz533.js";import{c as o,f as r,l,b as t,a as g}from"./fogFragment-BHX2SWY3.js";import{logDepthDeclaration as c}from"./logDepthDeclaration-BgsurjcX.js";import{p as s,g as d}from"./gaussianSplattingFragmentDeclaration-DWTRjYJL.js";const n="gaussianSplattingPixelShader",i=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_DEPTH
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vec4 vColor;varying vec2 vPosition;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
void main () {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 finalColor=gaussianColor(vColor);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
glFragData[0]=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;a.ShadersStore[n]||(a.ShadersStore[n]=i);const f=[o,c,r,s,l,t,d,g];for(const e of f)a.IncludesShadersStore[e.name]||(a.IncludesShadersStore[e.name]=e.shader);const P={name:n,shader:i};export{P as gaussianSplattingPixelShader};
