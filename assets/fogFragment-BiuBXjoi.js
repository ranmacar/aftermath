import{g as e}from"./ExtrasAsMetadata-CLQn5wqa.js";const f="clipPlaneFragmentDeclaration",t=`#ifdef CLIPPLANE
varying float fClipDistance;
#endif
#ifdef CLIPPLANE2
varying float fClipDistance2;
#endif
#ifdef CLIPPLANE3
varying float fClipDistance3;
#endif
#ifdef CLIPPLANE4
varying float fClipDistance4;
#endif
#ifdef CLIPPLANE5
varying float fClipDistance5;
#endif
#ifdef CLIPPLANE6
varying float fClipDistance6;
#endif
`;e.IncludesShadersStore[f]||(e.IncludesShadersStore[f]=t);const c={name:f,shader:t},C=Object.freeze(Object.defineProperty({__proto__:null,clipPlaneFragmentDeclaration:c},Symbol.toStringTag,{value:"Module"})),n="clipPlaneFragment",d=`#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
if (false) {}
#endif
#ifdef CLIPPLANE
else if (fClipDistance>0.0)
{discard;}
#endif
#ifdef CLIPPLANE2
else if (fClipDistance2>0.0)
{discard;}
#endif
#ifdef CLIPPLANE3
else if (fClipDistance3>0.0)
{discard;}
#endif
#ifdef CLIPPLANE4
else if (fClipDistance4>0.0)
{discard;}
#endif
#ifdef CLIPPLANE5
else if (fClipDistance5>0.0)
{discard;}
#endif
#ifdef CLIPPLANE6
else if (fClipDistance6>0.0)
{discard;}
#endif
`;e.IncludesShadersStore[n]||(e.IncludesShadersStore[n]=d);const g={name:n,shader:d},E=Object.freeze(Object.defineProperty({__proto__:null,clipPlaneFragment:g},Symbol.toStringTag,{value:"Module"})),o="fogFragmentDeclaration",s=`#ifdef FOG
#define FOGMODE_NONE 0.
#define FOGMODE_EXP 1.
#define FOGMODE_EXP2 2.
#define FOGMODE_LINEAR 3.
#define E 2.71828
uniform vec4 vFogInfos;uniform vec3 vFogColor;varying vec3 vFogDistance;float CalcFogFactor()
{float fogCoeff=1.0;float fogStart=vFogInfos.y;float fogEnd=vFogInfos.z;float fogDensity=vFogInfos.w;float fogDistance=length(vFogDistance);if (FOGMODE_LINEAR==vFogInfos.x)
{fogCoeff=(fogEnd-fogDistance)/(fogEnd-fogStart);}
else if (FOGMODE_EXP==vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDensity);}
else if (FOGMODE_EXP2==vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDistance*fogDensity*fogDensity);}
return clamp(fogCoeff,0.0,1.0);}
#endif
`;e.IncludesShadersStore[o]||(e.IncludesShadersStore[o]=s);const P={name:o,shader:s},L=Object.freeze(Object.defineProperty({__proto__:null,fogFragmentDeclaration:P},Symbol.toStringTag,{value:"Module"})),a="logDepthFragment",r=`#ifdef LOGARITHMICDEPTH
gl_FragDepthEXT=log2(vFragmentDepth)*logarithmicDepthConstant*0.5;
#endif
`;e.IncludesShadersStore[a]||(e.IncludesShadersStore[a]=r);const F={name:a,shader:r},i="fogFragment",l=`#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;e.IncludesShadersStore[i]||(e.IncludesShadersStore[i]=l);const I={name:i,shader:l};export{g as a,I as b,c,C as d,E as e,P as f,L as g,F as l};
