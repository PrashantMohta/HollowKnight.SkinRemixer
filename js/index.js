

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

let animationSelector = document.querySelector("#animationselector");


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
            mode: eyeMode.value,
            clip: eyeClip.value
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
    renderCurrentSprite();
}
function playPauseAnim(){
    if(!allAnimation){
        if(!inflightAnimData){ getAnimData(); }
        return 
    }
    playAnim = !playAnim;
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
    renderCurrentSprite();
}
function renderCurrentSprite(){
    
    animctx.clearRect(0,0,animcanvas.width,animcanvas.height);

    let frame = allAnimation[currentAnimation].frames[currentAnimationIndex];
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
    if(animationSelector.value == "disabled" || !playAnim) return;

    let cur = Date.now();
    if(currentAnimation && cur - lastFrameTime > 1000/allAnimation[currentAnimation].fps){
        lastFrameTime = cur;
        renderCurrentSprite();
        currentAnimationIndex+=1;
        if(currentAnimationIndex >= allAnimation[currentAnimation].frames.length){ 
            currentAnimationIndex = allAnimation[currentAnimation].loopStart;
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
                ctx.strokeStyle = "#F00";
            } else {
                ctx.strokeStyle = "#F00";
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

function getAnimData(){
    inflightAnimData = true;
    return fetch('./data/animData.json')
            .then( res => res.json())
            .then( data => {
                allAnimation = data;
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

    images[SLASH] = new Image();
    images[SLASH].onload = ()=>{ 
        createImageBitmap(images[SLASH]).then(bmp => {transferImageToWorker(SLASH,bmp)});  
    }
    bindInputToImg(document.getElementById("baseSkin"),images[BASE]);
    bindInputToImg(document.getElementById("slashes"),images[SLASH]);
    bindInputToImg(document.getElementById("eyes"),images[EYE]);
}

function init(){
    setupImages();
    rafRender(renderFrame,TARGET_FRAME_RATE);
    rafRender(animateSprites,1000);
    document.querySelector("#showboxes").onchange = function(){
        showSpriteBoxes = this.checked;
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

