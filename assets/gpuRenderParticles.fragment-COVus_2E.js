import{g as e}from"./ExtrasAsMetadata-CLQn5wqa.js";import{c as l,f as n,a as t,l as i,b as s}from"./fogFragment-BXlldRDA.js";import{i as c,e as f}from"./default.fragment-BQfXQjWA.js";import{logDepthDeclarationWGSL as m}from"./logDepthDeclaration-Cy4oSoZm.js";import{helperFunctionsWGSL as p}from"./helperFunctions-DEK8aGEf.js";import"./sceneUboDeclaration-CA8CIhDZ.js";import"./defaultUboDeclaration-oYn_dExG.js";const r="gpuRenderParticlesPixelShader",o=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
#include<clipPlaneFragmentDeclaration>
#include<imageProcessingDeclaration>
#include<logDepthDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#include<fogFragmentDeclaration>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#include<clipPlaneFragment>
let textureColor: vec4f=textureSample(diffuseSampler,diffuseSamplerSampler,input.vUV);var baseColor: vec4f=textureColor*input.vColor;
#ifdef BLENDMULTIPLYMODE
let alpha: f32=input.vColor.a*textureColor.a;baseColor=vec4f(baseColor.rgb*alpha+vec3f(1.0)*(1.0-alpha),baseColor.a);
#endif
#include<logDepthFragment>
#include<fogFragment>(color,baseColor)
#ifdef IMAGEPROCESSINGPOSTPROCESS
baseColor=vec4f(toLinearSpaceVec3(baseColor.rgb),baseColor.a);
#else
#ifdef IMAGEPROCESSING
baseColor=vec4f(toLinearSpaceVec3(baseColor.rgb),baseColor.a);baseColor=applyImageProcessing(baseColor);
#endif
#endif
fragmentOutputs.color=baseColor;}
`;e.ShadersStoreWGSL[r]||(e.ShadersStoreWGSL[r]=o);const S=[l,c,m,p,f,n,t,i,s];for(const a of S)e.IncludesShadersStoreWGSL[a.name]||(e.IncludesShadersStoreWGSL[a.name]=a.shader);const v={name:r,shader:o};export{v as gpuRenderParticlesPixelShaderWGSL};
