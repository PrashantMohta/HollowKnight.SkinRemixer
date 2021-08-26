const BLANK_KNIGHT = "./assets/blank_knight.png";
const DEFAULT_KNIGHT = "./assets/default_knight.png";
const SLASH_MASK = "./assets/slash_mask.png";
const CLOAK_MASK_GENERIC = "./assets/cloak_mask_generic.png";
const CLOAK_MASK_DEFAULT = "./assets/cloak_mask_default.png";
const EYE_WHITE = "./assets/eye_white.png"; 
const EYE_DEFAULT =  "./assets/eye.png";
const EYE = "eye";
const HAT = "hat";
const BASE = 'base';
const SLASH = 'slash';

function loadImage(url){
    return new Promise(function(resolve,reject){
        var img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    })
}

function populateImageMap(files,progress){
    if(typeof progress == "function"){
        progress("loading Images",0)
    }
    return new Promise(function(resolve,reject){
        let images = {};
        let loading = 0;
        let loaded = 0;
        files.forEach(file => {
            loading +=1 ;
            loadImage(file).then( img => {
                loaded +=1 ;
                images[file] = img;
                if(typeof progress == "function"){
                    progress("loading Images",Math.round((100 * loaded)/files.length))
                }
                loading -=1 ;
                if(loading === 0){
                    return resolve(images);
                }
            }).catch(console.error);
        })
    });
}

function loadFileAsImage(img){
    return function (){
        const reader = new FileReader();
        reader.onload = (e) => { 
            img.src = e.target.result;
        };
        reader.readAsDataURL(this.files[0]);
    }
}

function bindInputToImg(input,img){
    input.addEventListener("change", loadFileAsImage(img), false);
}

function transferImageToWorker(name,bmp){
    worker.postMessage({ event : 'image', name : name , image: bmp },   [bmp] );
}

function transferDataToWorker(data){
    worker.postMessage({ event : 'data', data : data });
}


function rafRender(fn,framerate){
    let last = 0;
    (function renderFrame(){
        let now = Date.now();
        if(now - last > 1000/framerate){
            fn();
            last = now;
        }
        requestAnimationFrame( ()=>{ renderFrame()})
    })();
}



function applyBlendModeWithAlpha(ctx,base,image,blend){
    if(!image) return;
    
    ctx.save()
    if(blend != "copy"){
        ctx.drawImage(base, 0, 0, base.width,base.height);
    }
    ctx.globalCompositeOperation = blend
    ctx.drawImage(image, 0, 0, base.width,base.height);
    if(blend != "copy"){
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(base, 0, 0, base.width,base.height);
    }
    ctx.restore()
}

function colorize(canvas,ctx,img,color,blend){
    ctx.save()
    ctx.globalCompositeOperation = blend;
    ctx.fillStyle = color;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0, canvas.width,canvas.height);
    ctx.restore()
}

function getColorIndicesForCoord(x, y, width) {
    var red = y * (width * 4) + x * 4;
    return {r:red, g:red + 1, b:red + 2, a:red + 3};
}

function maskedCopy(image,mask,base){
    for(var i = 0 ; i < base.width ; i++){
        for(var j = 0 ; j < base.height ; j++){
            let coords = getColorIndicesForCoord(i,j,base.width);
            let imgOpacity = mask.data[coords.a]/255;
            let baseOpacity = 1 - imgOpacity;
            if(mask.data[coords.a] > 0){
                base.data[coords.r] = (base.data[coords.r] * baseOpacity)+(image.data[coords.r] * imgOpacity);
                base.data[coords.g] = (base.data[coords.g] * baseOpacity)+(image.data[coords.g] * imgOpacity);
                base.data[coords.b] = (base.data[coords.b] * baseOpacity)+(image.data[coords.b] * imgOpacity);
                base.data[coords.a] = (base.data[coords.a] * baseOpacity)+(image.data[coords.a] * imgOpacity);
            }
        }
    }
}

function lerp(p1, p2, t) {
    return {
      x: p1.x + (p2.x - p1.x) * t, 
      y: p1.y + (p2.y - p1.y) * t}
  }



  let supportedQuadTypes = ["hat","eye"]

  function setVariablesFromData(data){
      animation = data.animation;
      quads = data.quads;
      supportedQuadTypes.forEach(key=>{
          if(!quads[key]){
              quads[key] = [];
          }
      })
      return;
      let anims = Object.keys(animation)
      anims.forEach( anim => {
          animation[anim].frames.forEach( frame =>{
              frame.q.forEach( quad => {
                  if(quad.quadType == "eye"){
                      eyes.push(quads[quad.quadType][quad.quadIndex]);
                  }
              })
          })
      });
  }

let step = 1;
function drawImgOnCorners(ctx,img,corners){
    var p1, p2, p3, p4, y1c, y2c, y1n, y2n,
    w = img.width - 1,         // -1 to give room for the "next" points
    h = img.height - 1;
    for(y = 0; y < h; y += step) {
        for(x = 0; x < w; x += step) {
            y1c = lerp(corners[0], corners[3],  y / h);
            y2c = lerp(corners[1], corners[2],  y / h);
            y1n = lerp(corners[0], corners[3], (y + step) / h);
            y2n = lerp(corners[1], corners[2], (y + step) / h);

            // corners of the new sub-divided cell p1 (ul) -> p2 (ur) -> p3 (br) -> p4 (bl)
            p1 = lerp(y1c, y2c,  x / w);
            p2 = lerp(y1c, y2c, (x + step) / w);
            p3 = lerp(y1n, y2n, (x + step) / w);
            p4 = lerp(y1n, y2n,  x / w);

            ctx.drawImage(img, x, y, step, step,  p1.x, p1.y, // get most coverage for w/h:
                Math.ceil(Math.max(step, Math.abs(p2.x - p1.x), Math.abs(p4.x - p3.x))) + 1,
                Math.ceil(Math.max(step, Math.abs(p1.y - p4.y), Math.abs(p2.y - p3.y))) + 1)
        }
    }
}
let radius = 5;
function drawCorners(ctx,corners,handles = false) {
  ctx.strokeStyle = "#09f"; 
  ctx.lineWidth = 1;
  ctx.beginPath();
  // border
  for(var i = 0, p; p = corners[i++];){
    ctx[i ? "lineTo" : "moveTo"]( p.x,p.y);
  } 
  ctx.closePath();
  // circular handles
  if(handles){
    for(i = 0; p = corners[i++];) {ctx.moveTo(p.x + radius, p.y); ctx.arc(p.x, p.y, radius, 0, 6.28);}
  }
  ctx.stroke()
}

function flipSprite(img){
    let flippedimg = new ImageData(img.height,img.width);
    for(y = 0; y <= img.height; y += 1) {
        for(x = 0; x <= img.width; x += 1) {
            let origcoords = getColorIndicesForCoord(x,y,img.width);
            let flippedcoords = getColorIndicesForCoord(img.height-y,img.width-x,img.height);
            flippedimg.data[flippedcoords.r] = img.data[origcoords.r];
            flippedimg.data[flippedcoords.g] = img.data[origcoords.g];
            flippedimg.data[flippedcoords.b] = img.data[origcoords.b];
            flippedimg.data[flippedcoords.a] = img.data[origcoords.a];
        }
    }
    return flippedimg;
}



function getNewCanvas(width,height){
    let canvas;
    if(!self.document && self.OffscreenCanvas){
        canvas = new OffscreenCanvas(width,height);
    } else {
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
    }
    return canvas;
}

function getImageData(img){
    const canvas = getNewCanvas(img.width,img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img,0,0);
    let imageData = ctx.getImageData(0,0,img.width,img.height);
    return imageData;
}

function constrainToSize(img,width,height){
    const canvas = getNewCanvas(width,height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img,0,0,width,height);
    img = canvas.toDataURL();
    return img;
}



let lastStage;
function showUpdateProgress(stage,percent){
    if(stage === "done"){
        // hide modal in 1s 
        setTimeout( () => {document.querySelector(`#progress-modal`).classList.add("hidden")},1000);
        return;
    }
    document.querySelector(`#progress-modal`).classList.remove("hidden");
    if (lastStage != stage){
        let log = `${stage} : ${percent}%`;
        document.querySelector(`#progress-text`).innerText = log;
        document.querySelector(`#progress`).value = percent;
    }
}


function doSomeMagicToRunWorkerCodeOnMainThread(src,baseSrc){
    let worker = {
        onmessage:()=>{ console.log("please override the onmessage handler")}
    };
    window.importScripts = (src)=>{ 
        let script = document.createElement('script');
        script.src = baseSrc+src;
        document.body.appendChild(script);
        //console.log("trying to import" + src,"importScripts does not exist on main thread")
    }
    window.shimmedWorkerPostMessage = (obj)=>{    worker.onmessage({data:obj});    }

    let script = document.createElement('script');
    script.src = src;
    script.onload = ()=>{
        worker.postMessage = (obj)=>{ self.hkoffscreenWorker.messageHandler({data:obj}) }
    }
    document.body.appendChild(script);

    return worker;
}
function getWorker(src,baseSrc){
    let worker;
    if(window.OffscreenCanvas){
        worker = new Worker(src);
    } else {
        worker = doSomeMagicToRunWorkerCodeOnMainThread(src,baseSrc);
    }
    return worker;
}

function inCircle(p, pos) {
    var dx = pos.x - p.x,
        dy = pos.y - p.y;
    return dx*dx + dy*dy <= radius * radius
  }

function getXY(canvas,evt) {
    var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

    return {
        x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
        y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    }
  }

  function filePicker(accept){
    return new Promise((resolve,reject)=>{
        let input = document.createElement('input');
        input.type = 'file';
        if(accept){
            input.accept = accept;
        }
        input.onchange = _ => {
                let files =   Array.from(input.files);
                console.log(files);
                const reader = new FileReader();
                reader.addEventListener('load', (event) => {
                    resolve(event.target.result);

                });
                reader.readAsText(files[0]);
            };
        input.click();
    });
  }
  function saveObjasJSON(filename, obj){
    const blob = new Blob([JSON.stringify(obj,null, 2)], { type: "text/json" });
    const link = document.createElement("a");

    link.download = filename;
    link.href = window.URL.createObjectURL(blob);
    link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");

    const evt = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
    });

    link.dispatchEvent(evt);
    link.remove()
};