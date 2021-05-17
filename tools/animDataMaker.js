const path = require('path');
const fs = require('fs');

const directoryPath = path.join('../sprites/Knight/');

let spriteData = JSON.parse(fs.readFileSync(path.join('../sprites/Knight/0.Atlases/SpriteInfo.json')));

let allAnimation = {};
let lastName = "";
let animationIndex = 0;
for(let i = 0; i <  spriteData.sid.length ; i++){
    let frame = {};
    let curName = spriteData.spath[i].split("/")[1];
    if(lastName != curName){
        animationIndex += 1;
        allAnimation[curName] = allAnimation[curName] || ({name:curName,collection:spriteData.scollectionname[i],mw:0,mh:0,frames:[]});
        lastName = curName;
    }

    frame = {
        i:i,
        flipped:spriteData.sfilpped[i],
        x:spriteData.sx[i],
        y:spriteData.sy[i],
        xr:spriteData.sxr[i],
        yr:spriteData.syr[i],
        sh: spriteData.sheight[i],
        sw:spriteData.swidth[i],
        w: spriteData.sfilpped[i]?   spriteData.sheight[i] : spriteData.swidth[i],
        h: spriteData.sfilpped[i]? - spriteData.swidth[i]  : - spriteData.sheight[i]
    };

    allAnimation[curName].frames.push(frame);
    allAnimation[curName].mh = Math.max(allAnimation[curName].mh,Math.abs(frame.h + frame.yr))
    allAnimation[curName].mw = Math.max(allAnimation[curName].mw,Math.abs(frame.w + frame.xr))
}

fs.readdir(directoryPath, function (err, files) {

    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 

    files.forEach(function (file,index) {
        if(fs.existsSync(path.join(directoryPath,file,'AnimInfo.json'))){
        let data = JSON.parse(fs.readFileSync(path.join(directoryPath,file,'AnimInfo.json'), 'utf8' ))
            allAnimation[file] = {
                ...allAnimation[file],
                fps:data.animInfo.fps,
                loopStart:data.animInfo.loopStart,
            };

            if(index === files.length-1){
                console.log("creating animData.json")
                fs.writeFileSync("../data/animData.json",JSON.stringify(allAnimation))
            }
        }
    });

});