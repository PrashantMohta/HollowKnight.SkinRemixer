importScripts('data.js','utilities.js');

let images = {};
let imageData = {};

function cachedImageData(key){
    if(!imageData[key]){
        imageData[key] = getImageData(images[key]);
    }
    return imageData[key];
}

onmessage = function(e) {
    if(e.data.event === 'image'){
        images[e.data.name] = e.data.image;
        imageData[e.data.name] = undefined;
    } 
    if(e.data.event === 'generate'){
        generateSkin(e.data.options);
    }
}

function getImageData(img){
    const canvas = new OffscreenCanvas(img.width,img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img,0,0);
    let imageData = ctx.getImageData(0,0,img.width,img.height);
    return imageData;
}

function generateSkin(options){
    const canvas = new OffscreenCanvas(4096, 4096);
    const ctx = canvas.getContext('2d');
    let baseSprite = options.base.isCustom ? BASE : (options.eyes.mode != "disabled" ? BLANK_KNIGHT : DEFAULT_KNIGHT);
    
    let baseData = new ImageData( new Uint8ClampedArray(cachedImageData(baseSprite).data),cachedImageData(baseSprite).width);
    let slashMaskData = cachedImageData(SLASH_MASK);
    let cloakMaskData = options.cloak.mode === "default" ? cachedImageData(CLOAK_MASK_DEFAULT) : cachedImageData(CLOAK_MASK_GENERIC);

    //slashes
    if(options.slashes.mode != "disabled" || options.slashes.colorBlendMode != "disabled"){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.putImageData(baseData,0,0);
    
        if(options.slashes.mode != "disabled"){
            postMessage({event:'progress',data:{stage:'drawing slashes',percent:0}});
            applyBlendModeWithAlpha(ctx,images[baseSprite],images[SLASH],options.slashes.mode);
            postMessage({event:'progress',data:{stage:'drawing slashes',percent:100}});
        }
        if(options.slashes.colorBlendMode != "disabled"){
            postMessage({event:'progress',data:{stage:'colorize slashes',percent:0}});
            colorize(canvas,ctx,options.slashes.mode === "copy" ? images[SLASH] : images[baseSprite],options.slashes.color,options.slashes.colorBlendMode);
            postMessage({event:'progress',data:{stage:'colorize slashes',percent:100}});
        }
    
        postMessage({event:'progress',data:{stage:'copy slashes',percent:0}});
        let slashData = ctx.getImageData(0,0,canvas.width,canvas.height);
        postMessage({event:'progress',data:{stage:'copy slashes',percent:50}});
        maskedCopy(slashData,slashMaskData,baseData);
        postMessage({event:'progress',data:{stage:'copy slashes',percent:100}});
    }
    
    //cloak
    if(options.cloak.mode != "disabled"){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.putImageData(baseData,0,0);
    
        postMessage({event:'progress',data:{stage:'color cloak',percent:0}});
        colorize(canvas,ctx,images[baseSprite],options.cloak.color,options.cloak.colorBlendMode)
        postMessage({event:'progress',data:{stage:'color cloak',percent:100}});
        postMessage({event:'progress',data:{stage:'copy cloak',percent:0}});
        let cloakData = ctx.getImageData(0,0,canvas.width,canvas.height);
        postMessage({event:'progress',data:{stage:'copy cloak',percent:50}});
        maskedCopy(cloakData,cloakMaskData,baseData);
        postMessage({event:'progress',data:{stage:'copy cloak',percent:100}});

    }

    if(options.eyes.mode != "disabled"){
        //render eyes
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.putImageData(baseData,0,0);
        
        for(let i=0; i < eyes.length; i++){
            drawImgOnCorners(ctx,images[EYE],eyes[i]); 
            postMessage({event:'progress',data:{stage:'drawing eyes',percent:100*((i+1)/eyes.length)}});
        }

        // clip to fix eyes going out of the borders
        if(options.eyes.clip != "disabled"){
            postMessage({event:'progress',data:{stage:'clip eyes',percent:0}});
            ctx.save()
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(images[baseSprite], 0, 0, canvas.width,canvas.height);
            ctx.restore()
            postMessage({event:'progress',data:{stage:'clip eyes',percent:100}});
        }

        postMessage({event:'progress',data:{stage:'finishing up',percent:0}});
        baseData = ctx.getImageData(0,0,canvas.width,canvas.height);
        postMessage({event:'progress',data:{stage:'finishing up',percent:100}});

    }
    //send response
    postMessage({event:'output',data:baseData})
}