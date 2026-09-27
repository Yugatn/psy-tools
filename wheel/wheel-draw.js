/* Shared Canvas renderer for Wheel of Balance pages. */
(function(){
  const cache = new WeakMap();
  function roundRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }
  function point(cx,cy,radius,a,value){
    const v=Math.max(0,Math.min(10,Number(value)||0));
    const rr=radius*v/10;
    return {x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr};
  }
  function ensure(canvas,stage){
    const css=Math.max(1,Math.min(760,Math.floor(stage?stage.clientWidth:760)));
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const bw=Math.round(css*dpr);
    if(canvas.width!==bw||canvas.height!==bw||canvas.style.width!==css+"px"){
      canvas.width=bw;canvas.height=bw;canvas.style.width=css+"px";canvas.style.height=css+"px";
    }
    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,css,dpr};
  }
  function getGrid(canvas,css,dpr,n,cx,cy,radius){
    let c=cache.get(canvas); const key=css+"|"+dpr+"|"+n+"|"+radius;
    if(c&&c.key===key)return c.canvas;
    const g=document.createElement("canvas");g.width=Math.round(css*dpr);g.height=Math.round(css*dpr);
    const x=g.getContext("2d",{alpha:false});x.setTransform(dpr,0,0,dpr,0,0);
    x.fillStyle="#111a2e";x.fillRect(0,0,css,css);
    const step=Math.PI*2/n;
    for(let r=1;r<=10;r++){x.beginPath();x.arc(cx,cy,radius*r/10,0,Math.PI*2);x.strokeStyle=r===10?"rgba(255,255,255,.24)":"rgba(255,255,255,.085)";x.lineWidth=(r===5||r===10)?2:1;x.stroke();}
    x.font="bold 11px Arial";x.textAlign="center";x.textBaseline="middle";
    for(let r=1;r<=10;r++){x.fillStyle="rgba(190,205,225,.60)";x.fillText(String(r),cx+16,cy-radius*r/10);}
    for(let i=0;i<n;i++){const a=i*step-Math.PI/2;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius);x.strokeStyle="rgba(255,255,255,.13)";x.lineWidth=1;x.stroke();}
    cache.set(canvas,{key,canvas:g});return g;
  }
  window.WheelCanvas={version:"2.0.0",draw:function(canvas,vals,imps,categories){
    if(!canvas||!Array.isArray(categories)||!categories.length)return [];
    const stage=document.getElementById("wheelStage"), z=ensure(canvas,stage), ctx=z.ctx,size=z.css,dpr=z.dpr;
    const cx=size/2,cy=size/2,radius=size/2-Math.min(105,size*.138),n=categories.length,step=Math.PI*2/n;
    ctx.clearRect(0,0,size,size);ctx.drawImage(getGrid(canvas,size,dpr,n,cx,cy,radius),0,0,size*dpr,size*dpr,0,0,size,size);
    const hits=[], current=[];
    for(let i=0;i<n;i++)current.push(point(cx,cy,radius,i*step-Math.PI/2,vals[i]));
    ctx.beginPath();current.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle="rgba(110,168,254,.27)";ctx.fill();ctx.strokeStyle="#6ea8fe";ctx.lineWidth=5;ctx.lineJoin="round";ctx.stroke();
    const targets={};
    const hasTargets=categories.some((_,i)=>imps&&imps[i]&&typeof imps[i].target==="number"&&imps[i].target!==vals[i]);
    if(hasTargets){
      const all=[];
      for(let i=0;i<n;i++)all.push(point(cx,cy,radius,i*step-Math.PI/2,imps&&imps[i]&&typeof imps[i].target==="number"?imps[i].target:vals[i]));
      ctx.beginPath();all.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.strokeStyle="rgba(194,140,255,.55)";ctx.lineWidth=2.5;ctx.setLineDash([7,6]);ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<n;i++)if(imps&&imps[i]&&typeof imps[i].target==="number"&&imps[i].target!==vals[i]){
        targets[i]=all[i];ctx.beginPath();ctx.moveTo(current[i].x,current[i].y);ctx.lineTo(all[i].x,all[i].y);ctx.strokeStyle="rgba(194,140,255,.85)";ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.arc(all[i].x,all[i].y,15,0,Math.PI*2);ctx.fillStyle="rgba(194,140,255,.30)";ctx.fill();ctx.strokeStyle="#c28cff";ctx.lineWidth=3;ctx.stroke();
      }
    }
    for(let i=0;i<n;i++){
      const a=i*step-Math.PI/2,p=current[i];ctx.beginPath();ctx.arc(p.x,p.y,11,0,Math.PI*2);ctx.fillStyle="#6ea8fe";ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
      const vt=String(vals[i]),lx=p.x+Math.cos(a)*30,ly=p.y+Math.sin(a)*30;ctx.font="bold 16px Arial";const tw=ctx.measureText(vt).width,bw=tw+14,bh=25;ctx.fillStyle="rgba(11,17,32,.94)";roundRect(ctx,lx-bw/2,ly-bh/2,bw,bh,7);ctx.fill();ctx.strokeStyle=targets[i]?"#c28cff":"#6ea8fe";ctx.lineWidth=targets[i]?2:1.5;ctx.stroke();ctx.fillStyle="#fff";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(vt,lx,ly);hits.push({idx:i,type:"current",x:p.x,y:p.y,r:55});
    }
    Object.keys(targets).forEach(k=>{const i=Number(k),a=i*step-Math.PI/2,tp=targets[i],tt=String(imps[i].target);ctx.font="bold 13px Arial";const tw=ctx.measureText(tt).width,bw=tw+12,bh=22,lx=tp.x+Math.cos(a)*32,ly=tp.y+Math.sin(a)*32;ctx.fillStyle="rgba(26,12,42,.96)";roundRect(ctx,lx-bw/2,ly-bh/2,bw,bh,6);ctx.fill();ctx.strokeStyle="#c28cff";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#e4ccff";ctx.fillText(tt,lx,ly);hits.push({idx:i,type:"target",x:tp.x,y:tp.y,r:55},{idx:i,type:"target",x:lx,y:ly,r:30});});
    ctx.beginPath();ctx.arc(cx,cy,27,0,Math.PI*2);ctx.fillStyle="#0b1120";ctx.fill();ctx.strokeStyle="rgba(255,255,255,.25)";ctx.lineWidth=2;ctx.stroke();ctx.font="bold 12px Arial";ctx.fillStyle="#9da9bb";ctx.fillText("0",cx,cy);
    ctx.font="bold 14px Arial";ctx.fillStyle="#fff";
    for(let i=0;i<n;i++){const a=i*step-Math.PI/2+step/2,lr=radius+45,x=cx+Math.cos(a)*lr,y=cy+Math.sin(a)*lr,words=String(categories[i]).split(" "),lines=words.length<=2?[categories[i]]:[words.slice(0,Math.ceil(words.length/2)).join(" "),words.slice(Math.ceil(words.length/2)).join(" ")];lines.forEach((line,li)=>ctx.fillText(line,x,y+(li-(lines.length-1)/2)*17));}
    return hits;
  }};
})();