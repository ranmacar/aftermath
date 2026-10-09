import{g as a}from"./ExtrasAsMetadata-CLQn5wqa.js";import{c as i,f as r,l as o,b as s,a as l}from"./fogFragment-BXlldRDA.js";import{logDepthDeclarationWGSL as f}from"./logDepthDeclaration-Cy4oSoZm.js";import{p as g,g as c}from"./gaussianSplattingFragmentDeclaration-Dhkab-SW.js";const e="gaussianSplattingPixelShader",t=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vColor: vec4f;varying vPosition: vec2f;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var finalColor: vec4f=gaussianColor(input.vColor,input.vPosition);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
fragmentOutputs.fragData0=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
fragmentOutputs.fragData1=pack(fragmentInputs.position.z);
#else
fragmentOutputs.fragData1=vec4f(fragmentInputs.position.z,0.0,0.0,1.0);
#endif
#else
fragmentOutputs.color=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;a.ShadersStoreWGSL[e]||(a.ShadersStoreWGSL[e]=t);const S=[i,f,r,g,o,s,c,l];for(const n of S)a.IncludesShadersStoreWGSL[n.name]||(a.IncludesShadersStoreWGSL[n.name]=n.shader);const G={name:e,shader:t};export{G as gaussianSplattingPixelShaderWGSL};
