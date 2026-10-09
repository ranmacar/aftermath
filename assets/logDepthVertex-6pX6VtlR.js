import{g as e}from"./ExtrasAsMetadata-CLQn5wqa.js";const n="clipPlaneVertexDeclaration",l=`#ifdef CLIPPLANE
uniform vec4 vClipPlane;varying float fClipDistance;
#endif
#ifdef CLIPPLANE2
uniform vec4 vClipPlane2;varying float fClipDistance2;
#endif
#ifdef CLIPPLANE3
uniform vec4 vClipPlane3;varying float fClipDistance3;
#endif
#ifdef CLIPPLANE4
uniform vec4 vClipPlane4;varying float fClipDistance4;
#endif
#ifdef CLIPPLANE5
uniform vec4 vClipPlane5;varying float fClipDistance5;
#endif
#ifdef CLIPPLANE6
uniform vec4 vClipPlane6;varying float fClipDistance6;
#endif
`;e.IncludesShadersStore[n]||(e.IncludesShadersStore[n]=l);const c={name:n,shader:l},C=Object.freeze(Object.defineProperty({__proto__:null,clipPlaneVertexDeclaration:c},Symbol.toStringTag,{value:"Module"})),i="clipPlaneVertex",f=`#ifdef CLIPPLANE
fClipDistance=dot(worldPos,vClipPlane);
#endif
#ifdef CLIPPLANE2
fClipDistance2=dot(worldPos,vClipPlane2);
#endif
#ifdef CLIPPLANE3
fClipDistance3=dot(worldPos,vClipPlane3);
#endif
#ifdef CLIPPLANE4
fClipDistance4=dot(worldPos,vClipPlane4);
#endif
#ifdef CLIPPLANE5
fClipDistance5=dot(worldPos,vClipPlane5);
#endif
#ifdef CLIPPLANE6
fClipDistance6=dot(worldPos,vClipPlane6);
#endif
`;e.IncludesShadersStore[i]||(e.IncludesShadersStore[i]=f);const P={name:i,shader:f},v=Object.freeze(Object.defineProperty({__proto__:null,clipPlaneVertex:P},Symbol.toStringTag,{value:"Module"})),a="fogVertexDeclaration",r=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;e.IncludesShadersStore[a]||(e.IncludesShadersStore[a]=r);const g={name:a,shader:r},t="fogVertex",d=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;e.IncludesShadersStore[t]||(e.IncludesShadersStore[t]=d);const h={name:t,shader:d},o="logDepthVertex",s=`#ifdef LOGARITHMICDEPTH
vFragmentDepth=1.0+gl_Position.w;gl_Position.z=log2(max(0.000001,vFragmentDepth))*logarithmicDepthConstant;
#endif
`;e.IncludesShadersStore[o]||(e.IncludesShadersStore[o]=s);const S={name:o,shader:s};export{P as a,h as b,c,C as d,v as e,g as f,S as l};
