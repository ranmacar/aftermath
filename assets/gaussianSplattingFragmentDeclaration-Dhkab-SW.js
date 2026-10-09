import{g as e}from"./ExtrasAsMetadata-CLQn5wqa.js";import"./fogFragment-BXlldRDA.js";const t="packingFunctions",o=`fn pack(depth: f32)->vec4f
{const bit_shift: vec4f= vec4f(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const bit_mask: vec4f= vec4f(0.0,1.0/255.0,1.0/255.0,1.0/255.0);var res: vec4f=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
fn unpack(color: vec4f)->f32
{const bit_shift: vec4f= vec4f(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;e.IncludesShadersStoreWGSL[t]||(e.IncludesShadersStoreWGSL[t]=o);const a={name:t,shader:o},f=Object.freeze(Object.defineProperty({__proto__:null,packingFunctionsWGSL:a},Symbol.toStringTag,{value:"Module"})),n="gaussianSplattingFragmentDeclaration",r=`fn gaussianColor(inColor: vec4f,inPosition: vec2f)->vec4f
{var A : f32=-dot(inPosition,inPosition);if (A>-4.0)
{var B: f32=exp(A)*inColor.a;
#include<logDepthFragment>
var color: vec3f=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4f(color,B);} else {return vec4f(0.0);}}
`;e.IncludesShadersStoreWGSL[n]||(e.IncludesShadersStoreWGSL[n]=r);const c={name:n,shader:r},l=Object.freeze(Object.defineProperty({__proto__:null,gaussianSplattingFragmentDeclarationWGSL:c},Symbol.toStringTag,{value:"Module"}));export{f as a,l as b,c as g,a as p};
