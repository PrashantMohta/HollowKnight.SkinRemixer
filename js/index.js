

let TARGET_FRAME_RATE = 5;
let images;
let outData;
let renderOutData;
let canvas = document.querySelector("#outcanvas");
let ctx = canvas.getContext('2d');
let animcanvas = document.querySelector("#animcanvas");
let animctx = animcanvas.getContext('2d');


let worker = new Worker('/js/offscreenworker.js');

let slashMode = document.querySelector('#slashesmode');
let slashColor = document.querySelector('#slashescolor');
let slashColorMode = document.querySelector('#slashescolormode');

let cloakMode = document.querySelector('#cloakmode');
let cloakColor = document.querySelector('#cloakcolor');
let cloakColorMode = document.querySelector('#cloakcolormode');

let eyeMode = document.querySelector('#eyemode');
let eyeClip = document.querySelector('#eyeclip');

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

let spriteData;
let spriteBoxesRendered;
let anim ,index=0;

function renderSpriteBoxes(){
    if(!spriteData){
        fetch('./spriteInfo.json').then( res => res.json()).then(j => {spriteData = j;})
        return;
    }
    if(!spriteBoxesRendered){
        anim = [];
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.lineWidth = 3;
     for(let i = 0; i < ( 9 || spriteData.sid.length) ; i++){
        if(spriteData.scollectionname[i] !== "Knight") continue;
            let frame = {};
            if(spriteData.sfilpped[i]) {
                ctx.strokeStyle = 'red';
                //frame = {i:i,flipped:true,x:spriteData.sx[i] +spriteData.sheight[i] ,y:canvas.height - spriteData.sy[i] ,w: - spriteData.sheight[i],h:- spriteData.swidth[i]};
                frame = {i:i,flipped:true,x:spriteData.sx[i] ,y:canvas.height - spriteData.sy[i] ,w:spriteData.sheight[i],h:- spriteData.swidth[i]};
            } else {
                ctx.strokeStyle = 'green';
                frame = {i:i,flipped:false,x:spriteData.sx[i], y:canvas.height - spriteData.sy[i], w:spriteData.swidth[i],h: - spriteData.sheight[i]}
            }
            //ctx.strokeRect(frame.x,frame.y,frame.w,frame.h);
            anim.push(frame)
        }
        spriteBoxesRendered = new Image();
        spriteBoxesRendered.src = canvas.toDataURL();
    } else {
        ctx.drawImage(spriteBoxesRendered,0,0);
        animctx.clearRect(0,0,animcanvas.width,animcanvas.height);
        let frame = anim[index];
        

        if(frame.flipped){
            if(!frame.flippedsprite){
                frame.flippedsprite = flipSprite(ctx.getImageData(frame.x,frame.y,frame.w,frame.h));
            }

            animctx.putImageData(frame.flippedsprite,10+spriteData.sxr[frame.i],10+spriteData.syr[frame.i]);
            //animctx.save();
            //animctx.drawImage(canvas,frame.x,frame.y,frame.w,frame.h,10+spriteData.sxr[frame.i],10+spriteData.syr[frame.i],Math.abs(frame.w),Math.abs(frame.h));
            //animctx.restore();
        } else {

            if(!frame.sprite){
                frame.sprite = ctx.getImageData(frame.x,frame.y,frame.w,frame.h);
            }
            animctx.putImageData(frame.sprite,10+spriteData.sxr[frame.i],10+spriteData.syr[frame.i]);
            //animctx.drawImage(canvas,frame.x,frame.y,frame.w,frame.h,10+spriteData.sxr[frame.i],10+spriteData.syr[frame.i],Math.abs(frame.w),Math.abs(frame.h));
        }
        index+=1;
        if(index == 8){ index = 0}
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
}

worker.onmessage = function (e){
    if(e.data.event === "ready"){

    }
    if(e.data.event === "output"){
        renderOutData = true;
        outData = e.data.data;
        spriteBoxesRendered = false;
    }
    if(e.data.event === "progress"){
        console.log("made progress : ",`${e.data.data.stage}: ${e.data.data.percent}%` )
    }
}

populateImageMap([DEFAULT_KNIGHT,SLASH_MASK,CLOAK_MASK_DEFAULT,CLOAK_MASK_GENERIC,EYE_DEFAULT,BLANK_KNIGHT]).then((imageMap)=>{
    images = imageMap;
    for(let image in images){
        createImageBitmap(images[image]).then(bmp => {transferImageToWorker(image,bmp)});  
    }
    init();
}).catch(console.error);

