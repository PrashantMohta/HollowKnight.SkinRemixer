

let TARGET_FRAME_RATE = 5;
let images;
let outData;
let renderOutData;
let canvas = document.querySelector("#outcanvas");
let ctx = canvas.getContext('2d');
let animcanvas = document.querySelector("#animcanvas");
let animctx = animcanvas.getContext('2d');



let slashMode = document.querySelector('#slashesmode');
let slashColor = document.querySelector('#slashescolor');
let slashColorMode = document.querySelector('#slashescolormode');

let cloakMode = document.querySelector('#cloakmode');
let cloakColor = document.querySelector('#cloakcolor');
let cloakColorMode = document.querySelector('#cloakcolormode');

let eyeMode = document.querySelector('#eyemode');
let eyeClip = document.querySelector('#eyeclip');


let hatMode = document.querySelector('#hatmode');

let animationSelector = document.querySelector("#animationselector");

let canvasScroller = document.querySelector("#canvasscroller");

function getFormState(){
    return {
        slashes:{
            mode  : slashMode.value,
            color : slashColor.value,
            colorBlendMode : slashColorMode.value,
        },
        cloak:{
            mode  : cloakMode.value,
            color : cloakColor.value,
            colorBlendMode : cloakColorMode.value,
        },
        eyes : {
            quadType: EYE,
            mode: eyeMode.value,
            clip: eyeClip.value
        },
        hat : {
            quadType: HAT,
            mode: hatMode.value,
        }
    }
}

function generate(){
    let options = {
        base    : {isCustom: images[BASE].src != images[DEFAULT_KNIGHT].src},
        ...getFormState()
    }
    worker.postMessage({event:"generate",options:options});
}

let spriteBoxesRendered;
let index=0;
let allAnimation;
let animation;

let dropdownSet = false;
let currentAnimation;
let currentAnimationIndex = 0;

function setDropdownValues(dropdown,allAnimation){
    for(let key in allAnimation){
        //skip others for now
        if(allAnimation[key].collection !== "Knight") continue;
        let op = new Option(allAnimation[key].name, allAnimation[key].name, false, false);
        dropdown.appendChild(op);
    }
}

function setDropdown(){
    if(!dropdownSet){
        setDropdownValues(animationSelector,allAnimation)
        /*setTimeout(()=>{
            currentAnimation = "081.Dash Down Land";
            currentAnimationIndex = 0;
            animationSelector.value = currentAnimation;
        },1000)*/
        dropdownSet = true;
    }
}

let spriteData = {};
let lastFrameTime = Date.now();
let playAnim = true;
function prevSprite(){
    if(!allAnimation){
        if(!inflightAnimData){ getAnimData(); }
        return 
    }
    if(currentAnimationIndex > 0){
        currentAnimationIndex -=1;
    } else {
        currentAnimationIndex = allAnimation[currentAnimation].frames.length - 1
    }
    editQuadsChanged = true;
    renderCurrentSprite();
}
function playPauseAnim(){
    if(!allAnimation){
        if(!inflightAnimData){ getAnimData(); }
        return 
    }
    playAnim = !playAnim;
    editQuadsChanged = true;
    renderCurrentSprite();
}
function nextSprite(){
    if(!allAnimation){
        if(!inflightAnimData){ getAnimData(); }
        return 
    }
    if(currentAnimationIndex < allAnimation[currentAnimation].frames.length - 1){
        currentAnimationIndex +=1;
    } else {
        currentAnimationIndex = 0;
    }
    editQuadsChanged = true;
    renderCurrentSprite();
}


function pointInRect(point,rect){
    if((rect.x1 <= point.x && point.x <= rect.x2) && (rect.y1 <= point.y && point.y <= rect.y2) ) {
    ctx.strokeRect(point.x,point.y,1,1);
    ctx.strokeRect(rect.x1,rect.y1,rect.x2 - rect.x1,rect.y2 - rect.y1);
    }
    return (rect.x1 <= point.x && point.x <= rect.x2) && (rect.y1 <= point.y && point.y <= rect.y2)
}

let editQuadsChanged = true;
function renderEyeQuads(frame,frameQuads){
    if(!showEyeQuads && !editQuads) return;
    if(editQuads && editQuadsChanged) {
        
        editQuadsChanged = false;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        if(!renderOutData){
            ctx.drawImage(images[BASE],0,0,canvas.width,canvas.height);
        } else {
            ctx.putImageData(outData,0,0);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'red'
        ctx.strokeRect(frame.x,canvas.height - frame.y -1,frame.w,frame.h);
    } 

    if(showEyeQuads || editQuads) {
        ctx.save()
        for(let q in frameQuads) {
            if(editQuads) {
                ctx.globalAlpha = 0.3;
                drawImgOnCorners(ctx,images[EYE_DEFAULT],quads[frameQuads[q].quadType][frameQuads[q].quadIndex])
            }
            drawCorners(ctx,quads[frameQuads[q].quadType][frameQuads[q].quadIndex],editQuads);
            
        }
        ctx.restore();
    }
 }

 function exportquads(){
     let data = {animation:allAnimation,quads:quads}
     saveObjasJSON("animData.json",data);
 }
 function importquads(){
    filePicker(".json").then((json)=>{
        let data = JSON.parse(json);
        setVariablesFromData(data);
        transferDataToWorker(data);      
    }).catch(e=>{
        alert("error. please check console.");
        console.error(e);
    })
 }
 function applyquads(){
    let data = {animation:allAnimation,quads:quads}
    transferDataToWorker(data);      
 }
/*
    renderQuadsForCurrentSprite(currentAnimation,currentAnimationIndex,
        {x:frame.x,y:canvas.height - frame.y -1,w:frame.w,h:frame.h},
        animctx,
        {x:10 + frame.xr,y:animcanvas.height   - 10 - (frame.sh + frame.yr),w:frame.w,h:frame.h})
*/
function renderQuadsForCurrentSprite(inputFrame){
    renderEyeQuads(inputFrame,inputFrame.q);
}
let cPoint;
let currpt = -1;
canvas.onmousedown = function(e) {
    let pos = getXY(canvas,e);
    let frame = allAnimation[currentAnimation].frames[currentAnimationIndex];
    let frameQuads = frame.q;
    if(currpt == -1){
        for(let q in frameQuads) {
            var corners = quads[frameQuads[q].quadType][frameQuads[q].quadIndex];
            for(var i = 0, p; p = corners[i++];) {
                if (inCircle(p, pos)) {
                    cPoint = p; break
                }
            }
            if(cPoint){break;}
        }
    } else {
        corners[currpt] = pos;
    }
}
canvas.onmousemove = function(e) {
    let now = Date.now();
  if (cPoint) {
    let pos = getXY(canvas,e);
    cPoint.x = pos.x; 
    cPoint.y = pos.y;
    editQuadsChanged = true;
  }
}
canvas.onmouseup = function() {cPoint = null}

let quadorder = ["Top Left","Top Right","Bottom Right","Bottom Left"];
function getCurrentFrameQuads(){
    let frame = allAnimation[currentAnimation].frames[currentAnimationIndex];
    let quad = frame.q;
    console.log(quad);
    quad.forEach((quad,qi)=>{
        let points = quads[quad.quadType][quad.quadIndex];
        console.log(`${quad.quadType} Quad ${qi} : Index ${quad.quadIndex}`);
        points.forEach((point,index)=>{
            console.log(`${quadorder[index]} Point :`,point);
        })
    })
}

function renderCurrentSprite(){
    
    animctx.clearRect(0,0,animcanvas.width,animcanvas.height);
    let frame = allAnimation[currentAnimation].frames[currentAnimationIndex];
    
    renderQuadsForCurrentSprite(frame)

    if(!spriteData[frame]){spriteData[frame.i] = {}}
    if(frame.flipped){
        if(!spriteData[frame.i].flippedsprite){
            //ctx.strokeStyle = 'yellow';
            //ctx.strokeRect(frame.x,canvas.height - frame.y -1,frame.w,frame.h);
            spriteData[frame.i].flippedsprite = flipSprite(ctx.getImageData(frame.x,canvas.height - frame.y -1,frame.w,frame.h));
        }
        animctx.putImageData(spriteData[frame.i].flippedsprite, 10 + frame.xr,animcanvas.height  - 10 - (frame.sh  + frame.yr));

    } else {

        if(!spriteData[frame.i].sprite){
            spriteData[frame.i].sprite = ctx.getImageData(frame.x,canvas.height - frame.y -1,frame.w,frame.h);
        }
        animctx.putImageData(spriteData[frame.i].sprite, 10 + frame.xr,animcanvas.height   - 10 - (frame.sh + frame.yr));

    }
   
}
function animateSprites(){
    if(!allAnimation){
        if(!inflightAnimData){ getAnimData(); }
        return 
    }
    if(animationSelector.value == "disabled") return;

    let cur = Date.now();
    if(currentAnimation && ((playAnim && cur - lastFrameTime > 1000/allAnimation[currentAnimation].fps) || (!playAnim && cur - lastFrameTime > 1000/5)) ){
        lastFrameTime = cur;
        renderCurrentSprite();
        if(playAnim){
            currentAnimationIndex+=1;
            if(currentAnimationIndex >= allAnimation[currentAnimation].frames.length){ 
                currentAnimationIndex = allAnimation[currentAnimation].loopStart;
            }
        }
    }
}

let renderText = false;
function drawSpriteBoxes(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.lineWidth = 3;
    for(let i in allAnimation){
        if(allAnimation[i].collection !== "Knight") continue;
        for(let j = 0,length = allAnimation[i].frames.length; j <  length; j++){
            let frame = allAnimation[i].frames[j];
            if(frame.flipped){
                ctx.strokeStyle = "#000";
            } else {
                ctx.strokeStyle = "#000";
            }
            ctx.strokeRect(frame.x,canvas.height - frame.y -1,frame.w,frame.h);
            if(renderText){
                ctx.save()
                ctx.fillStyle = "#000";
                ctx.globalAlpha = 0.5;
                ctx.fillRect(frame.x,canvas.height - frame.y -1,frame.w,frame.h);
                ctx.restore();
                ctx.fillStyle = "red";
                ctx.font = '10px sans-serif';
                let tex = (i.split(".")[1]).split(" ").reverse();
                tex[0]+=" "+j;
                tex.forEach((t,index)=>{
                    ctx.fillText(t,frame.x,canvas.height - frame.y -1 - 5 - index*10,frame.flipped ? frame.sh : frame.sw);
                })
            }

        }
    }
    spriteBoxesRendered = new Image();
    spriteBoxesRendered.src = canvas.toDataURL();
}
let showSpriteBoxes = false;
let inflightAnimData = false;
let quads = [];
function getAnimData(){
    inflightAnimData = true;
    return fetch('./data/animData.json')
            .then( res => res.json())
            .then( data => {
                setVariablesFromData(data);
                allAnimation = animation;
                inflightAnimData = false;
                setDropdown();
            });
};

function renderSpriteBoxes(){
    if(!showSpriteBoxes) return;
    if(!allAnimation){
        if(!inflightAnimData){ getAnimData(); }
        return;
    }
    if(!spriteBoxesRendered ){
        drawSpriteBoxes();
    } else {
        ctx.drawImage(spriteBoxesRendered,0,0);
    }
}

function renderFrame(){
    if(editQuads) return; // only rerender here when not editing quads
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!renderOutData){
        ctx.drawImage(images[BASE],0,0,canvas.width,canvas.height);
    } else {
        ctx.putImageData(outData,0,0);
    }
    renderSpriteBoxes();
}

function setupImages(){
    images[BASE] = new Image();
    images[BASE].onload = ()=>{ 
        createImageBitmap(images[BASE]).then(bmp => {transferImageToWorker(BASE,bmp)});  
    }
    images[BASE].src = DEFAULT_KNIGHT;

    images[EYE] = new Image();
    images[EYE].onload = ()=>{ 
        if(images[EYE].width > 17*2 || images[EYE].height > 22*2){
            images[EYE].src = constrainToSize(images[EYE],17*2,22*2); // reduce resolution to max of 2x expected resolution
        }
        createImageBitmap(images[EYE]).then(bmp => {transferImageToWorker(EYE,bmp)});  
    }
    images[EYE].src = EYE_DEFAULT;

    images[HAT] = new Image();
    images[HAT].onload = ()=>{ 
        if(images[HAT].width > 20*2 || images[HAT].height > 20*2){
            images[HAT].src = constrainToSize(images[HAT],20*2,20*2); // reduce resolution to max of 2x expected resolution
        }
        createImageBitmap(images[HAT]).then(bmp => {transferImageToWorker(HAT,bmp)});  
    }
    images[HAT].src = EYE_DEFAULT;

    images[SLASH] = new Image();
    images[SLASH].onload = ()=>{ 
        createImageBitmap(images[SLASH]).then(bmp => {transferImageToWorker(SLASH,bmp)});  
    }
    bindInputToImg(document.getElementById("baseSkin"),images[BASE]);
    bindInputToImg(document.getElementById("slashes"),images[SLASH]);
    bindInputToImg(document.getElementById("eyes"),images[EYE]);
    bindInputToImg(document.getElementById("hat"),images[HAT]);
}

function findCurrentSprite(){
    let frame = allAnimation[currentAnimation].frames[currentAnimationIndex];
    if(frame){
        canvasScroller.scrollTo(frame.x - canvasScroller.clientWidth/2,canvas.height - frame.y -1 - canvasScroller.clientWidth/2);
    }
}
let showEyeQuads = false;

let editQuads = false;
function init(){
    setupImages();
    rafRender(renderFrame,TARGET_FRAME_RATE);
    rafRender(animateSprites,1000);
    document.querySelector("#showboxes").onchange = function(){
        showSpriteBoxes = this.checked;
    }
    document.querySelector("#showeyeboxes").onchange = function(){
        showEyeQuads = this.checked;
    }
    document.querySelector("#zoomout").onchange = function(){
        if(this.checked){
            canvas.classList.add("zoomedsize")
            findCurrentSprite();
        } else {
            canvas.classList.remove("zoomedsize")
        }
    }
    document.querySelector("#editquads").onchange = function(){
        editQuads = this.checked;
    }
    animationSelector.onchange = function(){
        if(animationSelector.value == "disabled") return;
        currentAnimation = animationSelector.value;
        playAnim = true;
        let size = Math.max(allAnimation[currentAnimation].mw + 20,allAnimation[currentAnimation].mh + 20)
        animcanvas.width = size;
        animcanvas.height = size;
        currentAnimationIndex = 0;
    }
}

let worker = getWorker('./js/offscreenworker.js','./js/');
worker.onmessage = function (e){
    if(e.data.event === "ready"){

    }
    if(e.data.event === "output"){
        renderOutData = true;
        outData = e.data.data;
        spriteBoxesRendered = false;
        spriteData = {};
    }
    if(e.data.event === "progress"){
        showUpdateProgress(e.data.data.stage,Math.round(e.data.data.percent));
    }
}


function loadPrerequisites(){ 
    if(!worker.postMessage){
        // if worker or worker hack has not loaded yet then dont start
        return setTimeout(()=>{ loadPrerequisites() },500);
    }
    populateImageMap([DEFAULT_KNIGHT,SLASH_MASK,CLOAK_MASK_DEFAULT,CLOAK_MASK_GENERIC,EYE_DEFAULT,BLANK_KNIGHT],showUpdateProgress).then((imageMap)=>{
        images = imageMap;
        for(let image in images){
            createImageBitmap(images[image]).then(bmp => {transferImageToWorker(image,bmp)});  
        }
        showUpdateProgress("done",100);
        init();
    }).catch(console.error);
}
loadPrerequisites();

