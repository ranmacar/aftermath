import{g as e}from"./ExtrasAsMetadata-CLQn5wqa.js";import"./fogFragment-BiuBXjoi.js";const t="packingFunctions",n=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;e.IncludesShadersStore[t]||(e.IncludesShadersStore[t]=n);const r={name:t,shader:n},l=Object.freeze(Object.defineProperty({__proto__:null,packingFunctions:r},Symbol.toStringTag,{value:"Module"})),o="gaussianSplattingFragmentDeclaration",a=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`;e.IncludesShadersStore[o]||(e.IncludesShadersStore[o]=a);const c={name:o,shader:a},d=Object.freeze(Object.defineProperty({__proto__:null,gaussianSplattingFragmentDeclaration:c},Symbol.toStringTag,{value:"Module"}));export{l as a,d as b,c as g,r as p};
