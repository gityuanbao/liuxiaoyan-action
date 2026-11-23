// Author-preview iframes may not inherit the phone UA or pointer capability.
// Recompute the compact viewport fallback on every resize so it is not sticky.
export function isMobileLayout(width,height,deviceHint=false,deviceType='unknown'){
 return Boolean(deviceHint||deviceType==='phone'||deviceType==='tablet'||(width<1100&&height<600));
}

// A landscape game viewport even inside a portrait author-preview iframe.
export function stageMetrics(width,height,dpr=1,mobile=false,memoryGB=0){
 const w=Math.max(1,width),h=Math.max(1,height);
 const widePhone=mobile&&w/h>=16/9;
 const landscapeWidth=widePhone?w:Math.min(w,h*16/9),landscapeHeight=widePhone?h:landscapeWidth*9/16;
 const compact=mobile&&memoryGB>0&&memoryGB<=3;
 const highDensity=mobile&&dpr>2&&(memoryGB===0||memoryGB>=6);
 const maxWidth=compact?1280:highDensity?2560:1920;
 const maxHeight=compact?720:highDensity?1440:1080;
 const scale=Math.min(Math.max(1,dpr),compact?1.5:highDensity?3:2,maxWidth/landscapeWidth,maxHeight/landscapeHeight);
 return {width:landscapeWidth,height:landscapeHeight,pixelWidth:Math.max(1,Math.round(landscapeWidth*scale)),pixelHeight:Math.max(1,Math.round(landscapeHeight*scale))};
}
