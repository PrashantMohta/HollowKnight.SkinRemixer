importScripts('./data.js','./utilities.js');

self.hkoffscreenWorker = (function (){
    let images = {};
    let imageData = {};

    function cachedImageData(key){
        if(!imageData[key]){
            imageData[key] = getImageData(images[key]);
        }
        return imageData[key];
    }
    
    function messageHandler(e) {
        if(e.data.event === 'image'){
            images[e.data.name] = e.data.image;
            imageData[e.data.name] = undefined;
        } 
        if(e.data.event === 'data'){
            setVariablesFromData(e.data.data);
        } 
        if(e.data.event === 'generate'){
            generateSkin(e.data.options);
        }
    }
    
    
    // code to allow this file to be run on main thread as well
    if(!self.document){
        self.onmessage = messageHandler;
    }
    function postMessageCustom(obj){
        if(!self.document){
            self.postMessage(obj);
        } else {
            // call global function
            window.shimmedWorkerPostMessage(obj);
        }
    }
    
    
    function generateSkin(options){
        const canvas = getNewCanvas(4096,4096);
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
                postMessageCustom({event:'progress',data:{stage:'drawing slashes',percent:0}});
                applyBlendModeWithAlpha(ctx,images[baseSprite],images[SLASH],options.slashes.mode);
                postMessageCustom({event:'progress',data:{stage:'drawing slashes',percent:100}});
            }
            if(options.slashes.colorBlendMode != "disabled"){
                postMessageCustom({event:'progress',data:{stage:'colorize slashes',percent:0}});
                colorize(canvas,ctx,options.slashes.mode === "copy" ? images[SLASH] : images[baseSprite],options.slashes.color,options.slashes.colorBlendMode);
                postMessageCustom({event:'progress',data:{stage:'colorize slashes',percent:100}});
            }
        
            postMessageCustom({event:'progress',data:{stage:'copy slashes',percent:0}});
            let slashData = ctx.getImageData(0,0,canvas.width,canvas.height);
            postMessageCustom({event:'progress',data:{stage:'copy slashes',percent:50}});
            maskedCopy(slashData,slashMaskData,baseData);
            postMessageCustom({event:'progress',data:{stage:'copy slashes',percent:100}});
        }
        
        //cloak
        if(options.cloak.mode != "disabled"){
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.putImageData(baseData,0,0);
        
            postMessageCustom({event:'progress',data:{stage:'color cloak',percent:0}});
            colorize(canvas,ctx,images[baseSprite],options.cloak.color,options.cloak.colorBlendMode)
            postMessageCustom({event:'progress',data:{stage:'color cloak',percent:100}});
            postMessageCustom({event:'progress',data:{stage:'copy cloak',percent:0}});
            let cloakData = ctx.getImageData(0,0,canvas.width,canvas.height);
            postMessageCustom({event:'progress',data:{stage:'copy cloak',percent:50}});
            maskedCopy(cloakData,cloakMaskData,baseData);
            postMessageCustom({event:'progress',data:{stage:'copy cloak',percent:100}});
    
        }
        Object.values(options).forEach((option)=>{
            if(!option.quadType){ return }
            if(!quads[option.quadType] || !quads[option.quadType].length) {return;}

            if(option.mode != "disabled"){
                //render quads
                ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.putImageData(baseData,0,0);
                
                for(let i=0; i < quads[option.quadType].length; i++){
                    drawImgOnCorners(ctx,images[option.quadType],quads[option.quadType][i]); 
                    postMessageCustom({event:'progress',data:{stage:`drawing ${option.quadType} quads`,percent:100*((i+1)/quads[option.quadType].length)}});
                }
        
                // clip to fix quads going out of the borders
                if(option.clip != "disabled"){
                    postMessageCustom({event:'progress',data:{stage:'clip eyes',percent:0}});
                    ctx.save()
                    ctx.globalCompositeOperation = 'destination-in';
                    ctx.drawImage(images[baseSprite], 0, 0, canvas.width,canvas.height);
                    ctx.restore()
                    postMessageCustom({event:'progress',data:{stage:'clip eyes',percent:100}});
                }
        
                postMessageCustom({event:'progress',data:{stage:'finishing up',percent:0}});
                baseData = ctx.getImageData(0,0,canvas.width,canvas.height);
                postMessageCustom({event:'progress',data:{stage:'finishing up',percent:100}});
        
            }
        })
        
        //send response
        postMessageCustom({event:'output',data:baseData})
        postMessageCustom({event:'progress',data:{stage:'done',percent:100}});
    
    }
    this.messageHandler = messageHandler;
    return this;
})();
